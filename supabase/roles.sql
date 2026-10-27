-- =============================================================================
-- MediCare+  ·  ROLE MANAGEMENT HELPERS
-- Run these in the Supabase SQL editor after you have signed up in the app.
-- =============================================================================

-- 1) Make yourself an ADMIN (replace the email):
update public.profiles set role = 'admin' where email = 'you@example.com';

-- 2) Turn an existing user into a DOCTOR and link them to a doctor listing.
--    (You can also do this from the app: Admin → Doctors → "Link account".)
--
-- update public.profiles set role = 'doctor' where email = 'doctor@example.com';
-- update public.doctors
--    set profile_id = (select id from public.profiles where email = 'doctor@example.com')
--  where full_name = 'Dr. Farhana Rahman';

-- 3) Check roles
-- select email, full_name, role, mrn from public.profiles order by created_at desc;
