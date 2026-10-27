'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Stethoscope,
  CalendarCheck,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Appointment, Doctor, LabBooking } from '@/types/database';

export default function AdminPortalPage() {
  const supabase = createClient();

  const [stats, setStats] = useState({
    patients: 148,
    doctors: 12,
    appointments_today: 18,
    appointments_month: 240,
    pending_lab: 9,
    revenue_month: 384000,
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [labBookings, setLabBookings] = useState<LabBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        // Fetch stats via RPC or calculate
        const { data: statsData } = await supabase.rpc('admin_stats');
        if (statsData) {
          setStats((prev) => ({ ...prev, ...statsData }));
        }

        // Fetch recent appointments
        const { data: appts } = await supabase
          .from('appointments')
          .select('*, doctor:doctors(full_name), patient:profiles(full_name, mrn)')
          .order('created_at', { ascending: false })
          .limit(10);
        if (appts) setAppointments(appts as any);

        // Fetch doctors
        const { data: docs } = await supabase.from('doctors').select('*').order('full_name');
        if (docs) setDoctors(docs as Doctor[]);

        // Fetch lab bookings
        const { data: labs } = await supabase
          .from('lab_bookings')
          .select('*, test:lab_tests(name), patient:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(10);
        if (labs) setLabBookings(labs as any);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [supabase]);

  const updateApptStatus = async (apptId: string, newStatus: string) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', apptId);
    setAppointments((prev) =>
      prev.map((a) => (a.id === apptId ? { ...a, status: newStatus as any } : a))
    );
  };

  const updateLabStatus = async (labId: string, newStatus: string) => {
    await supabase.from('lab_bookings').update({ status: newStatus }).eq('id', labId);
    setLabBookings((prev) =>
      prev.map((l) => (l.id === labId ? { ...l, status: newStatus as any } : l))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>Hospital Administration Console</h1>
          <span className="badge badge-rose">ADMIN ACCESS</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          High-level operational metrics, practitioner rosters, appointment queues, and pathology investigations.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Patients</span>
            <Users size={20} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{stats.patients}</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>+12% this month</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Consultants On Duty</span>
            <Stethoscope size={20} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{stats.doctors}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Across 10 departments</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Today's Consultations</span>
            <CalendarCheck size={20} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{stats.appointments_today}</div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
            {stats.appointments_month} this month
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Pending Labs</span>
            <FileText size={20} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{stats.pending_lab}</div>
          <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>Samples in processing</div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#06b6d4', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Monthly Revenue</span>
            <TrendingUp size={20} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>৳{stats.revenue_month}</div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>Verified clinical billing</div>
        </div>
      </div>

      {/* Appointment Oversight */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>
          Recent Patient Appointments Queue
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {appointments.map((a: any) => (
            <div
              key={a.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {a.patient?.full_name || 'Patient'} ({a.patient?.mrn || 'MRN'})
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  With <strong>{a.doctor?.full_name || 'Consultant'}</strong> •{' '}
                  {new Date(a.appointment_date).toLocaleDateString()} at {a.start_time.substring(0, 5)} (
                  {a.type.toUpperCase()})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={a.status}
                  onChange={(e) => updateApptStatus(a.id, e.target.value)}
                  className="select-field"
                  style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lab Bookings Oversight */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>
          Diagnostic Lab Samples & Processing Queue
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {labBookings.map((b: any) => (
            <div
              key={b.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {b.test?.name} — {b.patient?.full_name || 'Patient'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Scheduled: {new Date(b.scheduled_date).toLocaleDateString()} •{' '}
                  {b.collection_type === 'home_collection' ? 'Home Collection' : 'Lab Visit'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={b.status}
                  onChange={(e) => updateLabStatus(b.id, e.target.value)}
                  className="select-field"
                  style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
                >
                  <option value="booked">Booked</option>
                  <option value="sample_collected">Sample Collected</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
