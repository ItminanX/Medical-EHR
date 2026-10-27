'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  Home,
  Shield,
  Save,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<string>('prefer_not_to_say');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data) {
            const p = data as Profile;
            setProfile(p);
            setFullName(p.full_name || '');
            setPhone(p.phone || '');
            setDob(p.date_of_birth || '');
            setGender(p.gender || 'prefer_not_to_say');
            setBloodGroup(p.blood_group || 'O+');
            setAddress(p.address || '');
            setEmergencyName(p.emergency_contact_name || '');
            setEmergencyPhone(p.emergency_contact_phone || '');
            setAvatarUrl(p.avatar_url || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [supabase]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          date_of_birth: dob || null,
          gender: gender as any,
          blood_group: bloodGroup as any,
          address: address,
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone,
          avatar_url: avatarUrl || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setFeedback({ type: 'success', text: 'Medical profile updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setFeedback({ type: 'success', text: 'Profile picture updated!' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Avatar upload failed.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{ fontSize: '28px', color: '#fff' }}>Patient Medical Profile</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Maintain accurate contact information, emergency details, and clinical identity.
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
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Profile Card Header */}
      <div
        className="glass-panel"
        style={{
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: '#fff',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                fullName ? fullName.charAt(0).toUpperCase() : 'P'
              )}
            </div>
            <label
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#0284c7',
                border: '2px solid #060919',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Upload Avatar"
            >
              <Camera size={14} />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div>
            <h2 style={{ fontSize: '20px', color: '#fff' }}>{fullName || 'Patient User'}</h2>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span className="badge badge-cyan">{profile?.role ? profile.role.toUpperCase() : 'PATIENT'}</span>
              <span className="badge badge-emerald">ACCOUNT ACTIVE</span>
            </div>
          </div>
        </div>

        {/* MRN Digital Badge */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Medical Record Number
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {profile?.mrn || 'MC26001048'}
          </div>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSaveProfile} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '17px', color: '#fff', marginBottom: '8px' }}>Personal Identification</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label className="form-label">Full Legal Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
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

          <div>
            <label className="form-label">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="select-field"
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Residential Address</label>
          <input
            type="text"
            placeholder="Street address, City, District"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-field"
          />
        </div>

        <h3 style={{ fontSize: '17px', color: '#fff', margin: '16px 0 4px' }}>Emergency Contact Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label className="form-label">Emergency Contact Name</label>
            <input
              type="text"
              placeholder="e.g. Spouse, Parent, Sibling"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">Emergency Contact Phone</label>
            <input
              type="tel"
              placeholder="+880 1700 000000"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '12px 28px' }}>
            <Save size={16} />
            <span>{saving ? 'Saving changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
