'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Vaccine, Vaccination } from '@/types/database';

export default function VaccinationPage() {
  const supabase = createClient();

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [myVaccinations, setMyVaccinations] = useState<Vaccination[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVaccineId, setSelectedVaccineId] = useState('');
  const [doseNum, setDoseNum] = useState(1);
  const [adminDate, setAdminDate] = useState('2026-10-28');
  const [location, setLocation] = useState('MediCare+ Central Clinic');
  const [batchNum, setBatchNum] = useState('');
  const [isCompleted, setIsCompleted] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    async function loadVaxData() {
      try {
        const { data: vaxList } = await supabase.from('vaccines').select('*').eq('is_active', true).order('name');
        if (vaxList) {
          setVaccines(vaxList as Vaccine[]);
          if (vaxList.length > 0) setSelectedVaccineId(vaxList[0].id);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: userVax } = await supabase
            .from('vaccinations')
            .select('*, vaccine:vaccines(*)')
            .eq('patient_id', user.id)
            .order('scheduled_date', { ascending: false });

          if (userVax) setMyVaccinations(userVax as any);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadVaxData();
  }, [supabase]);

  const handleRecordVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Please sign in to record vaccinations.');
        setLoadingAction(false);
        return;
      }

      const { data, error } = await supabase
        .from('vaccinations')
        .insert({
          patient_id: user.id,
          vaccine_id: selectedVaccineId,
          dose_number: doseNum,
          status: isCompleted ? 'completed' : 'scheduled',
          scheduled_date: !isCompleted ? adminDate : null,
          administered_date: isCompleted ? adminDate : null,
          location: location,
          batch_number: batchNum || null,
        })
        .select('*, vaccine:vaccines(*)')
        .single();

      if (error) throw error;

      if (data) setMyVaccinations((prev) => [data as any, ...prev]);
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save vaccine record.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>Immunisation & Vaccination Registry</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Track completed doses, view automated reminder schedules, and download verified certificates.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Record / Schedule Dose</span>
        </button>
      </div>

      {/* Vaccination History Cards */}
      <div>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>My Immunisation History</h3>

        {myVaccinations.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <ShieldCheck size={40} style={{ margin: '0 auto 12px', color: '#475569' }} />
            <h4>No vaccination doses logged</h4>
            <p style={{ marginTop: '4px', fontSize: '13px' }}>
              Add previous vaccinations or schedule your next recommended dose above.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {myVaccinations.map((item) => (
              <div key={item.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    className={`badge ${
                      item.status === 'completed'
                        ? 'badge-emerald'
                        : item.status === 'scheduled'
                        ? 'badge-cyan'
                        : 'badge-amber'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                    Dose {item.dose_number} of {item.vaccine?.doses_required || 1}
                  </span>
                </div>

                <h4 style={{ fontSize: '16px', color: '#fff', margin: '12px 0 4px' }}>
                  {item.vaccine?.name || 'Vaccine'}
                </h4>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.vaccine?.disease}</div>

                <div style={{ marginTop: '14px', fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {item.administered_date && (
                    <div>
                      Administered: <strong>{new Date(item.administered_date).toLocaleDateString()}</strong>
                    </div>
                  )}
                  {item.scheduled_date && (
                    <div>
                      Scheduled: <strong>{new Date(item.scheduled_date).toLocaleDateString()}</strong>
                    </div>
                  )}
                  {item.location && <div>Center: {item.location}</div>}
                  {item.batch_number && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748b' }}>
                      Batch: {item.batch_number}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Vaccines Catalog */}
      <div>
        <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Recommended Preventive Vaccines</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {vaccines.map((vax) => (
            <div key={vax.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge badge-cyan">{vax.disease}</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                  {vax.price > 0 ? `৳${vax.price}` : 'Free'}
                </span>
              </div>
              <h4 style={{ fontSize: '16px', color: '#fff', margin: '12px 0 4px' }}>{vax.name}</h4>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{vax.description}</p>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#10b981' }}>
                {vax.doses_required} dose(s) required • Recommended for {vax.recommended_for}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Record Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff' }}>Record Vaccine Dose</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecordVaccine} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Vaccine</label>
                <select
                  value={selectedVaccineId}
                  onChange={(e) => setSelectedVaccineId(e.target.value)}
                  className="select-field"
                >
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.disease})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Dose Number</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={doseNum}
                    onChange={(e) => setDoseNum(parseInt(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={adminDate}
                    onChange={(e) => setAdminDate(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Clinic / Hospital Center</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Batch / Lot Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. VAX-2026-09A"
                  value={batchNum}
                  onChange={(e) => setBatchNum(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px' }}>
                    <input
                      type="radio"
                      checked={isCompleted}
                      onChange={() => setIsCompleted(true)}
                    />
                    Already Administered (Completed)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px' }}>
                    <input
                      type="radio"
                      checked={!isCompleted}
                      onChange={() => setIsCompleted(false)}
                    />
                    Schedule Upcoming
                  </label>
                </div>
              </div>

              <button type="submit" disabled={loadingAction} className="btn btn-primary" style={{ padding: '14px', marginTop: '10px' }}>
                {loadingAction ? 'Recording...' : 'Save to Immunisation Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
