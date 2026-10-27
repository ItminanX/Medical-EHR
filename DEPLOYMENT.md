# MediCare+ Production Deployment Guide

This guide provides end-to-end instructions for deploying **MediCare+** to **Vercel** with **Supabase** as the backend database, authentication, and file storage provider.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────┐
                      │             Vercel Edge & Server          │
                      │  Next.js 16 App Router (SSR + Static)    │
                      └─────────────────────┬─────────────────────┘
                                            │ HTTPS / WebSocket
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   Supabase Cloud Platform │                 │     Google AI Studio      │
       │  • PostgreSQL 15 Engine   │                 │  • Gemini 1.5 / 2.0 Flash │
       │  • Supabase Auth (JWT)    │                 │  • Clinical Chatbot API   │
       │  • Supabase Storage (S3)  │                 └───────────────────────────┘
       │  • Realtime Engine        │
       └───────────────────────────┘
```

---

## Phase 1: Set Up Supabase

### 1. Create a Project
1. Go to [database.new](https://database.new) and sign in to Supabase.
2. Click **New Project**, select your organization, choose a region close to your target users, and generate a strong database password (store it securely).
3. Wait ~2 minutes for the database to provision.

### 2. Execute SQL Migrations
Navigate to the **SQL Editor** tab in your Supabase dashboard (left sidebar `>` icon). Run each of the migration files located in `supabase/` in the exact order below:

#### Step 2.1: Base Schema
Open `supabase/migrations/20261028000001_schema.sql`, copy its entire content, paste into the SQL Editor, and click **Run**.
- Creates custom enum types (`user_role`, `appointment_status`, `blood_group`, etc.).
- Creates core tables (`profiles`, `departments`, `doctors`, `schedules`, `appointments`, `clinical_records`, `prescription_items`, `vitals`, `conditions`, `allergies`, `medications`, `lab_tests`, `lab_bookings`, `medical_reports`, `health_packages`, `package_bookings`, `vaccines`, `vaccinations`, `notifications`, `ai_messages`).
- Creates performance indexes and the double-booking composite unique constraint.

#### Step 2.2: Stored Procedures & Triggers
Open `supabase/migrations/20261028000002_functions.sql`, paste into the SQL Editor, and click **Run**.
- Installs `get_available_slots(...)` dynamic slot generator.
- Installs `book_appointment(...)` concurrency-safe atomic booking transaction.
- Installs `cancel_appointment(...)` and `save_medical_record(...)`.
- Installs `admin_stats()` dashboard analytics RPC.
- Installs automatic profile synchronization trigger on auth signup.
- Installs real-time notifications triggers for status changes.

#### Step 2.3: Row-Level Security (RLS)
Open `supabase/migrations/20261028000003_policies.sql`, paste into the SQL Editor, and click **Run**.
- Enables RLS on all 18 medical and user tables.
- Implements strict patient-isolation policies (patients only read/write their own records).
- Implements doctor clinical authorization (doctors can read assigned patient histories and create verified digital prescriptions).
- Implements hospital admin elevated policies.
- Enables Supabase Realtime publication on `appointments`, `notifications`, and `clinical_records`.

#### Step 2.4: Storage Buckets & Policies
Open `supabase/migrations/20261028000004_storage.sql`, paste into the SQL Editor, and click **Run**.
- Creates the private `medical-reports` bucket (patients and doctors only access authorized files in their scoped folders).
- Creates the public `avatars` bucket for user profile photos.

#### Step 2.5: Seed Data
Open `supabase/seed.sql`, paste into the SQL Editor, and click **Run**.
- Seeds 10 medical departments (Cardiology, Neurology, Pediatrics, Orthopedics, etc.).
- Seeds 12 qualified doctors with consultation fees, bio, and weekly clinic schedules.
- Seeds 14 pathology and diagnostic lab tests (CBC, Lipid Panel, MRI, CT Scan, HbA1c, etc.).
- Seeds 6 preventive health packages (Executive, Cardiac, Senior Citizen, etc.).
- Seeds 11 pediatric & adult immunization vaccines (MMR, Hepatitis B, HPV, Influenza, etc.).

---

## Phase 2: Configure Supabase Auth

1. Go to **Authentication** -> **URL Configuration**:
   - **Site URL**: `https://your-vercel-domain.vercel.app` (or your custom domain).
   - **Redirect URLs**: Add:
     - `http://localhost:3000/**` (for local development)
     - `https://your-vercel-domain.vercel.app/**`
     - `https://*.vercel.app/**` (useful for preview deployments)
2. *(Optional)* Go to **Authentication** -> **Providers** -> **Email**:
   - For demo/testing without email confirmation delays, you can disable **Confirm email** during staging, or leave it enabled for strict production verification.

---

