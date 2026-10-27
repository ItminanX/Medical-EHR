'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarCheck,
  Clock,
  Video,
  Activity,
  FileText,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Package,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile, Appointment, Vital, MedicalRecord } from '@/types/database';

export default function DashboardPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Profile
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (prof) setProfile(prof as Profile);

          // Upcoming Appointments
          const { data: appts } = await supabase
            .from('appointments')
            .select(`
              *,
              doctor:doctors (
                id,
                full_name,
                title,
                specialization,
                avatar_url,
                department:departments (name)
              )
            `)
            .eq('patient_id', user.id)
            .neq('status', 'cancelled')
            .order('appointment_date', { ascending: true })
            .limit(5);

          if (appts) setAppointments(appts as any);

          // Latest Vitals
          const { data: vts } = await supabase
            .from('vitals')
            .select('*')
            .eq('patient_id', user.id)
            .order('recorded_at', { ascending: false })
            .limit(4);

          if (vts) setVitals(vts as Vital[]);

          // Medical Records
          const { data: recs } = await supabase
            .from('medical_records')
            .select(`
              *,
              doctor:doctors (full_name, specialization)
            `)
            .eq('patient_id', user.id)
            .order('visit_date', { ascending: false })
            .limit(3);

          if (recs) setRecords(recs as any);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase]);

  // Derive latest vitals map
  const bpVital = vitals.find((v) => v.type === 'blood_pressure');
  const hrVital = vitals.find((v) => v.type === 'heart_rate');
  const sugarVital = vitals.find((v) => v.type === 'blood_sugar');
  const weightVital = vitals.find((v) => v.type === 'weight');

  const upcomingAppt = appointments[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Banner / Welcome Header */}
      <div
        className="glass-panel"
        style={{
          padding: '36px',
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '720px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: '#67e8f9',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} />
            <span>Patient Health Portal</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', color: '#fff', marginBottom: '10px' }}>
            Welcome back, {profile?.full_name || 'Patient'}!
          </h1>
          <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '24px' }}>
            Track your consultations, view official hospital EHR prescriptions, log personal health vitals,
            and connect with certified doctors anytime.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link href="/appointments" className="btn btn-primary">
              <CalendarCheck size={18} />
              <span>Book Appointment</span>
            </Link>
            <Link href="/telemedicine" className="btn btn-outline-cyan">
              <Video size={18} />
              <span>Start Telemedicine</span>
            </Link>
            <Link href="/my-health" className="btn btn-secondary">
              <Activity size={18} />
              <span>My Health & Records</span>
            </Link>
          </div>
        </div>

        {/* Ambient background glow ring */}
        <div
          style={{
            position: 'absolute',
            right: '-60px',
            top: '-60px',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25), transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Health Vitals Quick Overview */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', color: '#fff' }}>Health Vitals Summary</h3>
          <Link href="/my-health?tab=vitals" style={{ color: '#06b6d4', fontSize: '13px', fontWeight: 600 }}>
            View all vitals →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Blood Pressure */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Blood Pressure</span>
              <HeartPulse size={18} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {bpVital ? `${bpVital.value}/${bpVital.value2 || 80}` : '120/80'}
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>mmHg</span>
            </div>
            <span className="badge badge-emerald" style={{ marginTop: '10px' }}>
              Normal Range
            </span>
          </div>

          {/* Heart Rate */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f43f5e', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Heart Rate</span>
              <Activity size={18} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {hrVital ? hrVital.value : '72'}
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>bpm</span>
            </div>
            <span className="badge badge-emerald" style={{ marginTop: '10px' }}>
              Optimal
            </span>
          </div>

          {/* Blood Sugar */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Blood Sugar (FBS)</span>
              <TrendingUp size={18} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {sugarVital ? sugarVital.value : '5.4'}
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>mmol/L</span>
            </div>
            <span className="badge badge-cyan" style={{ marginTop: '10px' }}>
              Fasting
            </span>
          </div>

          {/* Body Weight */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Weight</span>
              <Activity size={18} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
              {weightVital ? weightVital.value : '68.5'}
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>kg</span>
            </div>
            <span className="badge badge-violet" style={{ marginTop: '10px' }}>
              BMI 22.4 (Healthy)
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Consultations & Clinical Records */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Next Scheduled Consultation */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>Next Consultation</h3>
            <Link href="/appointments" style={{ color: '#06b6d4', fontSize: '12px', fontWeight: 600 }}>
              All appointments ({appointments.length})
            </Link>
          </div>

          {upcomingAppt ? (
            <div
              style={{
                flex: 1,
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '20px',
                      }}
                    >
                      👨‍⚕️
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', color: '#fff' }}>
                        {upcomingAppt.doctor?.full_name || 'Dr. Farhana Rahman'}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {upcomingAppt.doctor?.specialization || 'Cardiology Specialist'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${upcomingAppt.type === 'video' ? 'badge-cyan' : 'badge-emerald'}`}
                  >
                    {upcomingAppt.type === 'video' ? 'Video Telemedicine' : 'In-Person Clinic'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginTop: '20px',
                    padding: '12px',
                    background: 'rgba(2, 132, 199, 0.08)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '13px' }}>
                    <Calendar size={16} />
                    <span>{new Date(upcomingAppt.appointment_date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '13px' }}>
                    <Clock size={16} />
                    <span>{upcomingAppt.start_time.substring(0, 5)}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                {upcomingAppt.type === 'video' ? (
                  <Link
                    href={`/telemedicine?room=${upcomingAppt.meeting_room || 'general'}`}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    <Video size={16} />
                    <span>Join Video Room</span>
                  </Link>
                ) : (
                  <Link href="/appointments" className="btn btn-secondary" style={{ flex: 1 }}>
                    <span>View Directions & Slip</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <Calendar size={36} style={{ color: '#475569', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>No Upcoming Consultations</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' }}>
                Select an expert doctor to schedule your next in-person or video checkup.
              </p>
              <Link href="/appointments" className="btn btn-primary" style={{ fontSize: '13px' }}>
                Book Now
              </Link>
            </div>
          )}
        </div>

        {/* Recent Hospital Prescriptions & Clinical Records */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '17px', color: '#fff' }}>Latest Hospital Records & Rx</h3>
            <Link href="/my-health?tab=records" style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
              View all records →
            </Link>
          </div>

          {records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {records.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/my-health?recordId=${rec.id}`}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'var(--transition)',
                  }}
                  className="glass-interactive"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{rec.diagnosis}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        Prescribed by {rec.doctor?.full_name || 'Hospital Consultant'}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(rec.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                  {rec.advice && (
                    <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '8px', fontStyle: 'italic' }}>
                      "{rec.advice.substring(0, 90)}..."
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <FileText size={36} style={{ color: '#475569', marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>No Hospital Records Yet</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                Your prescriptions and doctor consultation notes will automatically appear here after visits.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Services Quick Navigation */}
      <div>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Quick Health Services</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <Link href="/doctors" className="glass-panel glass-interactive" style={{ padding: '20px' }}>
            <div style={{ color: '#38bdf8', marginBottom: '12px' }}>
              <Stethoscope size={28} />
            </div>
            <h4 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Find a Specialist</h4>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              12+ board-certified doctors across Cardiology, Neurology, Pediatrics, and more.
            </p>
          </Link>

          <Link href="/tests" className="glass-panel glass-interactive" style={{ padding: '20px' }}>
            <div style={{ color: '#10b981', marginBottom: '12px' }}>
              <FileText size={28} />
            </div>
            <h4 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Book Pathology & Lab</h4>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              CBC, Lipid profile, HbA1c, and home sample collection available.
            </p>
          </Link>

          <Link href="/packages" className="glass-panel glass-interactive" style={{ padding: '20px' }}>
            <div style={{ color: '#f59e0b', marginBottom: '12px' }}>
              <Package size={28} />
            </div>
            <h4 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Full Health Packages</h4>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Annual checkups, Executive screening, and Heart packages at discounted rates.
            </p>
          </Link>

          <Link href="/vaccination" className="glass-panel glass-interactive" style={{ padding: '20px' }}>
            <div style={{ color: '#8b5cf6', marginBottom: '12px' }}>
              <ShieldCheck size={28} />
            </div>
            <h4 style={{ fontSize: '16px', color: '#fff', marginBottom: '4px' }}>Immunisation Schedule</h4>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Track doses for Hepatitis, Flu, HPV, and COVID boosters with reminders.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
