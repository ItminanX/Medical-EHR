# MediCare+ | Enterprise Medical SaaS & EHR Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](#license)
[![Vercel Ready](https://img.shields.io/badge/Deployment-Vercel%20Ready-000000?style=flat-square&logo=vercel)](https://vercel.com/)

**MediCare+** is a comprehensive, production-grade Medical SaaS platform and Electronic Health Record (EHR) system. Designed for modern hospitals, clinics, and telemedicine providers, it seamlessly connects patients, doctors, and hospital administrators through a high-performance web architecture built on **Next.js 16 (App Router)** and **Supabase (PostgreSQL 15, Auth, RLS, & Storage)**.

---

## 🌟 Core Feature Suite

### 1. 🏥 Patient Portal & Electronic Health Record (EHR)
- **Verified Digital Prescriptions**: View doctor-issued prescriptions with clinical diagnoses, medication dosages, frequency, durations, and instructions.
- **Printable ℞ Prescription Sheet**: One-click, browser-native print layout formatted with official clinic headers, doctor license number, and signature line.
- **Personal Vitals Tracking**: Log and visualize Blood Pressure (Systolic/Diastolic), Heart Rate, Body Temperature, Weight, and Blood Glucose trends.
- **Health Profile Registry**: Track diagnosed chronic conditions, active medications, and drug allergies to prevent adverse medical reactions.
- **Medical Report Vault**: Securely view and upload pathology lab PDFs and diagnostic scans with private folder-level encryption.

### 2. 👨‍⚕️ Doctor Clinical Practitioner Portal (`/doctor`)
- **Real-Time Patient Consultation Queue**: View scheduled, in-progress, and completed consultations for the day.
- **Digital Prescription Pad**: Write clinical notes, diagnoses, and add multi-item prescription schedules with interactive dosage management.
- **Instant Patient History Access**: Review patient vitals, existing medications, and allergies prior to prescribing.
- **Status Automation**: Conclude consultations and automatically dispatch notification alerts and verified records to the patient's portal.

### 3. 🛡️ Hospital Admin Console (`/admin`)
- **Live Hospital KPI Metrics**: Real-time stats on total patients, active doctors, total revenue, appointments booked, and test orders.
- **Appointment Oversight**: Filter and manage hospital appointments across all departments.
- **Pathology & Lab Sample Processing**: Update lab test bookings through collection stages (`pending` ➔ `sample_collected` ➔ `analyzing` ➔ `completed`).
- **Department Distribution Analytics**: Monitor volume across Cardiology, Neurology, Pediatrics, Orthopedics, and other specialties.

### 4. 📅 Intelligent Slot Booking Engine
- **Atomic Concurrency Protection**: Backed by a PostgreSQL composite unique index `(doctor_id, appointment_date, start_time)` to mathematically eliminate double-booking even under concurrent traffic spikes.
- **Dynamic Slot Generation**: Stored procedure `get_available_slots(...)` evaluates doctor clinic hours, existing bookings, and consultation intervals in real-time.
- **Department & Doctor Search**: Filter by medical department, doctor name, and consultation type (In-Clinic or Telemedicine).

### 5. 📹 Telemedicine Video Consultation Suite (`/telemedicine`)
- **Integrated Jitsi Meet**: High-definition, encrypted peer-to-peer video calls embedded directly in the web app without third-party downloads.
- **Side-by-Side Clinical Chat**: Live in-consultation chat for doctors and patients.
- **Doctor Chart Preview**: Patients can view their EHR summary while remaining connected to the consultation room.

### 6. 🧪 Diagnostic Pathology, Packages & Immunisation
- **Pathology & Diagnostic Catalog**: 14+ clinical tests (CBC, Lipid Panel, Thyroid Profile, MRI, CT Scan, HbA1c, etc.) with home sample collection booking.
- **Preventive Health Packages**: Curated multi-test checkup packages (Executive, Cardiac Care, Senior Citizen, Women's Wellness).
- **Vaccine Registry & Tracker**: Comprehensive immunization scheduler (MMR, Hepatitis B, HPV, Influenza, COVID-19 boosters) with dose tracking.

### 7. 🤖 AI Clinical Health Assistant
- **Gemini-Powered Triage**: Interactive floating health assistant powered by Google Gemini (with rule-based clinical fallback when offline).
- **Symptom Guidance**: Answers common medical inquiries, explains lab terminology, and directs patients to the appropriate medical specialist.

---

## 🏗️ Architecture & Tech Stack

```
                        ┌───────────────────────────────────────────┐
                        │              Next.js 16 (App Router)      │
                        │   TypeScript • Vanilla CSS Design System  │
                        └─────────────────────┬─────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
        ┌───────────────────────────┐                   ┌───────────────────────────┐
        │   Supabase Cloud Platform │                   │     Google AI Studio      │
        │  • PostgreSQL 15 Engine   │                   │  • Gemini 1.5/2.0 API     │
        │  • Supabase Auth (JWT)    │                   │  • Symptom Guidance       │
        │  • Row-Level Security     │                   └───────────────────────────┘
        │  • Private Storage (S3)   │
        │  • Supabase Realtime      │
        └───────────────────────────┘
```

- **Frontend**: Next.js 16.4.3 (App Router, Turbopack, Server-Side Rendering), TypeScript 5, Lucide Icons.
- **Styling**: Tailored Dark-Mode Glassmorphism Design System in pure Vanilla CSS (`src/app/globals.css`). Zero bloated utility frameworks. High-contrast typography and print-optimized media queries.
- **Backend & Database**: Supabase PostgreSQL 15, Auth (Email/Password, Magic Link OTP), Row-Level Security (RLS) policies, Stored Procedures (`plpgsql`), Database Triggers, and Storage Buckets.
- **Video Conferencing**: Jitsi Meet External API integration with WebRTC.
- **AI Triage**: Google Gemini API via Next.js Edge route handlers with local fallback rulebook.

---

## 📁 Project Directory Structure

```
MVP/
├── DEPLOYMENT.md                     # Comprehensive Vercel & Supabase deployment guide
├── README.md                         # Project documentation
├── .env.example                      # Environment variables template
├── package.json                      # Next.js & project dependencies
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript compiler options
│
├── legacy-v1/                        # Original static HTML/JS prototype (preserved for history)
│   ├── index.html
│   ├── pages/
│   ├── components/
│   └── js/
│
├── supabase/                         # Complete Database Architecture
│   ├── migrations/
│   │   ├── 20261028000001_schema.sql    # 18 DDL tables, enums, indexes, constraints
│   │   ├── 20261028000002_functions.sql # Stored procedures, slot engine, booking transactions
│   │   ├── 20261028000003_policies.sql  # Row-Level Security (RLS) & Realtime publications
│   │   └── 20261028000004_storage.sql   # Storage bucket configurations & folder policies
│   ├── seed.sql                         # Seeds 10 departments, 12 doctors, 14 lab tests, packages, vaccines
│   └── roles.sql                        # Helper scripts for granting Admin/Doctor privileges
│
└── src/
    ├── app/
    │   ├── layout.tsx                # Root layout, theme provider, and viewport config
    │   ├── globals.css               # Core design tokens, dark glassmorphism, responsive utilities
    │   ├── page.tsx                  # High-conversion medical landing page
    │   ├── login/page.tsx            # Multi-mode Auth with Demo Role Switcher
    │   ├── dashboard/page.tsx        # Patient Overview, Vitals summary, Quick actions
    │   ├── appointments/page.tsx     # Department filter, doctor picker, dynamic slot selector
    │   ├── doctors/page.tsx          # Specialist medical directory with search & filters
    │   ├── telemedicine/page.tsx     # Live video consultation room with chat & chart preview
    │   ├── my-health/page.tsx        # EHR visit summaries, printable prescriptions, vitals log
    │   ├── tests/page.tsx            # Diagnostic lab catalog, home sample booking, report vault
    │   ├── packages/page.tsx         # Health checkup packages catalog & booking
    │   ├── vaccination/page.tsx      # Immunization tracker & scheduled dose log
    │   ├── profile/page.tsx          # Patient profile editor, avatar upload, MRN display
    │   ├── doctor/page.tsx           # Doctor clinical workspace & digital prescription pad
    │   ├── admin/page.tsx            # Hospital executive metrics, appointment oversight, sample manager
    │   └── api/ai/route.ts           # Gemini AI clinical triage endpoint with safety fallbacks
    │
    ├── components/
    │   ├── ai/AiChatWidget.tsx       # Floating AI clinical assistant widget
    │   └── layout/AppShell.tsx       # Universal navigation header, role badges, notifications bell
    │
    ├── lib/supabase/
    │   ├── client.ts                 # Browser client for Supabase
    │   ├── server.ts                 # SSR Server client for Next.js Server Components & Route Handlers
    │   └── middleware.ts             # Session refresh helper for Next.js middleware
    ├── middleware.ts                 # Route middleware handling auth cookie synchronization
    └── types/
        └── database.ts               # Strict TypeScript definitions for database entities
```

---

## 🚀 Quickstart: Local Development

### 1. Prerequisites
- **Node.js** v20.x or higher
- **npm** v10.x or higher
- A free **[Supabase](https://supabase.com)** account

### 2. Clone & Install
```bash
git clone https://github.com/ItminanX/MVP.git
cd MVP
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials (found in **Supabase Dashboard ➔ Project Settings ➔ API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key # Optional for AI assistant
```

### 4. Initialize Database
In your Supabase project's **SQL Editor**, run the migration files in order:
1. `supabase/migrations/20261028000001_schema.sql`
2. `supabase/migrations/20261028000002_functions.sql`
3. `supabase/migrations/20261028000003_policies.sql`
4. `supabase/migrations/20261028000004_storage.sql`
5. `supabase/seed.sql`

### 5. Launch the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔒 Security & HIPAA Alignment

- **Row-Level Security (RLS)**: Every medical table enforces strict Row-Level Security at the database engine level. Patients can never view records belonging to other patients.
- **Signed Medical Records**: Prescriptions and visit summaries can only be authored and signed by verified doctors with linked clinical profiles.
- **Granular Storage Isolation**: Medical report files (blood tests, radiology scans) are isolated in private buckets using path-based RLS: `medical-reports/{patient_id}/*`.
- **Atomic Race-Condition Protection**: Database unique constraints ensure that concurrent booking requests cannot double-book a doctor's calendar.

---

## 🌐 Deploy to Vercel

For complete, step-by-step instructions with screenshots and verification checklists, refer to the **[Deployment Guide](DEPLOYMENT.md)**.

### Quick Deployment Steps:
1. Push this repository to GitHub:
   ```bash
   git push origin main
   ```
2. Import the repository into **[Vercel](https://vercel.com)**.
3. Configure your Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `GEMINI_API_KEY` (optional)
4. Click **Deploy**.

---

## 👥 Demo Roles & Quick Testing

The `/login` screen includes instant role test switches for rapid demonstration:
- **Patient Demo**: View appointments, health records, vitals, and book consultations.
- **Doctor Demo**: Open `/doctor` to manage clinical queue and prescribe medications.
- **Admin Demo**: Open `/admin` to inspect hospital-wide operations and diagnostic testing.

To bind your own live registered accounts to Admin or Doctor roles, use the scripts provided in `supabase/roles.sql`.

---

## 📜 License

This project is licensed under the MIT License - feel free to use and adapt it for your own healthcare applications.
