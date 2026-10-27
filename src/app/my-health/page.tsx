'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  FileText,
  HeartPulse,
  TrendingUp,
  Plus,
  Printer,
  Calendar,
  AlertTriangle,
  Pill,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  MedicalRecord,
  PrescriptionItem,
  Vital,
  Condition,
  Allergy,
  Medication,
  Profile,
} from '@/types/database';

function MyHealthContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const defaultTab = (searchParams.get('tab') as any) || 'records';
  const highlightedRecordId = searchParams.get('recordId');

  const [activeTab, setActiveTab] = useState<'records' | 'vitals' | 'meds-allergies'>(defaultTab);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Clinical Records & Prescriptions
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Vitals
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalType, setVitalType] = useState<Vital['type']>('blood_pressure');
  const [vitalVal, setVitalVal] = useState('');
  const [vitalVal2, setVitalVal2] = useState('');
  const [vitalNote, setVitalNote] = useState('');

  // Conditions & Allergies
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHealthData() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Profile
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (prof) setProfile(prof as Profile);

          // Clinical records with doctor & prescription items
          const { data: recs } = await supabase
            .from('medical_records')
            .select(`
              *,
              doctor:doctors (*),
              prescriptions:prescription_items (*)
            `)
            .eq('patient_id', user.id)
            .order('visit_date', { ascending: false });

          if (recs && recs.length > 0) {
            setRecords(recs as any);
            if (highlightedRecordId) {
              const matched = recs.find((r: any) => r.id === highlightedRecordId);
              if (matched) setSelectedRecord(matched as any);
            } else {
              setSelectedRecord(recs[0] as any);
            }
          }

          // Vitals
          const { data: vts } = await supabase
            .from('vitals')
            .select('*')
            .eq('patient_id', user.id)
            .order('recorded_at', { ascending: false });
          if (vts) setVitals(vts as Vital[]);

          // Conditions
          const { data: conds } = await supabase.from('conditions').select('*').eq('patient_id', user.id);
          if (conds) setConditions(conds as Condition[]);

          // Allergies
          const { data: algs } = await supabase.from('allergies').select('*').eq('patient_id', user.id);
          if (algs) setAllergies(algs as Allergy[]);

          // Medications
          const { data: meds } = await supabase.from('medications').select('*').eq('patient_id', user.id);
          if (meds) setMedications(meds as Medication[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadHealthData();
  }, [supabase, highlightedRecordId]);

  // Log new vital
  const handleAddVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const unitsMap: Record<string, string> = {
        blood_pressure: 'mmHg',
        heart_rate: 'bpm',
        blood_sugar: 'mmol/L',
        weight: 'kg',
        temperature: '°F',
        spo2: '%',
      };

      const newVital = {
        patient_id: user.id,
        type: vitalType,
        value: parseFloat(vitalVal),
        value2: vitalType === 'blood_pressure' ? parseFloat(vitalVal2) : null,
        unit: unitsMap[vitalType],
        note: vitalNote || null,
      };

      const { data, error } = await supabase.from('vitals').insert(newVital).select().single();
      if (!error && data) {
        setVitals((prev) => [data as Vital, ...prev]);
        setShowVitalModal(false);
        setVitalVal('');
        setVitalVal2('');
        setVitalNote('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintPrescription = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>My Health & Medical Records</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Hospital visit summaries, official doctor prescriptions, and personal health vital logs.
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
            onClick={() => setActiveTab('records')}
            className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <FileText size={16} />
            <span>Prescriptions & EHR ({records.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('vitals')}
            className={`btn ${activeTab === 'vitals' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <HeartPulse size={16} />
            <span>Health Vitals</span>
          </button>
          <button
            onClick={() => setActiveTab('meds-allergies')}
            className={`btn ${activeTab === 'meds-allergies' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <Pill size={16} />
            <span>Allergies & Meds</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Clinical Records & Prescriptions */}
      {activeTab === 'records' && (
        <div>
          {records.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', color: '#475569' }} />
              <h3 style={{ color: '#fff' }}>No Hospital Clinical Records Yet</h3>
              <p style={{ marginTop: '8px', fontSize: '14px', maxWidth: '480px', margin: '8px auto 0' }}>
                When you see a doctor at our hospital or through telemedicine, your verified clinical diagnosis,
                doctor notes, and digital prescriptions will be recorded here immediately.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
              {/* Record Selector Sidebar */}
              <div className="glass-panel no-print" style={{ padding: '20px', height: 'fit-content' }}>
                <h4 style={{ fontSize: '15px', color: '#fff', marginBottom: '14px' }}>Visit History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {records.map((rec) => {
                    const isSelected = selectedRecord?.id === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className={`glass-panel glass-interactive ${isSelected ? 'active-doctor-card' : ''}`}
                        style={{
                          padding: '14px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(2, 132, 199, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                          borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                            {rec.diagnosis}
                          </span>
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                            {rec.visit_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#06b6d4', marginTop: '4px' }}>
                          {rec.doctor?.full_name || 'Hospital Consultant'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          {new Date(rec.visit_date).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Official Printable Prescription Sheet */}
              {selectedRecord && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '36px',
                    background: '#0b1329',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    position: 'relative',
                  }}
                >
                  {/* Print Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }} className="no-print">
                    <button onClick={handlePrintPrescription} className="btn btn-secondary">
                      <Printer size={16} />
                      <span>Print Prescription (Rx)</span>
                    </button>
                  </div>

                  {/* Header / Hospital Pad */}
                  <div
                    style={{
                      borderBottom: '2px solid rgba(56, 189, 248, 0.3)',
                      paddingBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                        MediCare<span style={{ color: '#06b6d4' }}>+</span> Hospital
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        Certified Clinical Healthcare Network • Electronic Health Record System
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                        {selectedRecord.doctor?.full_name || 'Dr. Farhana Rahman'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#06b6d4' }}>
                        {selectedRecord.doctor?.specialization}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {selectedRecord.doctor?.qualifications}
                      </div>
                    </div>
                  </div>

                  {/* Patient Info Bar */}
                  <div
                    style={{
                      padding: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      margin: '20px 0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '12px',
                      fontSize: '12px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <span style={{ color: '#94a3b8' }}>Patient Name: </span>
                      <strong style={{ color: '#fff' }}>{profile?.full_name || 'Rahim Chowdhury'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>MRN: </span>
                      <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {profile?.mrn || 'MC26001048'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Date: </span>
                      <strong style={{ color: '#fff' }}>
                        {new Date(selectedRecord.visit_date).toLocaleDateString()}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Gender/Age: </span>
                      <strong style={{ color: '#fff' }}>
                        {profile?.gender ? profile.gender.toUpperCase() : 'MALE'} / 29
                      </strong>
                    </div>
                  </div>

                  {/* Clinical Diagnosis & Vitals */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>
                        Diagnosis:
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                        {selectedRecord.diagnosis}
                      </span>
                    </div>

                    {selectedRecord.chief_complaint && (
                      <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                        <strong>Chief Complaint:</strong> {selectedRecord.chief_complaint}
                      </p>
                    )}

                    {selectedRecord.clinical_notes && (
                      <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px', background: 'rgba(2, 132, 199, 0.06)', padding: '10px', borderRadius: '6px' }}>
                        <strong>Clinical Observations:</strong> {selectedRecord.clinical_notes}
                      </p>
                    )}
                  </div>

                  {/* Prescription (Rx) Section */}
                  <div style={{ margin: '24px 0' }}>
                    <div style={{ fontSize: '28px', fontFamily: 'serif', fontWeight: 900, color: '#38bdf8', marginBottom: '12px' }}>
                      ℞
                    </div>

                    {selectedRecord.prescriptions && selectedRecord.prescriptions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedRecord.prescriptions.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            style={{
                              padding: '12px 16px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderLeft: '4px solid #06b6d4',
                              borderRadius: '4px',
                            }}
                          >
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                              {idx + 1}. {item.medicine} {item.dosage && <span style={{ color: '#38bdf8' }}>({item.dosage})</span>}
                            </div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '16px' }}>
                              {item.frequency && <span><strong>Timing:</strong> {item.frequency}</span>}
                              {item.duration && <span><strong>Duration:</strong> {item.duration}</span>}
                            </div>
                            {item.instructions && (
                              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                                ✎ {item.instructions}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                        No medications prescribed during this follow-up.
                      </div>
                    )}
                  </div>

                  {/* Lifestyle Advice & Follow Up */}
                  {selectedRecord.advice && (
                    <div style={{ marginTop: '24px', padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <strong style={{ color: '#10b981', fontSize: '13px' }}>Doctor's Advice / Diet Plan:</strong>
                      <p style={{ color: '#e2e8f0', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                        {selectedRecord.advice}
                      </p>
                    </div>
                  )}

                  {selectedRecord.follow_up_date && (
                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      <span>Next Follow-up Scheduled: {new Date(selectedRecord.follow_up_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Vitals Tracker */}
      {activeTab === 'vitals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Personal Vitals Logs</h3>
            <button onClick={() => setShowVitalModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Log Vital Reading</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {vitals.map((v) => (
              <div key={v.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                    {v.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {new Date(v.recorded_at).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '8px 0 4px' }}>
                  {v.value}
                  {v.value2 ? ` / ${v.value2}` : ''}
                  <span style={{ fontSize: '13px', fontWeight: 400, color: '#38bdf8', marginLeft: '6px' }}>
                    {v.unit}
                  </span>
                </div>
                {v.note && <p style={{ fontSize: '12px', color: '#94a3b8' }}>{v.note}</p>}
              </div>
            ))}
          </div>

          {/* Modal to log vital */}
          {showVitalModal && (
            <div className="modal-backdrop">
              <div className="modal-dialog" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '18px', color: '#fff' }}>Log Health Reading</h3>
                  <button onClick={() => setShowVitalModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddVital} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="form-label">Vital Parameter</label>
                    <select
                      value={vitalType}
                      onChange={(e) => setVitalType(e.target.value as any)}
                      className="select-field"
                    >
                      <option value="blood_pressure">Blood Pressure (Systolic / Diastolic)</option>
                      <option value="heart_rate">Heart Rate (Pulse - bpm)</option>
                      <option value="blood_sugar">Blood Sugar (mmol/L or mg/dL)</option>
                      <option value="weight">Body Weight (kg)</option>
                      <option value="temperature">Temperature (°F)</option>
                      <option value="spo2">Oxygen Saturation SpO2 (%)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: vitalType === 'blood_pressure' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">{vitalType === 'blood_pressure' ? 'Systolic' : 'Value'}</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="120"
                        value={vitalVal}
                        onChange={(e) => setVitalVal(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    {vitalType === 'blood_pressure' && (
                      <div>
                        <label className="form-label">Diastolic</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="80"
                          value={vitalVal2}
                          onChange={(e) => setVitalVal2(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Measured before breakfast"
                      value={vitalNote}
                      onChange={(e) => setVitalNote(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
                    Save Reading
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Allergies & Medications */}
      {activeTab === 'meds-allergies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Allergies Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} style={{ color: '#f43f5e' }} />
              <span>Medical Allergies</span>
            </h3>

            {allergies.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No known drug or food allergies on record.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {allergies.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fda4af', fontSize: '14px' }}>{a.allergen}</strong>
                      {a.reaction && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{a.reaction}</div>}
                    </div>
                    <span className="badge badge-rose">{a.severity.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Medications */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pill size={20} style={{ color: '#06b6d4' }} />
              <span>Current Daily Medications</span>
            </h3>

            {medications.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>No long-term medications currently configured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {medications.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fff', fontSize: '14px' }}>{m.name}</strong>
                      <div style={{ fontSize: '12px', color: '#06b6d4' }}>{m.dosage} • {m.frequency}</div>
                    </div>
                    <span className="badge badge-emerald">ACTIVE</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyHealthPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#94a3b8' }}>Loading patient health records...</div>}>
      <MyHealthContent />
    </Suspense>
  );
}
