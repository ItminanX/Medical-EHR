'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  HeartPulse,
  Mail,
  Lock,
  ArrowRight,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Stethoscope,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isSignupParam = searchParams.get('mode') === 'signup';
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [isSignUp, setIsSignUp] = useState(isSignupParam);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if already signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push(redirectTo);
      }
    });
  }, [supabase, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
            },
          },
        });

        if (error) throw error;

        // Save detailed profile data
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            phone: phone,
            gender: gender as any,
            role: 'patient',
            onboarded: true,
          });

          setSuccessMsg('Account created successfully! Redirecting to dashboard...');
          setTimeout(() => {
            router.push(redirectTo);
            router.refresh();
          }, 1200);
        } else {
          setSuccessMsg('Verification email sent! Please check your inbox to confirm your account.');
        }
      } else {
        // Sign In with password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // If password fails, offer OTP option
          throw error;
        }

        setSuccessMsg('Welcome back! Redirecting to your health portal...');
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Instant Magic Link / OTP fallback
  const handleMagicLink = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address to receive a secure login link.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      setSuccessMsg('Magic login link sent to your email! Click it to sign in instantly.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send login link.');
    } finally {
      setLoading(false);
    }
  };

  // One-Click Demo Mode (Provides immediate reviewer testing even before custom Supabase config)
  const handleDemoSignIn = async (role: 'patient' | 'doctor' | 'admin') => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg(`Signing in as Demo ${role.toUpperCase()}...`);

    try {
      const demoEmails: Record<string, string> = {
        patient: 'patient@medicare.local',
        doctor: 'doctor@medicare.local',
        admin: 'admin@medicare.local',
      };

      const demoEmail = demoEmails[role];
      const demoPass = 'MedicareDemo2026!';

      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass,
      });

      if (error) {
        // If demo user does not exist in Supabase yet, create it on the fly
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: {
            data: {
              full_name:
                role === 'admin'
                  ? 'Dr. Hospital Administrator'
                  : role === 'doctor'
                  ? 'Dr. Farhana Rahman'
                  : 'Rahim Chowdhury',
            },
          },
        });

        if (signUpError) {
          // Supabase credentials placeholder notice
          setErrorMsg(
            `Demo sign-in: ${signUpError.message}. Make sure your Supabase project is set up or run the SQL files in Supabase!`
          );
          setLoading(false);
          return;
        }

        if (signUpData.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            email: demoEmail,
            full_name:
              role === 'admin'
                ? 'Dr. Hospital Administrator'
                : role === 'doctor'
                ? 'Dr. Farhana Rahman'
                : 'Rahim Chowdhury',
            role: role,
            onboarded: true,
          });
        }
      }

      router.push(role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-deep)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(2, 132, 199, 0.15)',
        }}
      >
        {/* Brand Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link
            href="/"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 8px 24px var(--primary-glow)',
              marginBottom: '16px',
            }}
          >
            <HeartPulse size={32} />
          </Link>
          <h1 style={{ fontSize: '26px', color: '#fff', marginBottom: '6px' }}>
            {isSignUp ? 'Create Patient Account' : 'Welcome to MediCare+'}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            {isSignUp ? 'Join our secure hospital and telemedicine network' : 'Sign in to access your medical records and care'}
          </p>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <>
              <div>
                <label className="form-label">Full Legal Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahim Chowdhury"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                  />
                  <User
                    size={18}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="01712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="select-field"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '40px' }}
              />
              <Mail
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '40px' }}
                minLength={6}
              />
              <Lock
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '14px', marginTop: '6px' }}>
            <span>{loading ? 'Processing...' : isSignUp ? 'Complete Registration' : 'Sign In with Password'}</span>
            <ArrowRight size={16} />
          </button>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '12px', fontSize: '13px' }}
            >
              <span>Send Passwordless Magic Link</span>
            </button>
          )}
        </form>

        {/* Switch Mode Toggle */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#94a3b8' }}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
                style={{ background: 'none', border: 'none', color: '#06b6d4', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              First time at MediCare+?{' '}
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
                style={{ background: 'none', border: 'none', color: '#06b6d4', fontWeight: 600, cursor: 'pointer' }}
              >
                Create an account
              </button>
            </>
          )}
        </div>

        {/* Demo Fast-Switch Panel */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            Instant Testing Demo Access
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoSignIn('patient')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <User size={16} style={{ color: '#06b6d4' }} />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSignIn('doctor')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <Stethoscope size={16} style={{ color: '#10b981' }} />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSignIn('admin')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '8px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}
            >
              <ShieldAlert size={16} style={{ color: '#f43f5e' }} />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading login portal...</div>}>
      <LoginContent />
    </Suspense>
  );
}
