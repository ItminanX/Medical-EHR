-- =============================================================================
-- MediCare+  ·  SEED DATA (demo catalog — safe to re-run)
-- Departments, doctors + weekly schedules, lab tests, health packages, vaccines.
-- =============================================================================

-- ---- Departments -----------------------------------------------------------
insert into public.departments (name, slug, description, icon) values
  ('Cardiology',           'cardiology',       'Heart and blood vessel care, ECG, echo and hypertension management.', 'heart-pulse'),
  ('Neurology',            'neurology',        'Brain, spine and nerve disorders including migraine, stroke and epilepsy.', 'brain'),
  ('Pediatrics',           'pediatrics',       'Complete healthcare for newborns, children and adolescents.', 'baby'),
  ('Orthopedics',          'orthopedics',      'Bones, joints, sports injuries and spine care.', 'bone'),
  ('Dermatology',          'dermatology',      'Skin, hair and nail conditions, allergy and cosmetic dermatology.', 'sparkles'),
  ('Gynecology & Obstetrics', 'gynecology',    'Women''s health, pregnancy care and fertility.', 'flower-2'),
  ('General Medicine',     'general-medicine', 'Primary care, fever, infections, diabetes and preventive check-ups.', 'stethoscope'),
  ('ENT',                  'ent',              'Ear, nose and throat care, sinus and hearing problems.', 'ear'),
  ('Psychiatry',           'psychiatry',       'Mental health, anxiety, depression, sleep and counselling.', 'smile'),
  ('Endocrinology',        'endocrinology',    'Diabetes, thyroid and hormonal disorders.', 'activity')
on conflict (slug) do update set description = excluded.description, icon = excluded.icon;

-- ---- Doctors ---------------------------------------------------------------
insert into public.doctors
  (full_name, title, gender, department_id, specialization, expertise, qualifications, experience_years, bio, languages, consultation_fee, video_fee, rating, review_count)