## Phase 3: Obtain API Credentials

In your Supabase project dashboard, go to **Project Settings** (gear icon) -> **API**:
1. Copy the **Project URL** (`https://xyzcompany.supabase.co`).
2. Copy the **anon public** key (`eyJhbGciOi...`).
3. Under *Project API keys*, copy the **service_role secret** key (keep this secret; only used on the server).

---

## Phase 4: Deploy to Vercel

### Method A: One-Click GitHub Integration (Recommended)

1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Log into [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Under **Import Git Repository**, select your `MVP` repository.
4. **Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build` (Next.js 16 Turbopack)
   - **Output Directory**: `.next` (default)
5. **Environment Variables**:
   Add the following variables in the Vercel dashboard:

| Variable Name | Required | Example / Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | `eyJhbGciOi...` (Supabase Anon Key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | `eyJhbGciOi...` (Supabase Service Role Secret) |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `https://your-domain.vercel.app` |
| `GEMINI_API_KEY` | *Optional* | Your Google AI Studio API Key (for live AI triage chat) |

6. Click **Deploy**. Vercel will build and deploy the Next.js application in ~60-90 seconds.

---

### Method B: Deploying via Vercel CLI

If you prefer using the command line:
```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add GEMINI_API_KEY
vercel --prod
```

---

## Phase 5: Setting Up User Roles & Doctor Accounts

### Promoting an Admin User
1. Register a new user on your deployed app via `/login` (e.g. `admin@hospital.com`).
2. In Supabase **SQL Editor**, run the helper script in `supabase/roles.sql`:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'admin@hospital.com';
   ```
3. The user can now access the full hospital analytics and management portal at `/admin`.

### Linking a Doctor to a Verified Practitioner Account
1. Register the doctor's account (e.g. `dr.chen@medicare.plus`).
2. In Supabase **SQL Editor**, link their auth profile to a doctor directory entry:
   ```sql
   -- Find the doctor id from public.doctors
   SELECT id, full_name, specialty FROM public.doctors;

   -- Link to their auth profile:
   UPDATE public.profiles
   SET role = 'doctor'
   WHERE email = 'dr.chen@medicare.plus';

   UPDATE public.doctors
   SET profile_id = (SELECT id FROM public.profiles WHERE email = 'dr.chen@medicare.plus')
   WHERE full_name ILIKE '%Sarah Chen%';
   ```
3. The doctor can now access the clinical consultation queue and digital prescription pad at `/doctor`.

---

## Phase 6: Post-Deployment Verification Checklist

- [ ] **Landing Page**: Navigate to `https://your-domain.vercel.app` and verify responsive styling, department filters, and stats.
- [ ] **Authentication**: Test sign up, sign in, and sign out at `/login`.
- [ ] **Booking an Appointment**: Select a doctor, pick a calendar date, choose an available time slot, and confirm the appointment.
- [ ] **Doctor Prescription**: Sign in as a doctor, open an appointment, enter clinical findings, prescribe medications with dosage, and sign the prescription.
- [ ] **Patient EHR Record**: Sign in as the patient, visit `/my-health`, view the signed visit summary, and click **Print ℞ Prescription**.
- [ ] **Telemedicine**: Open `/telemedicine` to verify the Jitsi video call room and chat preview.
- [ ] **Diagnostic Tests & Packages**: Browse `/tests` and `/packages`, and book a test sample collection.
- [ ] **AI Assistant**: Click the floating clinical assistant button in the bottom right corner and ask a health query.
- [ ] **Admin Dashboard**: Visit `/admin` with an admin account to view live revenue, patient count, appointment distribution, and department breakdown.

---

## Troubleshooting & FAQ

### 1. `AuthSessionMissingError` on SSR Routes
- **Cause**: Cookie domain mismatch or missing SSR middleware.
- **Solution**: Verify `src/middleware.ts` is running and that your Supabase cookies are being forwarded properly. Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in your Vercel Environment Variables.

### 2. Double-booking error `23505`
- **Cause**: Two users tried to book the exact same doctor and time slot simultaneously.
- **Behavior**: This is expected! The database schema enforces `idx_appointments_no_double_book` to guarantee zero double bookings. The UI will catch this and display a friendly message asking the user to choose another slot.

### 3. Storage Upload Fails: `new row violates row-level security policy`
- **Cause**: The user is uploading to a path other than their designated `userId/` subfolder.
- **Solution**: The storage policy requires files to be uploaded to `${user.id}/${fileName}`. Ensure your upload call uses this path structure.

### 4. Gemini AI Chatbot Returns Fallback Response
- **Cause**: `GEMINI_API_KEY` is not defined or has exceeded its quota.
- **Behavior**: The chatbot will seamlessly fall back to the built-in clinical triage decision tree without crashing or showing an error to the user.
