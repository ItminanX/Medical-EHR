-- =============================================================================
-- MediCare+  ·  01 · SCHEMA
-- Tables, constraints and indexes.
-- Run order: 01_schema → 02_functions → 03_policies → 04_storage → seed.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Medical Record Number sequence (e.g. MC26000123)
create sequence if not exists public.mrn_seq start 1000;

-- -----------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  email                    text,
  full_name                text,
  phone                    text,
  date_of_birth            date,
  gender                   text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group              text check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  height_cm                numeric(5, 1) check (height_cm is null or height_cm between 30 and 260),
  address                  text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  avatar_url               text,
  role                     text not null default 'patient' check (role in ('patient', 'doctor', 'admin')),
  mrn                      text unique default ('MC' || to_char(now(), 'YY') || lpad(nextval('public.mrn_seq')::text, 6, '0')),
  onboarded                boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- DEPARTMENTS & DOCTORS
-- -----------------------------------------------------------------------------
create table if not exists public.departments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  description  text,
  icon         text not null default 'stethoscope',
  created_at   timestamptz not null default now()
);

create table if not exists public.doctors (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid unique references public.profiles (id) on delete set null,
  full_name         text not null,
  title             text,
  gender            text check (gender in ('male', 'female', 'other')),
  department_id     uuid references public.departments (id) on delete set null,
  specialization    text,
  expertise         text[] not null default '{}',
  qualifications    text,
  experience_years  int check (experience_years is null or experience_years >= 0),
  bio               text,
  languages         text[] not null default '{English,Bangla}',
  consultation_fee  numeric(10, 2) not null default 0 check (consultation_fee >= 0),
  video_fee         numeric(10, 2) check (video_fee is null or video_fee >= 0),
  offers_video      boolean not null default true,
  avatar_url        text,
  rating            numeric(2, 1) not null default 4.8 check (rating between 0 and 5),
  review_count      int not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists doctors_department_idx on public.doctors (department_id);
create index if not exists doctors_active_idx on public.doctors (is_active);
create trigger doctors_updated_at before update on public.doctors
  for each row execute function public.set_updated_at();

-- Weekly recurring availability. weekday: 0 = Sunday … 6 = Saturday
create table if not exists public.doctor_schedules (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references public.doctors (id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  slot_minutes  int not null default 20 check (slot_minutes between 5 and 120),
  mode          text not null default 'both' check (mode in ('in_person', 'video', 'both')),
  created_at    timestamptz not null default now(),
  check (end_time > start_time),
  unique (doctor_id, weekday, start_time)
);

create index if not exists doctor_schedules_doctor_idx on public.doctor_schedules (doctor_id, weekday);

-- One-off days off (vacation, conference …)
create table if not exists public.doctor_leaves (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  leave_date  date not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (doctor_id, leave_date)
);

-- -----------------------------------------------------------------------------
-- APPOINTMENTS  (in-person + telemedicine)
-- -----------------------------------------------------------------------------
create table if not exists public.appointments (
  id                   uuid primary key default gen_random_uuid(),
  patient_id           uuid not null references public.profiles (id) on delete cascade,
  doctor_id            uuid not null references public.doctors (id) on delete cascade,
  appointment_date     date not null,
  start_time           time not null,
  end_time             time not null,
  type                 text not null default 'in_person' check (type in ('in_person', 'video')),
  status               text not null default 'confirmed'
                         check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  reason               text,
  doctor_notes         text,
  fee                  numeric(10, 2),
  meeting_room         text,
  cancelled_by         uuid references public.profiles (id) on delete set null,
  cancellation_reason  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- The database itself guarantees no double booking — even under race conditions.
create unique index if not exists appointments_doctor_slot_uniq
  on public.appointments (doctor_id, appointment_date, start_time)
  where status <> 'cancelled';
create unique index if not exists appointments_patient_slot_uniq
  on public.appointments (patient_id, appointment_date, start_time)
  where status <> 'cancelled';
create index if not exists appointments_patient_idx on public.appointments (patient_id, appointment_date desc);
create index if not exists appointments_doctor_idx on public.appointments (doctor_id, appointment_date desc);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- In-consultation chat (telemedicine)
create table if not exists public.appointment_messages (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  content         text not null check (char_length(content) between 1 and 4000),
  created_at      timestamptz not null default now()
);

create index if not exists appointment_messages_appt_idx on public.appointment_messages (appointment_id, created_at);

-- -----------------------------------------------------------------------------
-- HOSPITAL CLINICAL RECORDS & PRESCRIPTIONS
-- -----------------------------------------------------------------------------
create table if not exists public.medical_records (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  doctor_id        uuid references public.doctors (id) on delete set null,
  appointment_id   uuid unique references public.appointments (id) on delete set null,
  visit_date       date not null default current_date,
  visit_type       text not null default 'outpatient' check (visit_type in ('outpatient', 'telemedicine', 'emergency', 'inpatient', 'follow_up')),
  chief_complaint  text,
  diagnosis        text not null,
  clinical_notes   text,
  advice           text,
  vitals           jsonb not null default '{}'::jsonb,
  follow_up_date   date,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists medical_records_patient_idx on public.medical_records (patient_id, visit_date desc);
create index if not exists medical_records_doctor_idx on public.medical_records (doctor_id);
create trigger medical_records_updated_at before update on public.medical_records
  for each row execute function public.set_updated_at();

create table if not exists public.prescription_items (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references public.medical_records (id) on delete cascade,
  medicine      text not null,
  dosage        text,
  frequency     text,
  duration      text,
  instructions  text,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists prescription_items_record_idx on public.prescription_items (record_id, position);

-- -----------------------------------------------------------------------------
-- PERSONAL HEALTH TRACKING  (patient-managed)
-- -----------------------------------------------------------------------------
create table if not exists public.vitals (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.profiles (id) on delete cascade,
  type         text not null check (type in ('blood_pressure', 'heart_rate', 'blood_sugar', 'weight', 'temperature', 'spo2')),
  value        numeric(7, 2) not null,
  value2       numeric(7, 2),           -- diastolic for blood pressure
  unit         text not null,
  note         text,
  recorded_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists vitals_patient_idx on public.vitals (patient_id, type, recorded_at desc);

create table if not exists public.conditions (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles (id) on delete cascade,
  name           text not null,
  status         text not null default 'active' check (status in ('active', 'managed', 'resolved')),
  diagnosed_on   date,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists conditions_patient_idx on public.conditions (patient_id);

create table if not exists public.allergies (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete cascade,
  allergen    text not null,
  severity    text not null default 'moderate' check (severity in ('mild', 'moderate', 'severe')),
  reaction    text,
  created_at  timestamptz not null default now()
);

create index if not exists allergies_patient_idx on public.allergies (patient_id);

create table if not exists public.medications (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  dosage      text,
  frequency   text,
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists medications_patient_idx on public.medications (patient_id, is_active);

-- -----------------------------------------------------------------------------
-- LAB TESTS, BOOKINGS & REPORTS
-- -----------------------------------------------------------------------------
create table if not exists public.lab_tests (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  code              text unique,
  category          text not null default 'Pathology',
  description       text,
  preparation       text,
  sample_type       text,
  turnaround_hours  int not null default 24,
  price             numeric(10, 2) not null check (price >= 0),
  home_collection   boolean not null default true,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.lab_bookings (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  test_id          uuid not null references public.lab_tests (id) on delete restrict,
  scheduled_date   date not null,
  collection_type  text not null default 'lab_visit' check (collection_type in ('lab_visit', 'home_collection')),
  address          text,
  status           text not null default 'booked'
                     check (status in ('booked', 'sample_collected', 'processing', 'completed', 'cancelled')),
  price            numeric(10, 2),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lab_bookings_patient_idx on public.lab_bookings (patient_id, scheduled_date desc);
create index if not exists lab_bookings_status_idx on public.lab_bookings (status);
create trigger lab_bookings_updated_at before update on public.lab_bookings
  for each row execute function public.set_updated_at();

create table if not exists public.medical_reports (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles (id) on delete cascade,
  lab_booking_id  uuid references public.lab_bookings (id) on delete set null,
  doctor_id       uuid references public.doctors (id) on delete set null,
  uploaded_by     uuid references public.profiles (id) on delete set null,
  title           text not null,
  category        text not null default 'lab' check (category in ('lab', 'imaging', 'prescription', 'discharge', 'other')),
  file_path       text not null,
  file_name       text,
  file_size       int,
  mime_type       text,
  report_date     date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists medical_reports_patient_idx on public.medical_reports (patient_id, report_date desc);

-- -----------------------------------------------------------------------------
-- HEALTH PACKAGES
-- -----------------------------------------------------------------------------
create table if not exists public.health_packages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  tagline         text,
  description     text,
  category        text not null default 'General',
  price           numeric(10, 2) not null check (price >= 0),
  original_price  numeric(10, 2),
  includes        text[] not null default '{}',
  ideal_for       text,
  is_featured     boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.package_bookings (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles (id) on delete cascade,
  package_id      uuid not null references public.health_packages (id) on delete restrict,
  preferred_date  date not null,
  status          text not null default 'booked' check (status in ('booked', 'confirmed', 'completed', 'cancelled')),
  amount          numeric(10, 2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists package_bookings_patient_idx on public.package_bookings (patient_id, preferred_date desc);
create trigger package_bookings_updated_at before update on public.package_bookings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- VACCINATION
-- -----------------------------------------------------------------------------
create table if not exists public.vaccines (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  disease             text not null,
  description         text,
  doses_required      int not null default 1 check (doses_required between 1 and 10),
  dose_interval_days  int not null default 0 check (dose_interval_days >= 0),
  recommended_for     text,
  price               numeric(10, 2) not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists public.vaccinations (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.profiles (id) on delete cascade,
  vaccine_id        uuid not null references public.vaccines (id) on delete restrict,
  dose_number       int not null default 1 check (dose_number >= 1),
  status            text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed', 'cancelled')),
  scheduled_date    date,
  administered_date date,
  location          text,
  batch_number      text,
  administered_by   text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists vaccinations_dose_uniq
  on public.vaccinations (patient_id, vaccine_id, dose_number)
  where status <> 'cancelled';
create index if not exists vaccinations_patient_idx on public.vaccinations (patient_id, scheduled_date);
create trigger vaccinations_updated_at before update on public.vaccinations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS & AI ASSISTANT
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null default 'info',
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists ai_messages_user_idx on public.ai_messages (user_id, created_at);