select v.full_name, v.title, v.gender, d.id, v.specialization, v.expertise, v.qualifications, v.experience_years, v.bio, v.languages, v.fee, v.video_fee, v.rating, v.reviews
from (values
  ('Dr. Farhana Rahman', 'Senior Consultant', 'female', 'cardiology', 'Interventional Cardiologist',
     array['Heart Surgery','Echocardiography','Angioplasty','Hypertension'], 'MBBS, FCPS (Medicine), MD (Cardiology)', 16,
     'Dr. Farhana leads our cardiac cath lab and has performed more than 3,000 angioplasties. She focuses on preventive cardiology and women''s heart health.',
     array['English','Bangla'], 1500, 1200, 4.9, 412),
  ('Dr. Tanvir Hossain', 'Consultant', 'male', 'cardiology', 'Clinical Cardiologist',
     array['Echocardiography','Heart Failure','Arrhythmia'], 'MBBS, MD (Cardiology)', 9,
     'Specialist in heart failure clinics and rhythm disorders with a calm, detailed consultation style.',
     array['English','Bangla'], 1200, 1000, 4.7, 188),
  ('Dr. Nusrat Jahan', 'Associate Professor', 'female', 'neurology', 'Neurologist',
     array['Migraine','Epilepsy','Stroke Care','EEG'], 'MBBS, FCPS (Medicine), MD (Neurology)', 14,
     'Runs the headache and epilepsy clinic. Passionate about early stroke recognition and rehabilitation.',
     array['English','Bangla','Hindi'], 1400, 1200, 4.8, 301),
  ('Dr. Imran Kabir', 'Consultant', 'male', 'pediatrics', 'Pediatrician & Neonatologist',
     array['Newborn Care','Child Nutrition','Vaccination','Asthma in Children'], 'MBBS, DCH, FCPS (Pediatrics)', 11,
     'Friendly pediatrician known for making kids comfortable. Special interest in growth, nutrition and immunisation.',
     array['English','Bangla'], 1000, 800, 4.9, 527),
  ('Dr. Shirin Akter', 'Senior Consultant', 'female', 'gynecology', 'Obstetrician & Gynecologist',
     array['High-risk Pregnancy','PCOS','Laparoscopic Surgery','Infertility'], 'MBBS, FCPS (Obs & Gynae), MS', 18,
     'Over 18 years of experience in maternal care and minimally invasive gynecological surgery.',
     array['English','Bangla'], 1500, 1200, 4.8, 466),
  ('Dr. Mahmudul Hasan', 'Consultant', 'male', 'orthopedics', 'Orthopedic Surgeon',
     array['Joint Replacement','Sports Injury','Arthroscopy','Back Pain'], 'MBBS, MS (Orthopedics), AO Fellow', 12,
     'Sports medicine and joint replacement specialist; team doctor for several national athletes.',
     array['English','Bangla'], 1300, 1000, 4.7, 233),
  ('Dr. Sadia Islam', 'Consultant', 'female', 'dermatology', 'Dermatologist',
     array['Acne','Eczema & Psoriasis','Hair Loss','Laser Therapy'], 'MBBS, DDV, FCPS (Dermatology)', 8,
     'Evidence-based skin care for all ages with a focus on chronic conditions and cosmetic dermatology.',
     array['English','Bangla'], 1000, 800, 4.8, 359),
  ('Dr. Rakibul Islam', 'Medical Officer', 'male', 'general-medicine', 'General Physician',
     array['Fever & Infections','Diabetes','Hypertension','Health Check-ups'], 'MBBS, CCD, FCPS (Part II)', 7,
     'Your first point of contact for everyday health problems, chronic disease follow-ups and preventive care.',
     array['English','Bangla'], 700, 500, 4.6, 612),
  ('Dr. Ayesha Siddiqua', 'Consultant', 'female', 'general-medicine', 'Internal Medicine Specialist',
     array['Diabetes','Thyroid','Infectious Disease','Geriatric Care'], 'MBBS, FCPS (Medicine)', 10,
     'Internal medicine specialist with special interest in managing multiple chronic conditions.',
     array['English','Bangla'], 900, 700, 4.8, 284),
  ('Dr. Kamrul Ahsan', 'Associate Professor', 'male', 'ent', 'ENT Specialist & Head-Neck Surgeon',
     array['Sinusitis','Hearing Loss','Tonsillitis','Endoscopic Sinus Surgery'], 'MBBS, DLO, MS (ENT)', 15,
     'Endoscopic sinus and ear surgeon; also treats snoring and voice disorders.',
     array['English','Bangla'], 1100, 900, 4.7, 205),
  ('Dr. Mehnaz Chowdhury', 'Consultant', 'female', 'psychiatry', 'Psychiatrist',
     array['Anxiety','Depression','Sleep Disorders','Counselling'], 'MBBS, MD (Psychiatry)', 9,
     'Compassionate, confidential mental health care. Telemedicine-friendly for follow-ups.',
     array['English','Bangla'], 1200, 1000, 4.9, 178),
  ('Dr. Ashraful Alam', 'Senior Consultant', 'male', 'endocrinology', 'Endocrinologist & Diabetologist',
     array['Type 1 & 2 Diabetes','Thyroid Disorders','Obesity','Hormone Therapy'], 'MBBS, FCPS, MD (Endocrinology)', 17,
     'Heads the diabetes and metabolic centre. Strong believer in lifestyle-first treatment plans.',
     array['English','Bangla'], 1400, 1100, 4.8, 390)
) as v(full_name, title, gender, dept_slug, specialization, expertise, qualifications, experience_years, bio, languages, fee, video_fee, rating, reviews)
join public.departments d on d.slug = v.dept_slug
where not exists (select 1 from public.doctors x where x.full_name = v.full_name);

-- ---- Weekly schedules ------------------------------------------------------
-- Bangladesh week: Saturday–Thursday. Morning clinic (in person), evening clinic
-- (in person or video) on alternating days, plus Friday morning video clinics.
with docs as (
  select id, row_number() over (order by full_name) as rn from public.doctors
)
insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time, slot_minutes, mode)
select d.id, w.weekday, s.start_time, s.end_time, 20, s.mode
from docs d
cross join (values (0), (1), (2), (3), (4), (6)) as w(weekday)
cross join lateral (
  values
    ('09:30'::time, '13:00'::time, 'in_person'::text, true),
    ('17:00'::time, '20:00'::time, 'both'::text, ((w.weekday + d.rn) % 2 = 0))
) as s(start_time, end_time, mode, enabled)
where s.enabled
on conflict (doctor_id, weekday, start_time) do nothing;

