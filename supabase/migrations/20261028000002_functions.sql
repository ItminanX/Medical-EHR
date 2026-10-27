-- =============================================================================
-- MediCare+  ·  02 · FUNCTIONS, RPCs & TRIGGERS
-- =============================================================================

-- Clinic timezone — all slot calculations use this. Change if you're not in BD.
create or replace function public.app_timezone()
returns text
language sql
immutable
as $$ select 'Asia/Dhaka'::text $$;

create or replace function public.clinic_now()
returns timestamp
language sql
stable
as $$ select (now() at time zone public.app_timezone()) $$;

-- -----------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can be used inside RLS policies
-- without recursive policy evaluation)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.doctors d
  join public.profiles p on p.id = d.profile_id
  where d.profile_id = auth.uid() and p.role in ('doctor', 'admin')
  limit 1;
$$;

-- Does the signed-in doctor have a care relationship with this patient?
create or replace function public.is_doctor_of(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.appointments a
    where a.doctor_id = public.current_doctor_id() and a.patient_id = p_patient
  ) or exists (
    select 1 from public.medical_records r
    where r.doctor_id = public.current_doctor_id() and r.patient_id = p_patient
  );
$$;

-- Used by storage policies — folder name is the patient's uuid
create or replace function public.can_access_patient_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_patient uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  if p_folder = auth.uid()::text or public.is_admin() then
    return true;
  end if;
  begin
    v_patient := p_folder::uuid;
  exception when others then
    return false;
  end;
  return public.is_doctor_of(v_patient);
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications
-- -----------------------------------------------------------------------------
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text default null, p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user, p_type, p_title, p_body, p_link);
end;
$$;

revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- New auth user → profile row
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.phone, ''), nullif(new.raw_user_meta_data ->> 'phone', ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile, but never their role / MRN / email.
-- (auth.uid() is null when running from the SQL editor or with the service key.)
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role  := old.role;
    new.mrn   := old.mrn;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- When a user is promoted to doctor/admin, welcome them.
create or replace function public.on_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and new.role in ('doctor', 'admin') then
    perform public.notify(
      new.id, 'system',
      case when new.role = 'doctor' then 'Doctor portal unlocked' else 'Admin access granted' end,
      case when new.role = 'doctor'
        then 'You now have access to the doctor portal.'
        else 'You can now manage doctors, catalog and bookings.' end,
      case when new.role = 'doctor' then '/doctor' else '/admin' end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_change on public.profiles;
create trigger profiles_role_change
  after update of role on public.profiles
  for each row execute function public.on_profile_role_change();

-- -----------------------------------------------------------------------------
-- SLOT ENGINE
-- Generates bookable slots for a doctor on a date from the weekly schedule,
-- minus leaves, booked slots and slots already in the past.
-- -----------------------------------------------------------------------------
create or replace function public.get_available_slots(p_doctor_id uuid, p_date date)
returns table (slot_start time, slot_end time, mode text, available boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if exists (select 1 from public.doctor_leaves l where l.doctor_id = p_doctor_id and l.leave_date = p_date) then
    return;
  end if;

  return query
  with sched as (
    select s.start_time as s_start, s.end_time as s_end, s.slot_minutes as s_minutes, s.mode as s_mode
    from public.doctor_schedules s
    join public.doctors d on d.id = s.doctor_id and d.is_active
    where s.doctor_id = p_doctor_id
      and s.weekday = extract(dow from p_date)::int
  ),
  slots as (
    select
      g::time                                         as s_slot_start,
      (g + make_interval(mins => sc.s_minutes))::time as s_slot_end,
      sc.s_mode                                       as s_slot_mode
    from sched sc,
    lateral generate_series(
      p_date + sc.s_start,
      p_date + sc.s_end - make_interval(mins => sc.s_minutes),
      make_interval(mins => sc.s_minutes)
    ) as g
  )
  select
    sl.s_slot_start,
    sl.s_slot_end,
    sl.s_slot_mode,
    (
      not exists (
        select 1 from public.appointments a
        where a.doctor_id = p_doctor_id
          and a.appointment_date = p_date
          and a.start_time = sl.s_slot_start
          and a.status <> 'cancelled'
      )
      and (p_date + sl.s_slot_start) > public.clinic_now()
    )
  from slots sl
  order by sl.s_slot_start;
end;
$$;

-- -----------------------------------------------------------------------------
-- BOOK APPOINTMENT  (the only way patients can create appointments)
-- -----------------------------------------------------------------------------
create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_date date,
  p_start time,
  p_type text default 'in_person',
  p_reason text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_doc  public.doctors;
  v_slot record;
  v_appt public.appointments;
begin
  if v_uid is null then
    raise exception 'You must be signed in to book an appointment';
  end if;
  if p_type not in ('in_person', 'video') then
    raise exception 'Invalid appointment type';
  end if;

  select * into v_doc from public.doctors where id = p_doctor_id and is_active;
  if not found then
    raise exception 'Doctor not found';
  end if;
  if v_doc.profile_id = v_uid then
    raise exception 'You cannot book an appointment with yourself';
  end if;
  if p_type = 'video' and not v_doc.offers_video then
    raise exception 'This doctor does not offer video consultations';
  end if;
  if p_date < public.clinic_now()::date then
    raise exception 'You cannot book in the past';
  end if;
  if p_date > public.clinic_now()::date + 60 then
    raise exception 'Appointments can be booked up to 60 days in advance';
  end if;

  select * into v_slot
  from public.get_available_slots(p_doctor_id, p_date) s
  where s.slot_start = p_start;

  if not found then
    raise exception 'That time slot does not exist in the doctor''s schedule';
  end if;
  if not v_slot.available then
    raise exception 'Sorry, that slot is no longer available';
  end if;
  if v_slot.mode <> 'both' and v_slot.mode <> p_type then
    raise exception 'This slot is reserved for % consultations',
      case when v_slot.mode = 'video' then 'video' else 'in-person' end;
  end if;

  insert into public.appointments (
    patient_id, doctor_id, appointment_date, start_time, end_time,
    type, status, reason, fee, meeting_room
  ) values (
    v_uid, p_doctor_id, p_date, p_start, v_slot.slot_end,
    p_type, 'confirmed', nullif(trim(p_reason), ''),
    case when p_type = 'video' then coalesce(v_doc.video_fee, v_doc.consultation_fee) else v_doc.consultation_fee end,
    case when p_type = 'video' then 'MediCarePlus-' || replace(gen_random_uuid()::text, '-', '') end
  )
  returning * into v_appt;

  return v_appt;
exception
  when unique_violation then
    raise exception 'That slot was just taken, or you already have an appointment at that time';
end;
$$;

-- -----------------------------------------------------------------------------
-- CANCEL APPOINTMENT  (patient, the doctor, or an admin)
-- -----------------------------------------------------------------------------
create or replace function public.cancel_appointment(p_id uuid, p_reason text default null)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
  v_is_patient boolean;
  v_is_doctor boolean;
begin
  select * into v_appt from public.appointments where id = p_id for update;
  if not found then
    raise exception 'Appointment not found';
  end if;

  v_is_patient := v_appt.patient_id = auth.uid();
  v_is_doctor  := v_appt.doctor_id = public.current_doctor_id();

  if not (v_is_patient or v_is_doctor or public.is_admin()) then
    raise exception 'Not allowed';
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Only upcoming appointments can be cancelled';
  end if;
  if v_is_patient and not public.is_admin()
     and (v_appt.appointment_date + v_appt.start_time) < public.clinic_now() then
    raise exception 'This appointment has already started';
  end if;

  update public.appointments
     set status = 'cancelled',
         cancelled_by = auth.uid(),
         cancellation_reason = nullif(trim(p_reason), '')
   where id = p_id
  returning * into v_appt;

  return v_appt;
end;
$$;

-- -----------------------------------------------------------------------------
-- DOCTOR / ADMIN: change appointment status
-- -----------------------------------------------------------------------------
create or replace function public.set_appointment_status(p_id uuid, p_status text, p_notes text default null)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
begin
  select * into v_appt from public.appointments where id = p_id for update;
  if not found then
    raise exception 'Appointment not found';
  end if;
  if not (v_appt.doctor_id = public.current_doctor_id() or public.is_admin()) then
    raise exception 'Not allowed';
  end if;
  if p_status not in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') then
    raise exception 'Invalid status';
  end if;

  update public.appointments
     set status = p_status,
         doctor_notes = coalesce(nullif(trim(p_notes), ''), doctor_notes),
         cancelled_by = case when p_status = 'cancelled' then auth.uid() else cancelled_by end
   where id = p_id
  returning * into v_appt;

  return v_appt;
end;
$$;

-- -----------------------------------------------------------------------------
-- SAVE MEDICAL RECORD + PRESCRIPTION  (doctor after a visit, or admin for
-- hospital/walk-in records). p_items: [{medicine, dosage, frequency, duration, instructions}]
-- -----------------------------------------------------------------------------
create or replace function public.save_medical_record(
  p_patient_id uuid,
  p_diagnosis text,
  p_appointment_id uuid default null,
  p_doctor_id uuid default null,
  p_visit_date date default null,
  p_visit_type text default 'outpatient',
  p_chief_complaint text default null,
  p_clinical_notes text default null,
  p_advice text default null,
  p_follow_up_date date default null,
  p_vitals jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor   uuid := public.current_doctor_id();
  v_admin    boolean := public.is_admin();
  v_appt     public.appointments;
  v_record   uuid;
  v_item     jsonb;
  v_pos      int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not v_admin and v_doctor is null then
    raise exception 'Only doctors and hospital admins can write medical records';
  end if;
  if coalesce(trim(p_diagnosis), '') = '' then
    raise exception 'Diagnosis is required';
  end if;

  -- Doctors always write as themselves; admins can choose any doctor.
  if not v_admin then
    p_doctor_id := v_doctor;
  end if;

  if p_appointment_id is not null then
    select * into v_appt from public.appointments where id = p_appointment_id for update;
    if not found or v_appt.patient_id <> p_patient_id then
      raise exception 'Appointment does not match this patient';
    end if;
    if not v_admin and v_appt.doctor_id <> v_doctor then
      raise exception 'This appointment belongs to another doctor';
    end if;
    p_doctor_id := coalesce(p_doctor_id, v_appt.doctor_id);
    p_visit_date := coalesce(p_visit_date, v_appt.appointment_date);
    if v_appt.type = 'video' and p_visit_type = 'outpatient' then
      p_visit_type := 'telemedicine';
    end if;
  elsif not v_admin and not public.is_doctor_of(p_patient_id) then
    raise exception 'You have no care relationship with this patient';
  end if;

  insert into public.medical_records (
    patient_id, doctor_id, appointment_id, visit_date, visit_type,
    chief_complaint, diagnosis, clinical_notes, advice, vitals, follow_up_date, created_by
  ) values (
    p_patient_id, p_doctor_id, p_appointment_id, coalesce(p_visit_date, public.clinic_now()::date), p_visit_type,
    nullif(trim(p_chief_complaint), ''), trim(p_diagnosis), nullif(trim(p_clinical_notes), ''),
    nullif(trim(p_advice), ''), coalesce(p_vitals, '{}'::jsonb), p_follow_up_date, auth.uid()
  )
  returning id into v_record;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    if coalesce(trim(v_item ->> 'medicine'), '') <> '' then
      insert into public.prescription_items (record_id, medicine, dosage, frequency, duration, instructions, position)
      values (
        v_record,
        trim(v_item ->> 'medicine'),
        nullif(trim(v_item ->> 'dosage'), ''),
        nullif(trim(v_item ->> 'frequency'), ''),
        nullif(trim(v_item ->> 'duration'), ''),
        nullif(trim(v_item ->> 'instructions'), ''),
        v_pos
      );
      v_pos := v_pos + 1;
    end if;
  end loop;

  if p_appointment_id is not null then
    update public.appointments set status = 'completed' where id = p_appointment_id;
  end if;

  return v_record;
end;
$$;

-- -----------------------------------------------------------------------------
-- BOOKING GUARDS — prices always come from the catalog, and patients can only
-- cancel their own bookings (admins can move them through the workflow).
-- -----------------------------------------------------------------------------
create or replace function public.lab_booking_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test public.lab_tests;
begin
  select * into v_test from public.lab_tests where id = new.test_id and is_active;
  if not found then
    raise exception 'This test is not available';
  end if;
  if new.scheduled_date < public.clinic_now()::date then
    raise exception 'Please choose a future date';
  end if;
  if new.collection_type = 'home_collection' and not v_test.home_collection then
    raise exception 'Home collection is not available for this test';
  end if;
  if new.collection_type = 'home_collection' and coalesce(trim(new.address), '') = '' then
    raise exception 'Address is required for home collection';
  end if;
  new.price := v_test.price;
  if not public.is_admin() then
    new.status := 'booked';
  end if;
  return new;
end;
$$;

drop trigger if exists lab_bookings_before_insert on public.lab_bookings;
create trigger lab_bookings_before_insert
  before insert on public.lab_bookings
  for each row execute function public.lab_booking_before_insert();

create or replace function public.package_booking_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.health_packages;
begin
  select * into v_pkg from public.health_packages where id = new.package_id and is_active;
  if not found then
    raise exception 'This package is not available';
  end if;
  if new.preferred_date < public.clinic_now()::date then
    raise exception 'Please choose a future date';
  end if;
  new.amount := v_pkg.price;
  if not public.is_admin() then
    new.status := 'booked';
  end if;
  return new;
end;
$$;

drop trigger if exists package_bookings_before_insert on public.package_bookings;
create trigger package_bookings_before_insert
  before insert on public.package_bookings
  for each row execute function public.package_booking_before_insert();

-- Shared guard for lab + package booking updates by patients
create or replace function public.patient_booking_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() or public.current_doctor_id() is not null then
    return new;
  end if;
  if new.status <> 'cancelled' or old.status not in ('booked', 'confirmed') then
    raise exception 'You can only cancel bookings that have not started yet';
  end if;
  new := old;
  new.status := 'cancelled';
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lab_bookings_update_guard on public.lab_bookings;
create trigger lab_bookings_update_guard
  before update on public.lab_bookings
  for each row execute function public.patient_booking_update_guard();

drop trigger if exists package_bookings_update_guard on public.package_bookings;
create trigger package_bookings_update_guard
  before update on public.package_bookings
  for each row execute function public.patient_booking_update_guard();

-- -----------------------------------------------------------------------------
-- VACCINATION — auto-schedule the next dose when one is completed
-- -----------------------------------------------------------------------------
create or replace function public.vaccination_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vax public.vaccines;
begin
  select * into v_vax from public.vaccines where id = new.vaccine_id;

  if new.status = 'completed'
     and (tg_op = 'INSERT' or old.status is distinct from 'completed')
     and new.dose_number < v_vax.doses_required then
    insert into public.vaccinations (patient_id, vaccine_id, dose_number, status, scheduled_date, location)
    values (
      new.patient_id, new.vaccine_id, new.dose_number + 1, 'scheduled',
      coalesce(new.administered_date, public.clinic_now()::date) + greatest(v_vax.dose_interval_days, 1),
      new.location
    )
    on conflict do nothing;
    -- the INSERT above fires this trigger again, which sends the "dose scheduled" notification
  end if;

  if tg_op = 'INSERT' and new.status = 'scheduled' then
    perform public.notify(
      new.patient_id, 'vaccination',
      v_vax.name || ' — dose ' || new.dose_number || ' scheduled',
      'Scheduled for ' || coalesce(to_char(new.scheduled_date, 'DD Mon YYYY'), 'a date to be confirmed'),
      '/vaccination'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists vaccinations_after_change on public.vaccinations;
create trigger vaccinations_after_change
  after insert or update of status on public.vaccinations
  for each row execute function public.vaccination_after_change();

-- -----------------------------------------------------------------------------
-- NOTIFICATION TRIGGERS
-- -----------------------------------------------------------------------------
create or replace function public.appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc     public.doctors;
  v_patient public.profiles;
  v_when    text;
begin
  select * into v_doc from public.doctors where id = new.doctor_id;
  select * into v_patient from public.profiles where id = new.patient_id;
  v_when := to_char(new.appointment_date, 'Dy, DD Mon') || ' at ' || to_char(new.start_time, 'HH12:MI AM');

  if tg_op = 'INSERT' then
    perform public.notify(
      new.patient_id, 'appointment',
      'Appointment confirmed with ' || v_doc.full_name,
      initcap(replace(new.type, '_', '-')) || ' consultation · ' || v_when,
      '/appointments'
    );
    perform public.notify(
      v_doc.profile_id, 'appointment',
      'New appointment: ' || coalesce(v_patient.full_name, 'Patient'),
      initcap(replace(new.type, '_', '-')) || ' · ' || v_when,
      '/doctor/appointments/' || new.id
    );
  elsif new.status is distinct from old.status then
    if new.status = 'cancelled' then
      if new.cancelled_by is distinct from new.patient_id then
        perform public.notify(new.patient_id, 'appointment',
          'Appointment cancelled', 'Your appointment with ' || v_doc.full_name || ' on ' || v_when || ' was cancelled.',
          '/appointments');
      end if;
      if new.cancelled_by is distinct from v_doc.profile_id then
        perform public.notify(v_doc.profile_id, 'appointment',
          'Appointment cancelled', coalesce(v_patient.full_name, 'A patient') || ' · ' || v_when,
          '/doctor');
      end if;
    elsif new.status = 'completed' then
      perform public.notify(new.patient_id, 'appointment',
        'Consultation completed', 'Your visit summary and prescription are in My Health.',
        '/my-health?tab=records');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_notify on public.appointments;
create trigger appointments_notify
  after insert or update of status on public.appointments
  for each row execute function public.appointment_notifications();

create or replace function public.medical_record_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc_name text;
begin
  select full_name into v_doc_name from public.doctors where id = new.doctor_id;
  perform public.notify(
    new.patient_id, 'record',
    'New prescription & visit summary',
    coalesce(v_doc_name, 'Your doctor') || ' added a record: ' || new.diagnosis,
    '/my-health/records/' || new.id
  );
  return new;
end;
$$;

drop trigger if exists medical_records_notify on public.medical_records;
create trigger medical_records_notify
  after insert on public.medical_records
  for each row execute function public.medical_record_notifications();

create or replace function public.report_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.uploaded_by is distinct from new.patient_id then
    perform public.notify(new.patient_id, 'report', 'New report available', new.title, '/tests?tab=reports');
  end if;
  if new.lab_booking_id is not null and new.uploaded_by is distinct from new.patient_id then
    update public.lab_bookings set status = 'completed' where id = new.lab_booking_id and status <> 'cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists medical_reports_notify on public.medical_reports;
create trigger medical_reports_notify
  after insert on public.medical_reports
  for each row execute function public.report_notifications();

create or replace function public.booking_status_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_link text;
begin
  -- Only notify when staff changed the status (not when the patient cancelled)
  if new.status is not distinct from old.status or auth.uid() is not distinct from new.patient_id then
    return new;
  end if;

  if tg_table_name = 'lab_bookings' then
    select t.name into v_name from public.lab_tests t where t.id = (to_jsonb(new) ->> 'test_id')::uuid;
    v_link := '/tests?tab=bookings';
  else
    select p.name into v_name from public.health_packages p where p.id = (to_jsonb(new) ->> 'package_id')::uuid;
    v_link := '/packages';
  end if;

  perform public.notify(
    new.patient_id, 'booking',
    coalesce(v_name, 'Booking') || ' · ' || initcap(replace(new.status, '_', ' ')),
    case new.status
      when 'confirmed'        then 'Your booking has been confirmed.'
      when 'sample_collected' then 'Your sample has been collected.'
      when 'processing'       then 'Your sample is being processed in the lab.'
      when 'completed'        then 'All done! Results/reports will appear in your account.'
      when 'cancelled'        then 'Your booking was cancelled by the hospital.'
      else 'Your booking status was updated.'
    end,
    v_link
  );
  return new;
end;
$$;

drop trigger if exists lab_bookings_notify on public.lab_bookings;
create trigger lab_bookings_notify
  after update of status on public.lab_bookings
  for each row execute function public.booking_status_notifications();

drop trigger if exists package_bookings_notify on public.package_bookings;
create trigger package_bookings_notify
  after update of status on public.package_bookings
  for each row execute function public.booking_status_notifications();

-- -----------------------------------------------------------------------------
-- ADMIN: dashboard numbers in a single round-trip
-- -----------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := public.clinic_now()::date;
begin
  if not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return jsonb_build_object(
    'patients',            (select count(*) from public.profiles where role = 'patient'),
    'doctors',             (select count(*) from public.doctors where is_active),
    'appointments_today',  (select count(*) from public.appointments where appointment_date = v_today and status <> 'cancelled'),
    'appointments_month',  (select count(*) from public.appointments where date_trunc('month', appointment_date) = date_trunc('month', v_today) and status <> 'cancelled'),
    'pending_lab',         (select count(*) from public.lab_bookings where status in ('booked', 'sample_collected', 'processing')),
    'pending_packages',    (select count(*) from public.package_bookings where status = 'booked'),
    'upcoming_vaccines',   (select count(*) from public.vaccinations where status = 'scheduled' and scheduled_date between v_today and v_today + 7),
    'revenue_month',       coalesce((select sum(fee) from public.appointments where status = 'completed' and date_trunc('month', appointment_date) = date_trunc('month', v_today)), 0)
                         + coalesce((select sum(price) from public.lab_bookings where status = 'completed' and date_trunc('month', scheduled_date) = date_trunc('month', v_today)), 0)
                         + coalesce((select sum(amount) from public.package_bookings where status = 'completed' and date_trunc('month', preferred_date) = date_trunc('month', v_today)), 0),
    'records',             (select count(*) from public.medical_records)
  );
end;
$$;

-- Admin: find a user by email to link as a doctor or add a hospital record
create or replace function public.admin_find_profile(p_query text)
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles
  where public.is_admin()
    and (email ilike '%' || p_query || '%' or full_name ilike '%' || p_query || '%' or mrn ilike '%' || p_query || '%' or phone ilike '%' || p_query || '%')
  order by created_at desc
  limit 20;
$$;

-- -----------------------------------------------------------------------------
-- Grants for RPCs
-- -----------------------------------------------------------------------------
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, date, time, text, text) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.set_appointment_status(uuid, text, text) to authenticated;
grant execute on function public.save_medical_record(uuid, text, uuid, uuid, date, text, text, text, text, date, jsonb, jsonb) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_find_profile(text) to authenticated;
