import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, userProfile } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1]?.content || '';
    const geminiKey = process.env.GEMINI_API_KEY;

    // If Gemini API key is configured, call Gemini API
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const systemPrompt = `You are MediCare+ AI, a compassionate, accurate, and concise clinical health assistant.
Patient context: ${userProfile?.full_name ? `Name: ${userProfile.full_name}, Age: ${userProfile.age || 'N/A'}, Blood: ${userProfile.blood_group || 'N/A'}` : 'Guest Patient'}.
Guidelines:
1. Provide helpful medical triage, test preparation guidance, and wellness suggestions.
2. If symptoms suggest an emergency (severe chest pain, shortness of breath, stroke signs, severe trauma), immediately advise seeking emergency medical attention or calling emergency services.
3. Keep answers clear, structured with bullet points where appropriate, and always include a friendly reminder that you provide educational guidance, not a definitive medical diagnosis.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${systemPrompt}\n\nPatient Query: ${latestMessage}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 600,
                temperature: 0.3,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const replyText =
            data.candidates?.[0]?.content?.parts?.[0]?.text ||
            'I have processed your query. Please consult a doctor for tailored medical advice.';
          return NextResponse.json({ reply: replyText });
        }
      } catch (err) {
        console.error('Gemini API call failed, using clinical fallback:', err);
      }
    }

    // High quality clinical triage fallback when API key is not yet set
    const lower = latestMessage.toLowerCase();
    let reply = '';

    if (lower.includes('chest pain') || lower.includes('heart attack') || lower.includes('cannot breathe') || lower.includes('stroke')) {
      reply = `⚠️ **URGENT MEDICAL ALERT**:
Severe chest tightness, radiating pain to the left arm/jaw, or sudden difficulty breathing requires **immediate emergency medical evaluation**.

Please:
1. Call national emergency services immediately or have someone drive you to the nearest emergency department.
2. Sit upright in a comfortable position and remain as calm as possible.
3. Do not drive yourself.`;
    } else if (lower.includes('headache') || lower.includes('migraine')) {
      reply = `For headaches and migraines, consider:
• **Hydration**: Drink 500ml of water, as mild dehydration is a frequent trigger.
• **Environment**: Rest in a quiet, dark room with cool compresses over the forehead.
• **Medication**: Over-the-counter options like Paracetamol can help if taken early, subject to your doctor's approval.
• **When to seek care**: Seek immediate care if accompanied by sudden neck stiffness, fever, confusion, or visual disturbance. You can book an appointment with our Neurology department anytime.`;
    } else if (lower.includes('fever') || lower.includes('temperature') || lower.includes('flu')) {
      reply = `For fever management:
• Monitor temperature every 4–6 hours.
• Maintain fluid intake (water, oral rehydration salts, soups, coconut water).
• Wear lightweight clothing and rest.
• Paracetamol (500mg) can help reduce fever if approved for you. Avoid Ibuprofen if dengue is suspected.
• If fever persists beyond 48 hours or exceeds 102°F (39°C), book a consultation with our General Medicine team or a Dengue NS1 lab test.`;
    } else if (lower.includes('test') || lower.includes('blood') || lower.includes('fasting')) {
      reply = `**Lab Test Preparation Guidelines**:
• **Fasting Blood Sugar (FBS) & Lipid Profile**: Fast for 10–12 hours prior to sample collection. Pure drinking water is permitted.
• **Complete Blood Count (CBC)**: No fasting needed.
• **Urine Routine**: First-morning midstream urine sample yields the most accurate results.
• You can book any test with home sample collection directly in the **Tests & Reports** tab!`;
    } else if (lower.includes('appointment') || lower.includes('doctor') || lower.includes('book')) {
      reply = `You can easily book consultations on MediCare+:
1. Head to **Doctor Appointment Booking** or **Our Doctors**.
2. Filter by specialty (Cardiology, Neurology, Pediatrics, etc.).
3. Choose between **In-Person Clinic** or **Instant Telemedicine (Video)**.
4. Pick an available 20-minute slot and confirm. Your appointment will sync instantly!`;
    } else {
      reply = `Hello! I am your **MediCare+ Clinical AI Assistant**.

I can assist you with:
• **Symptom Triage**: Understanding early symptoms and recommended specialties.
• **Lab Test Guidance**: Fasting rules and preparation instructions.
• **Prescription Questions**: General understanding of medications and dosage timing.
• **Preventive Care**: Suggesting routine check-ups and health packages based on your health profile.

How can I support your health today? *(Please note: For diagnosis or prescription changes, always consult your physician).*`;
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('AI route error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
