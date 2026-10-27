-- =============================================================================
-- MediCare+  ·  03 · ROW LEVEL SECURITY
-- Every table is locked down. Access rules:
--   patient → only their own data
--   doctor  → their own schedule/appointments + charts of patients they treat
--   admin   → everything
-- =============================================================================

-- Table privileges (RLS still decides which ROWS are visible)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.departments, public.doctors, public.doctor_schedules,
               public.lab_tests, public.health_packages, public.vaccines to anon;

alter table public.profiles             enable row level security;
alter table public.departments          enable row level security;
alter table public.doctors              enable row level security;
alter table public.doctor_schedules     enable row level security;
alter table public.doctor_leaves        enable row level security;
alter table public.appointments         enable row level security;
alter table public.appointment_messages enable row level security;
alter table public.medical_records      enable row level security;
alter table public.prescription_items   enable row level security;
alter table public.vitals               enable row level security;
alter table public.conditions           enable row level security;
alter table public.allergies            enable row level security;
alter table public.medications          enable row level security;
alter table public.lab_tests            enable row level security;
alter table public.lab_bookings         enable row level security;
alter table public.medical_reports      enable row level security;
alter table public.health_packages      enable row level security;
alter table public.package_bookings     enable row level security;
alter table public.vaccines             enable row level security;
alter table public.vaccinations         enable row level security;
alter table public.notifications        enable row level security;
alter table public.ai_messages          enable row level security;

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
create policy "profiles: read own / treating doctor / admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_doctor_of(id));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles: admin update"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- PUBLIC CATALOG  (departments, doctors, schedules, tests, packages, vaccines)
-- -----------------------------------------------------------------------------
create policy "departments: public read" on public.departments
  for select to anon, authenticated using (true);
create policy "departments: admin write" on public.departments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "doctors: public read active" on public.doctors
  for select to anon, authenticated
  using (is_active or public.is_admin() or profile_id = auth.uid());
create policy "doctors: admin write" on public.doctors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "doctors: update own listing" on public.doctors
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "schedules: public read" on public.doctor_schedules
  for select to anon, authenticated using (true);
create policy "schedules: own doctor or admin write" on public.doctor_schedules
  for all to authenticated
  using (doctor_id = public.current_doctor_id() or public.is_admin())
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "leaves: authenticated read" on public.doctor_leaves
  for select to authenticated using (true);
create policy "leaves: own doctor or admin write" on public.doctor_leaves
  for all to authenticated
  using (doctor_id = public.current_doctor_id() or public.is_admin())
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "lab_tests: public read" on public.lab_tests
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "lab_tests: admin write" on public.lab_tests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "packages: public read" on public.health_packages
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "packages: admin write" on public.health_packages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "vaccines: public read" on public.vaccines
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "vaccines: admin write" on public.vaccines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- APPOINTMENTS — created/changed only through RPCs (book/cancel/set status)
-- -----------------------------------------------------------------------------
create policy "appointments: read own / doctor / admin"
  on public.appointments for select to authenticated
  using (patient_id = auth.uid() or doctor_id = public.current_doctor_id() or public.is_admin());

create policy "appointments: admin write"
  on public.appointments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Doctors change status/notes via public.set_appointment_status() (no direct UPDATE).

create policy "messages: participants read"
  on public.appointment_messages for select to authenticated
  using (exists (
    select 1 from public.appointments a
    where a.id = appointment_id
      and (a.patient_id = auth.uid() or a.doctor_id = public.current_doctor_id() or public.is_admin())
  ));

create policy "messages: participants send"
  on public.appointment_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.status in ('confirmed', 'completed')
        and (a.patient_id = auth.uid() or a.doctor_id = public.current_doctor_id())
    )
  );

-- -----------------------------------------------------------------------------
-- CLINICAL RECORDS (written via save_medical_record RPC)
-- -----------------------------------------------------------------------------
create policy "records: read own / treating doctor / admin"
  on public.medical_records for select to authenticated
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.is_admin());

