'use client';

import React, { useState, useEffect } from 'react';
import { Package, Check, Sparkles, ArrowRight, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { HealthPackage } from '@/types/database';

export default function PackagesPage() {
  const supabase = createClient();

  const [packages, setPackages] = useState<HealthPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<HealthPackage | null>(null);
  const [bookingDate, setBookingDate] = useState('2026-10-28');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    async function loadPackages() {
      const { data } = await supabase.from('health_packages').select('*').eq('is_active', true).order('price');
      if (data) setPackages(data as HealthPackage[]);
    }
    loadPackages();
  }, [supabase]);

  const handleBookPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    setBookingLoading(true);
    setSuccessNotice('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Please sign in to book health packages.');
        setBookingLoading(false);
        return;
      }

      const { error } = await supabase.from('package_bookings').insert({
        patient_id: user.id,
        package_id: selectedPkg.id,
        preferred_date: bookingDate,
        amount: selectedPkg.price,
        status: 'booked',
      });

      if (error) throw error;

      setSuccessNotice(`Package "${selectedPkg.name}" booked for ${bookingDate}! Our coordinator will contact you.`);
      setSelectedPkg(null);
    } catch (err: any) {
      alert(err.message || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '28px', color: '#fff' }}>Comprehensive Health Packages</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Preventive annual wellness, executive checkups, and specialized cardiac screenings at discounted bundle rates.
        </p>
      </div>

      {successNotice && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Package Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`glass-panel glass-interactive ${pkg.is_featured ? 'featured-package-card' : ''}`}
            style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              borderColor: pkg.is_featured ? 'var(--accent-cyan)' : 'var(--border-subtle)',
              background: pkg.is_featured
                ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)'
                : 'var(--bg-card)',
            }}
          >
            {pkg.is_featured && (
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                }}
              >
                POPULAR CHOICE
              </span>
            )}

            <div>
              <span className="badge badge-cyan">{pkg.category}</span>
              <h3 style={{ fontSize: '22px', color: '#fff', margin: '14px 0 4px' }}>{pkg.name}</h3>
              {pkg.tagline && <p style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>{pkg.tagline}</p>}
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '12px 0 20px', lineHeight: 1.5 }}>
                {pkg.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>৳{pkg.price}</span>
                {pkg.original_price && (
                  <span style={{ fontSize: '16px', color: '#64748b', textDecoration: 'line-through' }}>
                    ৳{pkg.original_price}
                  </span>
                )}
              </div>

              {/* Inclusions checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>
                  Includes:
                </span>
                {pkg.includes.map((inc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                    <Check size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setSelectedPkg(pkg)} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              <span>Book Package</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedPkg && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff' }}>Book: {selectedPkg.name}</h3>
              <button onClick={() => setSelectedPkg(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookPackage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Preferred Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ padding: '16px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>Total Package Price</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                  ৳{selectedPkg.price}
                </div>
              </div>

              <button type="submit" disabled={bookingLoading} className="btn btn-primary" style={{ padding: '14px' }}>
                {bookingLoading ? 'Reserving...' : 'Confirm Package Reservation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
