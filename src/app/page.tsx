'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HeartPulse,
  CalendarCheck,
  Video,
  Activity,
  FileText,
  ShieldCheck,
  Bot,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  PhoneCall,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [supabase]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)' }}>
      {/* Navigation Bar */}
      <header
        style={{
          height: '80px',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(6, 9, 25, 0.8)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px var(--primary-glow)',
            }}
          >
            <HeartPulse size={26} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              MediCare<span style={{ color: '#06b6d4' }}>+</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Hospital & Telemedicine SaaS
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="desktop-nav">
          <Link href="/doctors" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Our Doctors
          </Link>
          <Link href="/telemedicine" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Telemedicine
          </Link>
          <Link href="/tests" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Lab Tests
          </Link>
          <Link href="/packages" style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>
            Health Packages
          </Link>
        </nav>

        <div>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">
              <span>Go to Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/login" className="btn btn-secondary">
                Patient Sign In
              </Link>
              <Link href="/login?mode=signup" className="btn btn-primary">
                Register Free
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '100px 40px 80px',
          maxWidth: '1300px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: '#67e8f9',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '28px',
            boxShadow: '0 0 25px rgba(6, 182, 212, 0.2)',
          }}
        >
          <Sparkles size={16} />
          <span>Next-Generation Healthcare Cloud Platform</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 5.5vw, 68px)',
            lineHeight: 1.15,
            fontWeight: 800,
            color: '#fff',
            maxWidth: '960px',
            margin: '0 auto 24px',
            letterSpacing: '-0.03em',
          }}
        >
          Your Complete Health Journey,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #06b6d4 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Intelligent & Always Accessible
          </span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: '#94a3b8',
            maxWidth: '720px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}
        >
          Book expert doctor consultations with conflict-free slot scheduling, join instant video
          telemedicine, access verified hospital EHR prescriptions, track health vitals, and consult our 24/7 AI Clinical Assistant.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '60px' }}>
          <Link href="/appointments" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            <CalendarCheck size={20} />
            <span>Book Doctor Appointment</span>
          </Link>
          <Link href="/telemedicine" className="btn btn-outline-cyan" style={{ padding: '14px 28px', fontSize: '16px' }}>
            <Video size={20} />
            <span>Instant Telemedicine</span>
          </Link>
          <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
            <span>Patient Portal</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        {/* Feature Stats Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            maxWidth: '1050px',
            margin: '0 auto',
          }}
        >
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ color: '#38bdf8', marginBottom: '10px' }}>
              <Clock size={28} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>20 Min</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Real-time slot engine with zero double-booking
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ color: '#10b981', marginBottom: '10px' }}>
              <Activity size={28} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>100% Digital</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Verified clinical records, prescriptions & lab reports
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ color: '#8b5cf6', marginBottom: '10px' }}>
              <Bot size={28} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>24/7 AI Triage</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Intelligent clinical assistant for symptoms & test advice
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ color: '#f43f5e', marginBottom: '10px' }}>
              <ShieldCheck size={28} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>Enterprise RLS</div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Row-Level Security protecting all patient medical records
            </p>
          </div>
        </div>
      </section>

      {/* Feature Modules Breakdown */}
      <section style={{ padding: '80px 40px', maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: '36px', color: '#fff', marginBottom: '12px' }}>
            Engineered for Patients, Doctors & Hospitals
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            All the healthcare features you need, built on a unified, high-performance architecture.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Card 1 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(2, 132, 199, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                marginBottom: '20px',
              }}
            >
              <CalendarCheck size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Appointment Scheduling
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Dynamic slot generator computed from doctor weekly schedules and leaves. Atomic database transactions
              ensure slots can never be double-booked.
            </p>
            <Link href="/appointments" style={{ color: '#06b6d4', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Book consultation</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06b6d4',
                marginBottom: '20px',
              }}
            >
              <Video size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Telemedicine Consultation Room
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Connect with certified physicians from any phone or computer with HD video room links and
              in-consultation real-time messaging.
            </p>
            <Link href="/telemedicine" style={{ color: '#06b6d4', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Explore Telemedicine</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                marginBottom: '20px',
              }}
            >
              <Activity size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Hospital Records & Digital Rx
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Patients can view every visit summary, diagnosis, vitals readings, and digital prescription
              issued by hospital doctors right in their personal portal.
            </p>
            <Link href="/my-health" style={{ color: '#10b981', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>View Health Records</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 4 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6',
                marginBottom: '20px',
              }}
            >
              <FileText size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Lab Investigations & Reports
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Book pathology tests with home sample collection options. Securely download and store PDF
              diagnostic reports with patient-folder level access control.
            </p>
            <Link href="/tests" style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Browse Lab Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 5 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Vaccination Tracker
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Track completed doses and automatically schedule upcoming multi-dose vaccines like Hepatitis B,
              HPV, MMR, and Flu shots with automated reminder triggers.
            </p>
            <Link href="/vaccination" style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Track Immunisations</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 6 */}
          <div className="glass-panel glass-interactive" style={{ padding: '32px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                background: 'rgba(244, 63, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e',
                marginBottom: '20px',
              }}
            >
              <Users size={26} />
            </div>
            <h3 style={{ fontSize: '20px', color: '#fff', marginBottom: '10px' }}>
              Doctor & Admin Portals
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Doctors manage appointments and issue prescriptions. Administrators oversee hospital analytics,
              manage practitioner rosters, and monitor patient bookings.
            </p>
            <Link href="/login" style={{ color: '#f43f5e', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Staff Login</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '40px',
          background: 'rgba(6, 9, 25, 0.95)',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <HeartPulse size={18} style={{ color: '#06b6d4' }} />
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>MediCare+ Health Systems</span>
        </div>
        <p style={{ maxWidth: '600px', margin: '0 auto 16px' }}>
          Certified Cloud Healthcare SaaS Architecture • Compliant with Patient Privacy & Row-Level Security Standards
        </p>
        <p>© 2026 MediCare+ Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
