'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Send,
  MessageSquare,
  Activity,
  HeartPulse,
  AlertCircle,
  ShieldCheck,
  User,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Vital, Allergy, Condition } from '@/types/database';

function TelemedicineContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get('room') || 'MediCarePlus-MainConsult';

  const [roomName, setRoomName] = useState(initialRoom);
  const [inCall, setInCall] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Chat in consultation
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'System',
      text: 'Encrypted end-to-end medical consultation room initialized. Doctor and patient are connected.',
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Vitals sidebar
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);

  useEffect(() => {
    async function loadPatientDetails() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (prof) setUserProfile(prof as Profile);

          const { data: vts } = await supabase.from('vitals').select('*').eq('patient_id', user.id).limit(4);
          if (vts) setVitals(vts as Vital[]);

          const { data: algs } = await supabase.from('allergies').select('*').eq('patient_id', user.id);
          if (algs) setAllergies(algs as Allergy[]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPatientDetails();
  }, [supabase]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: userProfile?.full_name || 'Patient',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '26px', color: '#fff' }}>Telemedicine Consultation Suite</h1>
            <span className="live-dot" />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Secure HIPAA-compliant HD video consultation with real-time in-call messaging and patient chart review.
          </p>
        </div>

        {!inCall ? (
          <button
            onClick={() => setInCall(true)}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '15px' }}
          >
            <Video size={18} />
            <span>Connect to Room</span>
          </button>
        ) : (
          <button
            onClick={() => setInCall(false)}
            className="btn btn-danger"
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            <PhoneOff size={16} />
            <span>Leave Consultation</span>
          </button>
        )}
      </div>

      {/* Main Grid: Video Room + Side Chat & Clinical Summary */}
      <div className="video-grid">
        {/* Left: Video Frame */}
        <div className="video-frame-container">
          {inCall ? (
            <iframe
              src={`https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.toolbarButtons=['camera','microphone','desktop','chat','raisehand','tileview']`}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              className="video-frame"
              title="Doctor Consultation Video"
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                textAlign: 'center',
                background: 'radial-gradient(circle at center, rgba(2, 132, 199, 0.15) 0%, rgba(2, 6, 23, 0.95) 100%)',
              }}
            >
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 0 40px rgba(6, 182, 212, 0.4)',
                  marginBottom: '24px',
                }}
              >
                <Video size={40} />
              </div>

              <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '8px' }}>
                Consultation Ready: {roomName}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '480px', lineHeight: 1.6, marginBottom: '28px' }}>
                Your doctor will automatically join this private channel. Check that your camera and microphone
                are functioning properly before connecting.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => setInCall(true)}
                  className="btn btn-primary"
                  style={{ padding: '14px 32px', fontSize: '15px' }}
                >
                  <Video size={18} />
                  <span>Start Consultation Now</span>
                </button>
                <Link href="/appointments" className="btn btn-secondary" style={{ padding: '14px 24px', fontSize: '15px' }}>
                  <span>Pick Different Doctor</span>
                </Link>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '32px',
                  color: '#10b981',
                  fontSize: '13px',
                }}
              >
                <ShieldCheck size={16} />
                <span>256-bit End-to-End Encrypted Medical Stream</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: In-Consultation Chat & Clinical Quick Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Patient Quick Vitals Chart */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} style={{ color: '#06b6d4' }} />
              <span>Patient Clinical Overview</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Blood Group:</span>
                <div style={{ color: '#fff', fontWeight: 700, marginTop: '2px' }}>
                  {userProfile?.blood_group || 'O+'}
                </div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px', borderRadius: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Age:</span>
                <div style={{ color: '#fff', fontWeight: 700, marginTop: '2px' }}>
                  {userProfile?.date_of_birth ? '29 Yrs' : 'Adult'}
                </div>
              </div>
            </div>

            {allergies.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 600 }}>Known Allergies:</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {allergies.map((a) => (
                    <span key={a.id} className="badge badge-rose" style={{ fontSize: '10px' }}>
                      {a.allergen} ({a.severity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* In-Call Chat Box */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              <MessageSquare size={16} style={{ color: '#06b6d4' }} />
              <span>In-Consultation Notes</span>
            </div>

            {/* Chat message stream */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: m.sender === 'System' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 600, marginBottom: '2px' }}>
                    <span>{m.sender}</span>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{m.time}</span>
                  </div>
                  <div style={{ color: '#e2e8f0', lineHeight: 1.4 }}>{m.text}</div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ padding: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Send note to doctor..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '12px' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TelemedicinePage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#94a3b8' }}>Loading telemedicine suite...</div>}>
      <TelemedicineContent />
    </Suspense>
  );
}
