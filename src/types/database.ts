export type UserRole = 'patient' | 'doctor' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  height_cm: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  mrn: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  profile_id: string | null;
  full_name: string;
  title: string | null;
  gender: 'male' | 'female' | 'other' | null;
  department_id: string | null;
  specialization: string | null;
  expertise: string[];
  qualifications: string | null;
  experience_years: number | null;
  bio: string | null;
  languages: string[];
  consultation_fee: number;
  video_fee: number | null;
  offers_video: boolean;
  avatar_url: string | null;
  rating: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department | null;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  weekday: number; // 0=Sun..6=Sat
  start_time: string;
  end_time: string;
  slot_minutes: number;
  mode: 'in_person' | 'video' | 'both';
  created_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  mode: 'in_person' | 'video' | 'both';
  available: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  type: 'in_person' | 'video';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reason: string | null;
  doctor_notes: string | null;
  fee: number | null;
  meeting_room: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  patient?: Profile;
}

export interface AppointmentMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  visit_date: string;
  visit_type: 'outpatient' | 'telemedicine' | 'emergency' | 'inpatient' | 'follow_up';
  chief_complaint: string | null;
  diagnosis: string;
  clinical_notes: string | null;
  advice: string | null;
  vitals: Record<string, string | number>;
  follow_up_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Doctor | null;
  prescriptions?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  record_id: string;
  medicine: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  position: number;
  created_at: string;
}

export interface Vital {
  id: string;
  patient_id: string;
  type: 'blood_pressure' | 'heart_rate' | 'blood_sugar' | 'weight' | 'temperature' | 'spo2';
  value: number;
  value2?: number | null;
  unit: string;
  note: string | null;
  recorded_at: string;
  created_at: string;
}

export interface Condition {
  id: string;
  patient_id: string;
  name: string;
  status: 'active' | 'managed' | 'resolved';
  diagnosed_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string | null;
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface LabTest {
  id: string;
  name: string;
  code: string | null;
  category: string;
  description: string | null;
  preparation: string | null;
  sample_type: string | null;
  turnaround_hours: number;
  price: number;
  home_collection: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LabBooking {
  id: string;
  patient_id: string;
  test_id: string;
  scheduled_date: string;
  collection_type: 'lab_visit' | 'home_collection';
  address: string | null;
  status: 'booked' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  test?: LabTest;
  patient?: Profile;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  lab_booking_id: string | null;
  doctor_id: string | null;
  uploaded_by: string | null;
  title: string;
  category: 'lab' | 'imaging' | 'prescription' | 'discharge' | 'other';
  file_path: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  report_date: string;
  notes: string | null;
  created_at: string;
  doctor?: Doctor | null;
}

export interface HealthPackage {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category: string;
  price: number;
  original_price: number | null;
  includes: string[];
  ideal_for: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PackageBooking {
  id: string;
  patient_id: string;
  package_id: string;
  preferred_date: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled';
  amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  package?: HealthPackage;
  patient?: Profile;
}

export interface Vaccine {
  id: string;
  name: string;
  disease: string;
  description: string | null;
  doses_required: number;
  dose_interval_days: number;
  recommended_for: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface Vaccination {
  id: string;
  patient_id: string;
  vaccine_id: string;
  dose_number: number;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  scheduled_date: string | null;
  administered_date: string | null;
  location: string | null;
  batch_number: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vaccine?: Vaccine;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AiMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
