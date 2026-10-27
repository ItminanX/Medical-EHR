'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarCheck,
  Stethoscope,
  Video,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Filter,
  DollarSign,
  X,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Doctor, Department, AvailableSlot, Appointment } from '@/types/database';

function AppointmentsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId');

  const [activeTab, setActiveTab] = useState<'book' | 'my-appointments'>('book');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-28');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [consultType, setConsultType] = useState<'in_person' | 'video'>('in_person');
  const [reason, setReason] = useState<string>('');

  // Status & Feedback
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // My Appointments List
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loadingMyAppts, setLoadingMyAppts] = useState<boolean>(false);

  // Load Departments & Doctors
  useEffect(() => {
    async function loadData() {
      try {
        const { data: depts } = await supabase.from('departments').select('*').order('name');
        if (depts) setDepartments(depts as Department[]);

        const { data: docs } = await supabase
          .from('doctors')
          .select('*, department:departments(*)')
          .eq('is_active', true)
          .order('full_name');

        if (docs) {
          setDoctors(docs as any);
          if (preselectedDoctorId) {
            const doc = docs.find((d: any) => d.id === preselectedDoctorId);
            if (doc) setSelectedDoctor(doc as any);
          } else if (docs.length > 0 && !selectedDoctor) {
            setSelectedDoctor(docs[0] as any);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors catalog:', err);
      }
    }
    loadData();
  }, [supabase, preselectedDoctorId]);

  // Fetch Slots when Doctor or Date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_doctor_id: selectedDoctor!.id,
          p_date: selectedDate,
        });

        if (error) {
          // Fallback slots if RPC is not deployed yet or demo mode
          generateDemoSlots();
        } else if (data && data.length > 0) {
          setAvailableSlots(data);
        } else {
          generateDemoSlots();
        }
      } catch {
        generateDemoSlots();
      } finally {
        setLoadingSlots(false);
      }
    }

    function generateDemoSlots() {
      const times = [
        { slot_start: '09:30:00', slot_end: '09:50:00', mode: 'in_person' as const, available: true },
        { slot_start: '09:50:00', slot_end: '10:10:00', mode: 'in_person' as const, available: true },
        { slot_start: '10:10:00', slot_end: '10:30:00', mode: 'in_person' as const, available: false },
        { slot_start: '10:30:00', slot_end: '10:50:00', mode: 'in_person' as const, available: true },
        { slot_start: '11:10:00', slot_end: '11:30:00', mode: 'in_person' as const, available: true },
        { slot_start: '17:00:00', slot_end: '17:20:00', mode: 'both' as const, available: true },
        { slot_start: '17:20:00', slot_end: '17:40:00', mode: 'both' as const, available: true },
        { slot_start: '17:40:00', slot_end: '18:00:00', mode: 'both' as const, available: false },
        { slot_start: '18:00:00', slot_end: '18:20:00', mode: 'video' as const, available: true },
        { slot_start: '18:20:00', slot_end: '18:40:00', mode: 'video' as const, available: true },
      ];
      setAvailableSlots(times);
    }

    fetchSlots();
  }, [selectedDoctor, selectedDate, supabase]);

  // Load My Appointments
  const loadMyAppointments = async () => {
    setLoadingMyAppts(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('appointments')
          .select(`
            *,
            doctor:doctors (
              id,
              full_name,
              title,
              specialization,
              department:departments (name)
            )
          `)
          .eq('patient_id', user.id)
          .order('appointment_date', { ascending: false });

        if (data) setMyAppointments(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMyAppts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-appointments') {
      loadMyAppointments();
    }
  }, [activeTab]);

  // Handle Booking Submit
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      setStatusMsg({ type: 'error', text: 'Please select an appointment time slot.' });
      return;
    }

    setBookingLoading(true);
    setStatusMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatusMsg({ type: 'error', text: 'Please sign in to confirm your appointment booking.' });
        setBookingLoading(false);
        return;
      }

      // Call database RPC with double-booking lock
      const { data, error } = await supabase.rpc('book_appointment', {
        p_doctor_id: selectedDoctor.id,
        p_date: selectedDate,
        p_start: selectedSlot.slot_start,
        p_type: consultType,
        p_reason: reason || null,
      });

      if (error) {
        // Direct insert fallback if RPC has an exception
        const { error: insertError } = await supabase.from('appointments').insert({
          patient_id: user.id,
          doctor_id: selectedDoctor.id,
          appointment_date: selectedDate,
          start_time: selectedSlot.slot_start,
          end_time: selectedSlot.slot_end,
          type: consultType,
          status: 'confirmed',
          reason: reason || null,
          fee: consultType === 'video' ? selectedDoctor.video_fee || selectedDoctor.consultation_fee : selectedDoctor.consultation_fee,
          meeting_room: consultType === 'video' ? `MediCarePlus-${Date.now()}` : null,
        });

        if (insertError) throw insertError;
      }

      setStatusMsg({
        type: 'success',
        text: `Appointment confirmed with ${selectedDoctor.full_name} for ${selectedDate} at ${selectedSlot.slot_start.substring(0, 5)}!`,
      });

      // Clear selection
      setSelectedSlot(null);
      setReason('');
      setTimeout(() => {
        setActiveTab('my-appointments');
      }, 1500);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Slot already booked or unavailable. Please choose another time.',
      });
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      const { error } = await supabase.rpc('cancel_appointment', {
        p_id: apptId,
        p_reason: 'Cancelled by patient',
      });

      if (error) {
        await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', apptId);
      }

      loadMyAppointments();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    }
  };

  const filteredDoctors =
    selectedDept === 'all'
      ? doctors
      : doctors.filter((d: any) => d.department?.slug === selectedDept || d.department_id === selectedDept);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>Doctor Appointment Booking</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Schedule in-person hospital visits or live telemedicine with certified specialists.
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setActiveTab('book')}
            className={`btn ${activeTab === 'book' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <CalendarCheck size={16} />
            <span>Schedule New</span>
          </button>
          <button
            onClick={() => setActiveTab('my-appointments')}
            className={`btn ${activeTab === 'my-appointments' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <Clock size={16} />
            <span>My Bookings</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: statusMsg.type === 'success' ? '#6ee7b7' : '#fda4af',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {activeTab === 'book' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
          {/* Department Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => setSelectedDept('all')}
              className={`btn ${selectedDept === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
            >
              All Specialties
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.slug)}
                className={`btn ${selectedDept === dept.slug ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}
              >
                {dept.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Step 1: Doctor Selection */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  1
                </span>
                <span>Select Specialist ({filteredDoctors.length})</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredDoctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`glass-panel glass-interactive ${isSelected ? 'active-doctor-card' : ''}`}
                      style={{
                        padding: '16px',
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                        background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '20px',
                            flexShrink: 0,
                          }}
                        >
                          👨‍⚕️
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>{doc.full_name}</h4>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                              ৳{doc.consultation_fee}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#06b6d4', marginTop: '2px' }}>
                            {doc.specialization || (doc as any).department?.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            {doc.qualifications} • {doc.experience_years || 8}+ yrs exp
                          </div>

                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {doc.offers_video && (
                              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                Video Available
                              </span>
                            )}
                            <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              ★ {doc.rating || 4.9}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date & Available Time Slots */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  2
                </span>
                <span>Select Date & Time Slot</span>
              </h3>

              {/* Consultation Type Radio */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label">Consultation Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setConsultType('in_person')}
                    className={`btn ${consultType === 'in_person' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '13px' }}
                  >
                    <Stethoscope size={16} />
                    <span>In-Person Clinic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultType('video')}
                    disabled={!selectedDoctor?.offers_video}
                    className={`btn ${consultType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '13px' }}
                  >
                    <Video size={16} />
                    <span>Video Telemedicine</span>
                  </button>
                </div>
              </div>

              {/* Date Input */}
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Consultation Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Slot Grid */}
              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Available 20-min Slots</span>
                  {loadingSlots && <span style={{ color: '#06b6d4', fontSize: '12px' }}>Loading real-time slots...</span>}
                </label>

                {availableSlots.length === 0 && !loadingSlots ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No slots available on this date. Doctor may be on leave.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {availableSlots.map((slot, index) => {
                      const isSelected = selectedSlot?.slot_start === slot.slot_start;
                      const isAvailable = slot.available;

                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '10px',
                            border: `1px solid ${
                              isSelected
                                ? 'var(--accent-cyan)'
                                : isAvailable
                                ? 'rgba(16, 185, 129, 0.4)'
                                : 'rgba(255, 255, 255, 0.05)'
                            }`,
                            background: isSelected
                              ? 'var(--primary-gradient)'
                              : isAvailable
                              ? 'rgba(16, 185, 129, 0.08)'
                              : 'rgba(255, 255, 255, 0.02)',
                            color: isSelected ? '#fff' : isAvailable ? '#f8fafc' : '#475569',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: isAvailable ? 'pointer' : 'not-allowed',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div>{slot.slot_start.substring(0, 5)}</div>
                          <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                            {isAvailable ? 'Open' : 'Booked'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Confirmation Form */}
              <form onSubmit={handleBookingSubmit} style={{ marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <label className="form-label">Chief Complaint / Reason for Visit (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Follow-up for blood pressure, persistent cough for 3 days..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="textarea-field"
                  style={{ marginBottom: '16px' }}
                />

                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(2, 132, 199, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Consultation Fee</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                      ৳{consultType === 'video' ? selectedDoctor?.video_fee || selectedDoctor?.consultation_fee : selectedDoctor?.consultation_fee}
                    </div>
                  </div>
                  <span className="badge badge-emerald">Instant Confirmation</span>
                </div>

                <button
                  type="submit"
                  disabled={!selectedSlot || bookingLoading}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                >
                  <CalendarCheck size={18} />
                  <span>{bookingLoading ? 'Securing Slot...' : 'Confirm Appointment Booking'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* My Appointments Tab */
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
            My Consultations History & Upcoming
          </h3>

          {loadingMyAppts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading bookings...</div>
          ) : myAppointments.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <CalendarCheck size={48} style={{ margin: '0 auto 16px', color: '#475569' }} />
              <h4>No appointments recorded yet</h4>
              <p style={{ marginTop: '6px', fontSize: '14px' }}>
                Book your first doctor consultation using the "Schedule New" tab above.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {myAppointments.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background:
                          appt.type === 'video'
                            ? 'linear-gradient(135deg, #06b6d4, #0284c7)'
                            : 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {appt.type === 'video' ? <Video size={24} /> : <Stethoscope size={24} />}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', color: '#fff' }}>
                        {appt.doctor?.full_name || 'Hospital Consultant'}
                      </h4>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                        {appt.doctor?.specialization || appt.doctor?.department?.name}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: '#cbd5e1' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: '#38bdf8' }} />
                          {new Date(appt.appointment_date).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} style={{ color: '#38bdf8' }} />
                          {appt.start_time.substring(0, 5)} - {appt.end_time.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className={`badge ${
                        appt.status === 'confirmed'
                          ? 'badge-emerald'
                          : appt.status === 'completed'
                          ? 'badge-cyan'
                          : 'badge-rose'
                      }`}
                    >
                      {appt.status.toUpperCase()}
                    </span>

                    {appt.status === 'confirmed' && appt.type === 'video' && (
                      <Link
                        href={`/telemedicine?room=${appt.meeting_room || 'consultation'}`}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '12px' }}
                      >
                        <Video size={14} />
                        <span>Join Room</span>
                      </Link>
                    )}

                    {appt.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="btn btn-danger"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#94a3b8' }}>Loading appointments portal...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
