import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'MediCare+ | Advanced Hospital & Telemedicine SaaS Platform',
  description:
    'Comprehensive healthcare management system with automated appointment scheduling, live telemedicine, clinical electronic health records, lab investigations, vaccination trackers, and AI clinical assistance.',
  keywords: [
    'Hospital SaaS',
    'Telemedicine',
    'Doctor Appointment Booking',
    'Electronic Health Records',
    'Medical SaaS',
    'Patient Portal',
  ],
  authors: [{ name: 'MediCare+ Health Systems' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
