'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Search,
  Star,
  Video,
  CalendarCheck,
  Languages,
  Award,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Doctor, Department } from '@/types/database';

export default function DoctorsPage() {
  const supabase = createClient();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const { data: depts } = await supabase.from('departments').select('*').order('name');
        if (depts) setDepartments(depts as Department[]);

        const { data: docs } = await supabase
          .from('doctors')
          .select('*, department:departments(*)')
          .eq('is_active', true)
          .order('rating', { ascending: false });

        if (docs) setDoctors(docs as any);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [supabase]);

  const filtered = doctors.filter((doc: any) => {
    const matchesDept =
      selectedDept === 'all' || doc.department?.slug === selectedDept || doc.department_id === selectedDept;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesDept;

    const matchesName = doc.full_name.toLowerCase().includes(q);
    const matchesSpec = doc.specialization?.toLowerCase().includes(q);
    const matchesExpertise = doc.expertise?.some((e: string) => e.toLowerCase().includes(q));

    return matchesDept && (matchesName || matchesSpec || matchesExpertise);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#fff' }}>Our Medical Specialists</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Consult certified specialists across Cardiology, Neurology, Pediatrics, Orthopedics, and more.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search doctor by name, condition, or expertise (e.g. Heart Surgery, Diabetes, Migraine)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '44px', height: '48px', fontSize: '15px' }}
          />
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
            }}
          />
        </div>

        {/* Department Chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedDept('all')}
            className={`btn ${selectedDept === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-full)' }}
          >
            All Departments
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
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Loading specialists...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <Stethoscope size={48} style={{ margin: '0 auto 16px', color: '#475569' }} />
          <h3>No doctors found matching criteria</h3>
          <p style={{ marginTop: '6px', fontSize: '14px' }}>Try searching another department or keyword.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '24px',
          }}
        >
          {filtered.map((doc: any) => (
            <div
              key={doc.id}
              className="glass-panel glass-interactive"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '28px',
                      boxShadow: '0 8px 20px var(--primary-glow)',
                      flexShrink: 0,
                    }}
                  >
                    👨‍⚕️
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '17px', color: '#fff', fontWeight: 700 }}>{doc.full_name}</h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#f59e0b',
                          fontSize: '13px',
                          fontWeight: 700,
                        }}
                      >
                        <Star size={14} fill="#f59e0b" />
                        <span>{doc.rating || 4.9}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#06b6d4', fontWeight: 600, marginTop: '2px' }}>
                      {doc.specialization}
                    </div>

                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {doc.qualifications}
                    </div>
                  </div>
                </div>

                {doc.bio && (
                  <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '16px', lineHeight: 1.5 }}>
                    {doc.bio}
                  </p>
                )}

                {/* Expertise tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                  {doc.expertise?.map((exp: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      {exp}
                    </span>
                  ))}
                </div>

                {/* Info Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '20px',
                    padding: '12px',
                    background: 'rgba(2, 132, 199, 0.06)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ color: '#94a3b8' }}>
                    Experience:{' '}
                    <strong style={{ color: '#fff' }}>{doc.experience_years || 8}+ Years</strong>
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    Clinic Fee:{' '}
                    <strong style={{ color: '#38bdf8', fontSize: '14px' }}>৳{doc.consultation_fee}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Link
                  href={`/appointments?doctorId=${doc.id}`}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px' }}
                >
                  <CalendarCheck size={16} />
                  <span>Book Visit</span>
                </Link>

                {doc.offers_video && (
                  <Link
                    href={`/telemedicine?doctorId=${doc.id}`}
                    className="btn btn-outline-cyan"
                    style={{ padding: '10px 14px' }}
                    title="Start Live Video Telemedicine"
                  >
                    <Video size={16} />
                    <span>Video</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
