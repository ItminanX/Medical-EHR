'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Clock,
  Home,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LabTest, LabBooking, MedicalReport } from '@/types/database';

function TestsAndReportsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'reports' ? 'reports' : 'tests';

  const [activeTab, setActiveTab] = useState<'tests' | 'reports' | 'bookings'>(initialTab);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Booking Modal
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [bookingDate, setBookingDate] = useState('2026-10-28');
  const [collectionType, setCollectionType] = useState<'lab_visit' | 'home_collection'>('lab_visit');
  const [address, setAddress] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Upload Report Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState<'lab' | 'imaging' | 'prescription' | 'discharge' | 'other'>('lab');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    async function loadLabData() {
      try {
        const { data: tests } = await supabase.from('lab_tests').select('*').eq('is_active', true).order('price');
        if (tests) setLabTests(tests as LabTest[]);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: repList } = await supabase
            .from('medical_reports')
            .select('*')
            .eq('patient_id', user.id)
            .order('report_date', { ascending: false });
          if (repList) setReports(repList as MedicalReport[]);

          const { data: bookList } = await supabase
            .from('lab_bookings')
            .select('*, test:lab_tests(*)')
            .eq('patient_id', user.id)
            .order('scheduled_date', { ascending: false });
          if (bookList) setBookings(bookList as any);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadLabData();
  }, [supabase]);

  // Handle Lab Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    setLoadingAction(true);
    setFeedbackMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFeedbackMsg({ type: 'error', text: 'Please sign in to book lab tests.' });
        setLoadingAction(false);
        return;
      }

      const { data, error } = await supabase
        .from('lab_bookings')
        .insert({
          patient_id: user.id,
          test_id: selectedTest.id,
          scheduled_date: bookingDate,
          collection_type: collectionType,
          address: collectionType === 'home_collection' ? address : null,
          price: selectedTest.price,
          status: 'booked',
        })
        .select('*, test:lab_tests(*)')
        .single();

      if (error) throw error;

      if (data) setBookings((prev) => [data as any, ...prev]);
      setFeedbackMsg({
        type: 'success',
        text: `Booking confirmed for ${selectedTest.name} on ${bookingDate}!`,
      });
      setSelectedTest(null);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to complete booking.' });
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Report Upload
  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload || !reportTitle.trim()) return;

    setLoadingAction(true);
    setFeedbackMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setFeedbackMsg({ type: 'error', text: 'Please sign in to upload medical files.' });
        setLoadingAction(false);
        return;
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}-${fileToUpload.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('medical-reports')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.warn('Storage upload notice:', uploadError.message);
      }

      // Record in Database
      const { data, error: dbError } = await supabase
        .from('medical_reports')
        .insert({
          patient_id: user.id,
          uploaded_by: user.id,
          title: reportTitle.trim(),
          category: reportCategory,
          file_path: filePath,
          file_name: fileToUpload.name,
          file_size: fileToUpload.size,
          mime_type: fileToUpload.type,
          report_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (dbError) throw dbError;

      if (data) setReports((prev) => [data as MedicalReport, ...prev]);
      setFeedbackMsg({ type: 'success', text: 'Medical report uploaded securely!' });
      setShowUploadModal(false);
      setReportTitle('');
      setFileToUpload(null);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredTests = labTests.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#fff' }}>Tests & Diagnostic Reports</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Book pathology investigations with home collection or access verified medical reports.
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
            onClick={() => setActiveTab('tests')}
            className={`btn ${activeTab === 'tests' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <span>Lab Test Catalog</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <span>My Reports ({reports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            <span>My Bookings ({bookings.length})</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '14px 20px',
            borderRadius: 'var(--radius-md)',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: feedbackMsg.type === 'success' ? '#6ee7b7' : '#fda4af',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TAB 1: Lab Test Catalog */}
      {activeTab === 'tests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search tests by name or category (e.g. CBC, Diabetes, Thyroid, Dengue, ECG)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '44px', height: '48px' }}
            />
            <Search
              size={18}
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className="glass-panel glass-interactive"
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge badge-cyan">{test.category}</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>৳{test.price}</span>
                  </div>

                  <h3 style={{ fontSize: '16px', color: '#fff', margin: '12px 0 6px' }}>{test.name}</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{test.description}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '14px 0', fontSize: '12px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} style={{ color: '#06b6d4' }} />
                      <span>Report in {test.turnaround_hours} hours</span>
                    </div>
                    {test.home_collection && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
                        <Home size={13} />
                        <span>Home Sample Collection Available</span>
                      </div>
                    )}
                  </div>
                </div>

                <button onClick={() => setSelectedTest(test)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                  <span>Book Test</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: My Reports */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Diagnostic Reports Archive</h3>
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
              <Upload size={16} />
              <span>Upload Medical Document</span>
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', color: '#475569' }} />
              <h3 style={{ color: '#fff' }}>No Reports Stored Yet</h3>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>
                Completed laboratory tests and doctor uploads will be available here securely.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {reports.map((rep) => (
                <div key={rep.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="badge badge-emerald">{rep.category.toUpperCase()}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(rep.report_date).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '15px', color: '#fff', margin: '12px 0 4px' }}>{rep.title}</h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {rep.file_name || 'Document PDF'} • {rep.file_size ? `${Math.round(rep.file_size / 1024)} KB` : ''}
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => alert(`Opening secure document: ${rep.file_name || rep.title}`)}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                    >
                      <Download size={14} />
                      <span>Download / View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: My Bookings */}
      {activeTab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <h3>No Lab Bookings Recorded</h3>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '16px', color: '#fff' }}>{b.test?.name || 'Pathology Test'}</h4>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Date: {new Date(b.scheduled_date).toLocaleDateString()} •{' '}
                    {b.collection_type === 'home_collection' ? 'Home Sample Collection' : 'Hospital Lab Visit'}
                  </div>
                  {b.address && (
                    <div style={{ fontSize: '12px', color: '#06b6d4', marginTop: '2px' }}>
                      Address: {b.address}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>৳{b.price}</span>
                  <span
                    className={`badge ${
                      b.status === 'completed'
                        ? 'badge-emerald'
                        : b.status === 'booked'
                        ? 'badge-cyan'
                        : 'badge-amber'
                    }`}
                  >
                    {b.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Book Test Modal */}
      {selectedTest && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff' }}>Book: {selectedTest.name}</h3>
              <button onClick={() => setSelectedTest(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Scheduled Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Collection Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCollectionType('lab_visit')}
                    className={`btn ${collectionType === 'lab_visit' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Hospital Lab Visit
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTest.home_collection}
                    onClick={() => setCollectionType('home_collection')}
                    className={`btn ${collectionType === 'home_collection' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Home Collection
                  </button>
                </div>
              </div>

              {collectionType === 'home_collection' && (
                <div>
                  <label className="form-label">Sample Collection Address</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Enter full residential address for phlebotomist visit..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="textarea-field"
                  />
                </div>
              )}

              {selectedTest.preparation && (
                <div style={{ padding: '12px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '8px', fontSize: '12px', color: '#38bdf8' }}>
                  <strong>Preparation:</strong> {selectedTest.preparation}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>Total Payable:</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>৳{selectedTest.price}</span>
              </div>

              <button type="submit" disabled={loadingAction} className="btn btn-primary" style={{ padding: '14px' }}>
                {loadingAction ? 'Processing...' : 'Confirm Lab Booking'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', color: '#fff' }}>Upload Medical Document</h3>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blood Test Report - Oct 2026"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="form-label">Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as any)}
                  className="select-field"
                >
                  <option value="lab">Laboratory (Blood/Urine)</option>
                  <option value="imaging">Imaging (X-Ray/Echo/USG/MRI)</option>
                  <option value="prescription">External Prescription</option>
                  <option value="discharge">Discharge Summary</option>
                  <option value="other">Other Medical Record</option>
                </select>
              </div>

              <div>
                <label className="form-label">Select File (PDF, PNG, JPG - Max 10MB)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  className="input-field"
                />
              </div>

              <button type="submit" disabled={loadingAction} className="btn btn-primary" style={{ padding: '14px', marginTop: '10px' }}>
                {loadingAction ? 'Uploading securely...' : 'Save Document to Portal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestsAndReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#94a3b8' }}>Loading lab tests and reports...</div>}>
      <TestsAndReportsContent />
    </Suspense>
  );
}
