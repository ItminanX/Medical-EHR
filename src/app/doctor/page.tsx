'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  CalendarCheck,
  Video,
  FileText,
  User,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Appointment, Profile, Doctor } from '@/types/database';

export default function DoctorPortalPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Prescription Form State
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [medsList, setMedsList] = useState<Array<{ medicine: string; dosage: string; frequency: string; duration: string; instructions: string }>>([
    { medicine: '', dosage: '500mg', frequency: '1+0+1', duration: '7 days', instructions: 'After meal' },
  ]);
  const [savingRecord, setSavingRecord] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    async function loadDoctorAppointments() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Find doctor record linked to this user profile or list all active appointments
          const { data: docData } = await supabase.from('doctors').select('id').eq('profile_id', user.id).single();

          let query = supabase.from('appointments').select(`
            *,
            patient:profiles (*)
          `);

          if (docData) {
            query = query.eq('doctor_id', docData.id);
          }

          const { data: appts } = await query.order('appointment_date', { ascending: false });
          if (appts) setAppointments(appts as any);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctorAppointments();
  }, [supabase]);

  const handleOpenConsultation = (appt: Appointment) => {
    setSelectedAppt(appt);
    setChiefComplaint(appt.reason || '');
    setDiagnosis('');
    setClinicalNotes('');
    setAdvice('');
    setShowConsultModal(true);
  };

  const handleAddMedItem = () => {
    setMedsList((prev) => [
      ...prev,
      { medicine: '', dosage: '500mg', frequency: '1+0+1', duration: '5 days', instructions: 'After meal' },
    ]);
  };

  const handleRemoveMedItem = (index: number) => {
    setMedsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !diagnosis.trim()) {
      alert('Diagnosis is required to issue a medical record.');
      return;
    }

    setSavingRecord(true);
    setFeedback(null);

    try {
      const validItems = medsList.filter((m) => m.medicine.trim() !== '');

      const { data, error } = await supabase.rpc('save_medical_record', {
        p_patient_id: selectedAppt.patient_id,
        p_diagnosis: diagnosis.trim(),
        p_appointment_id: selectedAppt.id,
        p_doctor_id: selectedAppt.doctor_id,
        p_visit_date: new Date().toISOString().split('T')[0],
        p_visit_type: selectedAppt.type === 'video' ? 'telemedicine' : 'outpatient',
        p_chief_complaint: chiefComplaint || null,
        p_clinical_notes: clinicalNotes || null,
        p_advice: advice || null,
        p_follow_up_date: followUpDate || null,
        p_vitals: {},
        p_items: validItems,
      });

      if (error) {
        // Direct table insert fallback if RPC has an exception
        const { data: recData, error: recError } = await supabase
          .from('medical_records')
          .insert({
            patient_id: selectedAppt.patient_id,
            doctor_id: selectedAppt.doctor_id,
            appointment_id: selectedAppt.id,
            diagnosis: diagnosis.trim(),
            chief_complaint: chiefComplaint || null,
            clinical_notes: clinicalNotes || null,
            advice: advice || null,
            follow_up_date: followUpDate || null,
            visit_date: new Date().toISOString().split('T')[0],
            visit_type: selectedAppt.type === 'video' ? 'telemedicine' : 'outpatient',
          })
          .select()
          .single();

        if (recError) throw recError;

        if (recData && validItems.length > 0) {
          const insertItems = validItems.map((item, idx) => ({
            record_id: recData.id,
            medicine: item.medicine,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            position: idx,
          }));
          await supabase.from('prescription_items').insert(insertItems);
        }

        await supabase.from('appointments').update({ status: 'completed' }).eq('id', selectedAppt.id);
      }

      setFeedback({ type: 'success', text: 'Clinical record and prescription saved successfully!' });
      setShowConsultModal(false);

      // Refresh appointments list
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedAppt.id ? { ...a, status: 'completed' } : a))
      );
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save record.' });
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>Doctor Practitioner Console</h1>
          <span className="badge badge-emerald">DOCTOR MODE</span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Manage patient queue, launch video consultations, and issue verified electronic prescriptions.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: feedback.type === 'success' ? '#6ee7b7' : '#fda4af',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Patients Queue List */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
          Patient Consultations Schedule ({appointments.length})
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading consultations...</div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <CalendarCheck size={48} style={{ margin: '0 auto 16px', color: '#475569' }} />
            <h4>No scheduled consultations</h4>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>
              When patients book appointments, they will populate here immediately.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {appointments.map((appt) => (
              <div
                key={appt.id}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
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
                      background: 'linear-gradient(135deg, #0284c7, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      color: '#fff',
                    }}
                  >
                    👤
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', color: '#fff' }}>
                      {appt.patient?.full_name || 'Patient User'}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      MRN: {appt.patient?.mrn || 'MC26001048'} •{' '}
                      {appt.patient?.gender ? appt.patient.gender.toUpperCase() : 'MALE'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
                      {new Date(appt.appointment_date).toLocaleDateString()} at {appt.start_time.substring(0, 5)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    className={`badge ${
                      appt.status === 'completed'
                        ? 'badge-emerald'
                        : appt.status === 'confirmed'
                        ? 'badge-cyan'
                        : 'badge-rose'
                    }`}
                  >
                    {appt.status.toUpperCase()}
                  </span>

                  {appt.type === 'video' && appt.status === 'confirmed' && (
                    <Link
                      href={`/telemedicine?room=${appt.meeting_room || 'consultation'}`}
                      className="btn btn-outline-cyan"
                      style={{ padding: '8px 14px', fontSize: '12px' }}
                    >
                      <Video size={14} />
                      <span>Join Video</span>
                    </Link>
                  )}

                  {appt.status !== 'completed' && (
                    <button
                      onClick={() => handleOpenConsultation(appt)}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      <FileText size={14} />
                      <span>Write Prescription</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription & Clinical Note Modal */}
      {showConsultModal && selectedAppt && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ padding: '32px', maxWidth: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', color: '#fff' }}>
                  Consultation for {selectedAppt.patient?.full_name || 'Patient'}
                </h3>
                <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                  MRN: {selectedAppt.patient?.mrn || 'MC26001048'}
                </span>
              </div>
              <button
                onClick={() => setShowConsultModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Clinical Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Essential Hypertension (Stage 1), Acute Bronchitis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Chief Complaint / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Headache for 3 days, mild shortness of breath on exertion"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Prescription Items (Rx) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Prescribed Medicines (℞)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedItem}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#06b6d4',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {medsList.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 24px',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Medicine name (e.g. Tab. Amlodipine)"
                        value={item.medicine}
                        onChange={(e) => {
                          const updated = [...medsList];
                          updated[index].medicine = e.target.value;
                          setMedsList(updated);
                        }}
                        className="input-field"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (5mg)"
                        value={item.dosage}
                        onChange={(e) => {
                          const updated = [...medsList];
                          updated[index].dosage = e.target.value;
                          setMedsList(updated);
                        }}
                        className="input-field"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Timing (1+0+0)"
                        value={item.frequency}
                        onChange={(e) => {
                          const updated = [...medsList];
                          updated[index].frequency = e.target.value;
                          setMedsList(updated);
                        }}
                        className="input-field"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                      <input
                        type="text"
                        placeholder="Duration (14 days)"
                        value={item.duration}
                        onChange={(e) => {
                          const updated = [...medsList];
                          updated[index].duration = e.target.value;
                          setMedsList(updated);
                        }}
                        className="input-field"
                        style={{ padding: '6px 10px', fontSize: '13px' }}
                      />
                      {medsList.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedItem(index)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Doctor's Advice & Lifestyle Guidance</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Low sodium diet, 30 min daily brisk walking, avoid fried foods..."
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  className="textarea-field"
                />
              </div>

              <div>
                <label className="form-label">Follow-up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowConsultModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="btn btn-primary"
                  style={{ padding: '12px 24px' }}
                >
                  <Save size={16} />
                  <span>{savingRecord ? 'Signing & Saving...' : 'Sign & Issue Prescription'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