create policy "records: author doctor update"
  on public.medical_records for update to authenticated
  using (doctor_id = public.current_doctor_id() or public.is_admin())
  with check (doctor_id = public.current_doctor_id() or public.is_admin());

create policy "records: admin delete"
  on public.medical_records for delete to authenticated
  using (public.is_admin());

create policy "rx items: read via record"
  on public.prescription_items for select to authenticated
  using (exists (
    select 1 from public.medical_records r
    where r.id = record_id
      and (r.patient_id = auth.uid() or public.is_doctor_of(r.patient_id) or public.is_admin())
  ));

create policy "rx items: author doctor / admin write"
  on public.prescription_items for all to authenticated
  using (exists (
    select 1 from public.medical_records r
    where r.id = record_id and (r.doctor_id = public.current_doctor_id() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.medical_records r
    where r.id = record_id and (r.doctor_id = public.current_doctor_id() or public.is_admin())
  ));

-- -----------------------------------------------------------------------------
-- PERSONAL HEALTH DATA — owned by the patient, readable by treating doctors
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['vitals', 'conditions', 'allergies', 'medications']
  loop
    execute format($f$
      create policy "%1$s: owner full access" on public.%1$I
        for all to authenticated
        using (patient_id = auth.uid())
        with check (patient_id = auth.uid());
      create policy "%1$s: doctor/admin read" on public.%1$I
        for select to authenticated
        using (public.is_doctor_of(patient_id) or public.is_admin());
    $f$, t);
  end loop;
end;
$$;

-- Doctors can record allergies / conditions they discover
create policy "allergies: doctor add" on public.allergies
  for insert to authenticated with check (public.is_doctor_of(patient_id) or public.is_admin());
create policy "conditions: doctor add" on public.conditions
  for insert to authenticated with check (public.is_doctor_of(patient_id) or public.is_admin());
create policy "vitals: doctor add" on public.vitals
  for insert to authenticated with check (public.is_doctor_of(patient_id) or public.is_admin());

-- -----------------------------------------------------------------------------
-- LAB BOOKINGS & REPORTS
-- -----------------------------------------------------------------------------
create policy "lab bookings: read own / doctor / admin"
  on public.lab_bookings for select to authenticated
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.is_admin());
create policy "lab bookings: patient create"
  on public.lab_bookings for insert to authenticated
  with check (patient_id = auth.uid());
create policy "lab bookings: patient cancel"   -- guarded by trigger: only status → cancelled
  on public.lab_bookings for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "lab bookings: admin all"
  on public.lab_bookings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "reports: read own / doctor / admin"
  on public.medical_reports for select to authenticated
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.is_admin());
create policy "reports: upload own / doctor / admin"
  on public.medical_reports for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.is_admin())
  );
create policy "reports: delete own upload / admin"
  on public.medical_reports for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- PACKAGES
-- -----------------------------------------------------------------------------
create policy "package bookings: read own / admin"
  on public.package_bookings for select to authenticated
  using (patient_id = auth.uid() or public.is_admin());
create policy "package bookings: patient create"
  on public.package_bookings for insert to authenticated
  with check (patient_id = auth.uid());
create policy "package bookings: patient cancel"
  on public.package_bookings for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "package bookings: admin all"
  on public.package_bookings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- VACCINATIONS
-- -----------------------------------------------------------------------------
create policy "vaccinations: read own / doctor / admin"
  on public.vaccinations for select to authenticated
  using (patient_id = auth.uid() or public.is_doctor_of(patient_id) or public.is_admin());
create policy "vaccinations: patient create"
  on public.vaccinations for insert to authenticated
  with check (patient_id = auth.uid() and status in ('scheduled', 'completed'));
create policy "vaccinations: patient update"
  on public.vaccinations for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy "vaccinations: admin all"
  on public.vaccinations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS & AI
-- -----------------------------------------------------------------------------
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

create policy "ai: own history" on public.ai_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- REALTIME (live chat + live notification bell)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.appointment_messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