insert into public.doctor_schedules (doctor_id, weekday, start_time, end_time, slot_minutes, mode)
select id, 5, '10:00', '12:00', 20, 'video'
from public.doctors
where offers_video
on conflict (doctor_id, weekday, start_time) do nothing;

-- ---- Lab tests ---------------------------------------------------------------
insert into public.lab_tests (name, code, category, description, preparation, sample_type, turnaround_hours, price, home_collection) values
  ('Complete Blood Count (CBC)', 'CBC', 'Hematology', 'Measures red cells, white cells, hemoglobin and platelets.', 'No special preparation needed.', 'Blood', 6, 400, true),
  ('Lipid Profile', 'LIPID', 'Biochemistry', 'Total cholesterol, LDL, HDL and triglycerides.', 'Fast for 10–12 hours. Water is allowed.', 'Blood', 12, 1200, true),
  ('HbA1c', 'HBA1C', 'Diabetes', 'Average blood sugar over the last 3 months.', 'No fasting needed.', 'Blood', 12, 1100, true),
  ('Fasting Blood Sugar (FBS)', 'FBS', 'Diabetes', 'Blood glucose after overnight fasting.', 'Fast for 8–10 hours.', 'Blood', 4, 200, true),
  ('Thyroid Profile (TSH, FT3, FT4)', 'THYROID', 'Hormones', 'Checks thyroid gland function.', 'Morning sample preferred.', 'Blood', 24, 1800, true),
  ('Liver Function Test (LFT)', 'LFT', 'Biochemistry', 'Bilirubin, SGPT, SGOT, ALP and albumin.', 'Fast for 8 hours.', 'Blood', 12, 1300, true),
  ('Kidney Function (Creatinine, Urea, Electrolytes)', 'KFT', 'Biochemistry', 'Evaluates how well your kidneys are working.', 'No special preparation.', 'Blood', 12, 1000, true),
  ('Urine Routine Examination', 'URINE-RE', 'Pathology', 'Screens for infection, kidney disease and diabetes.', 'First morning sample preferred.', 'Urine', 6, 300, true),
  ('Vitamin D (25-OH)', 'VITD', 'Vitamins', 'Measures vitamin D levels for bone and immune health.', 'No special preparation.', 'Blood', 48, 2500, true),
  ('Dengue NS1 Antigen', 'DENGUE-NS1', 'Serology', 'Early detection of dengue infection (day 1–5 of fever).', 'No preparation needed.', 'Blood', 6, 500, true),
  ('Chest X-Ray (PA view)', 'CXR', 'Imaging', 'Images of lungs, heart and chest wall.', 'Remove metal objects. Inform staff if pregnant.', 'Imaging', 4, 600, false),
  ('ECG (12-lead)', 'ECG', 'Cardiac', 'Records the electrical activity of the heart.', 'Avoid heavy exercise before the test.', 'Non-invasive', 1, 400, false),
  ('Ultrasonography — Whole Abdomen', 'USG-WA', 'Imaging', 'Ultrasound of liver, gallbladder, kidneys, pancreas and more.', 'Fast for 6 hours; full bladder required.', 'Imaging', 2, 2000, false),
  ('Echocardiogram (2D Echo)', 'ECHO', 'Cardiac', 'Ultrasound of the heart''s structure and pumping function.', 'No special preparation.', 'Imaging', 2, 3000, false)
on conflict (code) do update set price = excluded.price, description = excluded.description;

