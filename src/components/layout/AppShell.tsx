'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HeartPulse,
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Video,
  FileText,
  Package,
  ShieldCheck,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Activity,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Profile, Notification as DbNotification } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import AiChatWidget from '@/components/ai/AiChatWidget';

interface AppShellProps {
  children: React.ReactNode;
  initialProfile?: Profile | null;
}

export default function AppShell({ children, initialProfile }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(initialProfile || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(!initialProfile);

  // Fetch or listen to user profile
  useEffect(() => {
    async function loadUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) setProfile(data as Profile);

          // Fetch notifications
          const { data: notifs } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (notifs) setNotifications(notifs as DbNotification[]);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoadingUser(false);
      }
    }

    if (!profile) {
      loadUserData();
    }
  }, [supabase, profile]);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out of MediCare+?')) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  const markAllRead = async () => {
    if (!profile) return;
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .is('read_at', null);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (e) {
      console.error('Error marking notifications as read:', e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Health & Records', href: '/my-health', icon: Activity, badge: 'Clinical' },
    { label: 'Book Appointment', href: '/appointments', icon: CalendarCheck },
    { label: 'Our Doctors', href: '/doctors', icon: Stethoscope },
    { label: 'Telemedicine (Live)', href: '/telemedicine', icon: Video, pulse: true },
    { label: 'Tests & Reports', href: '/tests', icon: FileText },
    { label: 'Health Packages', href: '/packages', icon: Package },
    { label: 'Vaccination', href: '/vaccination', icon: ShieldCheck },
    { label: 'My Profile', href: '/profile', icon: User },
  ];

  // If on login page, render children directly without dashboard shell
  if (pathname === '/login' || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 35,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Logo Header */}
        <div
          style={{
            height: 'var(--header-h)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 8px 20px var(--primary-glow)',
              }}
            >
              <HeartPulse size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                MediCare<span style={{ color: '#06b6d4' }}>+</span>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Medical SaaS
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card Pill */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#fff',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'P'
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {profile?.full_name || 'Patient User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  className={`badge ${
                    profile?.role === 'admin'
                      ? 'badge-rose'
                      : profile?.role === 'doctor'
                      ? 'badge-emerald'
                      : 'badge-cyan'
                  }`}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  {profile?.role ? profile.role.toUpperCase() : 'PATIENT'}
                </span>
                {profile?.mrn && (
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {profile.mrn}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <div style={{ padding: '8px 24px 4px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link-item ${active ? 'active' : ''}`}
              >
                <Icon size={18} style={{ color: active ? '#06b6d4' : '#94a3b8' }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.pulse && <span className="live-dot" />}
                {item.badge && !item.pulse && (
                  <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Doctor Portal Link if Doctor or Admin */}
          {(profile?.role === 'doctor' || profile?.role === 'admin') && (
            <>
              <div style={{ padding: '16px 24px 4px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Practitioner
              </div>
              <Link
                href="/doctor"
                onClick={() => setSidebarOpen(false)}
                className={`nav-link-item ${pathname.startsWith('/doctor') ? 'active' : ''}`}
              >
                <Stethoscope size={18} style={{ color: '#10b981' }} />
                <span style={{ flex: 1 }}>Doctor Console</span>
                <span className="badge badge-emerald" style={{ fontSize: '10px' }}>Doctor</span>
              </Link>
            </>
          )}

          {/* Admin Portal Link if Admin */}
          {profile?.role === 'admin' && (
            <>
              <div style={{ padding: '16px 24px 4px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Management
              </div>
              <Link
                href="/admin"
                onClick={() => setSidebarOpen(false)}
                className={`nav-link-item ${pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                <ShieldAlert size={18} style={{ color: '#f43f5e' }} />
                <span style={{ flex: 1 }}>Hospital Admin</span>
                <span className="badge badge-rose" style={{ fontSize: '10px' }}>Admin</span>
              </Link>
            </>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#fda4af',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.18)';
              e.currentTarget.style.borderColor = '#f43f5e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.25)';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Sticky Header */}
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
              }}
              className="mobile-toggle-btn"
            >
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Portal</span>
              <ChevronRight size={14} style={{ color: '#475569' }} />
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                {pathname.split('/')[1]
                  ? pathname.split('/')[1].replace('-', ' ').toUpperCase()
                  : 'DASHBOARD'}
              </span>
            </div>
          </div>

          {/* Right Header: Notification Bell & Quick Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      borderRadius: '9px',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '52px',
                    right: '0',
                    width: '340px',
                    maxWidth: '90vw',
                    background: '#0b1120',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
                    zIndex: 60,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCheck size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No notifications right now
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            background: n.read_at ? 'transparent' : 'rgba(2, 132, 199, 0.08)',
                            transition: 'background 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{n.title}</div>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {n.body && (
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: '1.4' }}>
                              {n.body}
                            </p>
                          )}
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => setNotifOpen(false)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                color: '#38bdf8',
                                marginTop: '6px',
                              }}
                            >
                              <span>View details</span>
                              <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Profile Link */}
            <Link
              href="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  color: '#fff',
                  overflow: 'hidden',
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile?.full_name ? profile.full_name.charAt(0) : 'P'
                )}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                {profile?.full_name?.split(' ')[0] || 'Profile'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="app-content">{children}</main>
      </div>

      {/* Floating AI Health Assistant Widget */}
      <AiChatWidget userProfile={profile} />

      <style jsx global>{`
        @media (max-width: 900px) {
          .mobile-toggle-btn {
            display: flex !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