-- ---- Health packages --------------------------------------------------------
insert into public.health_packages (name, slug, tagline, description, category, price, original_price, includes, ideal_for, is_featured) values
  ('Essential Health Check', 'essential', 'A smart yearly baseline',
     'A quick, affordable annual screening covering the most important markers.', 'General', 2999, 4200,
     array['CBC','Fasting Blood Sugar','Lipid Profile','Urine Routine','Serum Creatinine','Doctor consultation'],
     'Adults 18–35 with no known conditions', false),
  ('Executive Health Check', 'executive', 'Our most popular full-body check-up',
     'Comprehensive screening for busy professionals including cardiac, liver, kidney and thyroid function.', 'General', 7999, 11500,
     array['CBC','HbA1c','Lipid Profile','LFT','KFT','Thyroid Profile','Vitamin D','ECG','Chest X-Ray','USG Whole Abdomen','Specialist consultation','Diet counselling'],
     'Adults 30+ and corporate employees', true),
  ('Heart Care Package', 'heart-care', 'Know your heart, protect your future',
     'Focused cardiac risk assessment with cardiologist review.', 'Cardiac', 5999, 8000,
     array['ECG','2D Echo','Lipid Profile','HbA1c','Serum Creatinine','Cardiologist consultation'],
     'People with hypertension, diabetes, smoking history or family history of heart disease', true),
  ('Diabetes Care Package', 'diabetes-care', 'Complete diabetes monitoring',
     'Track sugar control and screen for complications every 3–6 months.', 'Diabetes', 3999, 5500,
     array['FBS','HbA1c','Lipid Profile','Serum Creatinine','Urine Microalbumin','Endocrinologist consultation','Diet plan'],
     'People living with diabetes or pre-diabetes', false),
  ('Women''s Wellness', 'womens-wellness', 'Designed around women''s health',
     'Hormonal, bone and cancer screening tailored for women.', 'Women', 6499, 9000,
     array['CBC','Thyroid Profile','Vitamin D','Pap Smear','USG Lower Abdomen','Breast examination','Gynecologist consultation'],
     'Women 25+', true),
  ('Senior Citizen Care', 'senior-care', 'Gentle, thorough care for 60+',
     'Extended screening for age-related conditions with geriatric review.', 'Senior', 8999, 12500,
     array['CBC','HbA1c','Lipid Profile','LFT','KFT','Thyroid Profile','Vitamin D','ECG','Chest X-Ray','Bone density scan','Eye check-up','Physician consultation'],
     'Adults aged 60 and above', false)
on conflict (slug) do update set price = excluded.price, includes = excluded.includes, original_price = excluded.original_price;

-- ---- Vaccines -----------------------------------------------------------------
insert into public.vaccines (name, disease, description, doses_required, dose_interval_days, recommended_for, price) values
  ('Hepatitis B',           'Hepatitis B',             'Protects against hepatitis B liver infection.', 3, 30,  'All adults not previously vaccinated; healthcare workers', 600),
  ('Influenza (Flu)',       'Seasonal influenza',      'Yearly flu shot updated for the current season.', 1, 0, 'Everyone 6 months+, especially elderly and pregnant women', 1500),
  ('Typhoid Conjugate',     'Typhoid fever',           'Single-dose protection against typhoid.', 1, 0, 'Children 6 months+ and adults', 1200),
  ('HPV (Gardasil 9)',      'Human papillomavirus',    'Prevents cervical and other HPV-related cancers.', 3, 60, 'Girls and boys 9–26 years', 6500),
  ('MMR',                   'Measles, Mumps, Rubella', 'Combined vaccine for measles, mumps and rubella.', 2, 28, 'Children and non-immune adults', 900),
  ('Tetanus-diphtheria (Td)', 'Tetanus & Diphtheria',  'Booster every 10 years or after a deep wound.', 1, 0, 'Adults; pregnant women', 300),
  ('Pneumococcal (PCV13)',  'Pneumonia',               'Protects against pneumococcal pneumonia and meningitis.', 1, 0, 'Adults 65+ and people with chronic illness', 4500),
  ('Chickenpox (Varicella)', 'Chickenpox',             'Two-dose protection against chickenpox.', 2, 28, 'Children 12 months+ and non-immune adults', 2800),
  ('Hepatitis A',           'Hepatitis A',             'Protects against food and water-borne hepatitis A.', 2, 180, 'Children 1 year+ and travellers', 2200),
  ('Rabies (post-exposure)', 'Rabies',                 'Post-exposure course after an animal bite.', 4, 7, 'Anyone bitten or scratched by an animal', 700),
  ('COVID-19 Booster',      'COVID-19',                'Updated booster dose.', 1, 0, 'Adults, especially 60+ and immunocompromised', 0)
on conflict (name) do update set description = excluded.description, price = excluded.price;
