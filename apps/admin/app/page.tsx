'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { InspectionRequest, WorkshopPartner } from '@tgmg/types';

type QueueResponse = {
  data: InspectionRequest[];
  total: number;
  page: number;
  totalPages: number;
  summary?: Record<string, number>;
};

const STATUS_OPTIONS = [
  'REQUESTED',
  'BOOKED',
  'WORKSHOP_VERIFIED',
  'POLICE_VERIFIED',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
const DEFAULT_ADMIN_EMAIL = 'admin@tgmg.pk';
const DEFAULT_ADMIN_PASSWORD = 'Admin@12345';

type WorkshopFormState = {
  name: string;
  city: string;
  address: string;
  contact: string;
  active: boolean;
};

const emptyWorkshop: WorkshopFormState = {
  name: '',
  city: 'Lahore',
  address: '',
  contact: '',
  active: true,
};

function statusTone(status: string) {
  if (status === 'APPROVED') return '#157347';
  if (status === 'REJECTED' || status === 'EXPIRED') return '#b42318';
  if (status === 'SUBMITTED') return '#1d4ed8';
  return '#475467';
}

export default function AdminHomePage() {
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [token, setToken] = useState('');
  const [city, setCity] = useState('Lahore');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [workshops, setWorkshops] = useState<WorkshopPartner[]>([]);
  const [workshopForm, setWorkshopForm] = useState<WorkshopFormState>(emptyWorkshop);
  const [editingWorkshopId, setEditingWorkshopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingWorkshop, setSavingWorkshop] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('tgmg_admin_jwt');
    if (stored) setToken(stored);
  }, []);

  const headers = useMemo((): Record<string, string> => {
    if (!token.trim()) return {};
    return { Authorization: `Bearer ${token.trim()}` };
  }, [token]);

  const loadQueue = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (city.trim()) params.set('city', city.trim());
      if (status) params.set('status', status);

      const response = await fetch(`${API_BASE}/inspections/admin/queue?${params.toString()}`, {
        headers,
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `Queue fetch failed: ${response.status}`);
      }
      setQueue((await response.json()) as QueueResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Queue fetch error');
      setQueue(null);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkshops = async () => {
    if (!token.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/inspections/admin/workshops`, { headers });
      if (!response.ok) {
        throw new Error((await response.text()) || `Workshop fetch failed: ${response.status}`);
      }
      setWorkshops((await response.json()) as WorkshopPartner[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workshop fetch error');
    }
  };

  useEffect(() => {
    if (!token.trim()) return;
    void loadQueue();
    void loadWorkshops();
  }, [token, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async () => {
    setAuthLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE}/auth/admin-sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || 'Admin sign-in failed');
      }
      const data = await response.json();
      const nextToken = data.accessToken as string;
      setToken(nextToken);
      localStorage.setItem('tgmg_admin_jwt', nextToken);
      setSuccess('Admin login successful.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin sign-in error');
    } finally {
      setAuthLoading(false);
    }
  };

  const submitDecision = async (id: string, action: 'approve' | 'reject') => {
    if (!token.trim()) return;
    setActiveId(id);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE}/inspections/${id}/admin-${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(
          action === 'approve'
            ? { badgeLabel: 'TGMG Inspected', note: decisionNote.trim() || 'Inspection approved' }
            : { note: decisionNote.trim() || 'PDF / inspection form requires correction' },
        ),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `Decision failed: ${response.status}`);
      }
      await loadQueue();
      setSuccess(action === 'approve' ? 'Listing approved.' : 'Inspection rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision error');
    } finally {
      setActiveId('');
    }
  };

  const saveWorkshop = async () => {
    if (!token.trim()) return;
    const normalizedWorkshop = {
      name: workshopForm.name.trim(),
      city: workshopForm.city.trim(),
      address: workshopForm.address.trim(),
      contact: workshopForm.contact.trim(),
      active: workshopForm.active,
    };
    if (!normalizedWorkshop.name || !normalizedWorkshop.city || !normalizedWorkshop.address || !normalizedWorkshop.contact) {
      setError('Workshop name, city, address, aur contact sab required hain.');
      return;
    }
    setSavingWorkshop(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(
        `${API_BASE}/inspections/admin/workshops${editingWorkshopId ? `/${editingWorkshopId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(normalizedWorkshop),
        },
      );
      if (!response.ok) {
        throw new Error((await response.text()) || 'Workshop save failed');
      }
      setWorkshopForm(emptyWorkshop);
      setEditingWorkshopId('');
      await loadWorkshops();
      setSuccess(editingWorkshopId ? 'Workshop updated.' : 'Workshop added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workshop save error');
    } finally {
      setSavingWorkshop(false);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Admin Console</div>
          <h1 style={{ margin: '6px 0 0', fontSize: 34 }}>TGMG Admin</h1>
          <p style={{ marginTop: 10, color: '#475467', maxWidth: 720 }}>
            Vehicle ad approval, workshop management, and inspection compliance queue.
          </p>
        </div>
        <div style={heroMetricGrid}>
          <div style={heroMetricCard}>
            <div style={heroMetricLabel}>Queue</div>
            <div style={heroMetricValue}>{queue?.total ?? 0}</div>
          </div>
          <div style={heroMetricCard}>
            <div style={heroMetricLabel}>Workshops</div>
            <div style={heroMetricValue}>{workshops.length}</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={headingStyle}>Admin Login</h2>
        <div style={grid2Style}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" style={inputStyle} />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" type="password" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <button onClick={() => void signIn()} style={primaryButton} disabled={authLoading}>
            {authLoading ? 'Signing in...' : 'Admin Sign In'}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('tgmg_admin_jwt');
              setToken('');
              setQueue(null);
            }}
            style={secondaryButton}
          >
            Logout
          </button>
        </div>
        <div style={{ marginTop: 10, color: '#667085', fontSize: 13 }}>
          Default admin: <strong>{DEFAULT_ADMIN_EMAIL}</strong> / <strong>{DEFAULT_ADMIN_PASSWORD}</strong>
        </div>
      </section>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {success ? <div style={successStyle}>{success}</div> : null}

      {queue?.summary ? (
        <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {Object.entries(queue.summary).map(([key, value]) => (
            <div key={key} style={{ border: '1px solid #eaecf0', borderRadius: 12, background: '#fff', padding: 14 }}>
              <div style={{ color: '#475467', fontSize: 12 }}>{key}</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </section>
      ) : null}

      <section style={cardStyle}>
        <div style={sectionBarStyle}>
          <div>
            <h2 style={headingStyle}>Workshop Directory</h2>
            <div style={subtleTextStyle}>Add, edit, aur activate/deactivate partner workshops.</div>
          </div>
          <div style={pillStyle}>{workshops.length} workshops</div>
        </div>
        <div style={grid2Style}>
          <input value={workshopForm.name} onChange={(event) => setWorkshopForm((current) => ({ ...current, name: event.target.value }))} placeholder="Workshop name" style={inputStyle} />
          <input value={workshopForm.city} onChange={(event) => setWorkshopForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" style={inputStyle} />
          <input value={workshopForm.address} onChange={(event) => setWorkshopForm((current) => ({ ...current, address: event.target.value }))} placeholder="Address" style={inputStyle} />
          <input value={workshopForm.contact} onChange={(event) => setWorkshopForm((current) => ({ ...current, contact: event.target.value }))} placeholder="Contact" style={inputStyle} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={workshopForm.active}
            onChange={(event) => setWorkshopForm((current) => ({ ...current, active: event.target.checked }))}
          />
          Active workshop
        </label>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button onClick={() => void saveWorkshop()} style={primaryButton} disabled={savingWorkshop}>
            {savingWorkshop ? 'Saving...' : editingWorkshopId ? 'Update Workshop' : 'Add Workshop'}
          </button>
          <button
            onClick={() => {
              setWorkshopForm(emptyWorkshop);
              setEditingWorkshopId('');
            }}
            style={secondaryButton}
          >
            Reset
          </button>
        </div>
        <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          {workshops.map((workshop) => (
            <div key={workshop.id} style={workshopCardStyle}>
              <div style={{ fontWeight: 800 }}>{workshop.name}</div>
              <div style={{ color: '#667085', fontSize: 13 }}>{workshop.city} • {workshop.contact}</div>
              <div style={{ color: '#667085', fontSize: 13 }}>{workshop.address}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  onClick={() => {
                    setEditingWorkshopId(workshop.id);
                    setWorkshopForm({
                      name: workshop.name,
                      city: workshop.city,
                      address: workshop.address,
                      contact: workshop.contact,
                      active: workshop.active,
                    });
                  }}
                  style={secondaryButton}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={headingStyle}>Inspection Queue</h2>
            <div style={subtleTextStyle}>Admin approval ke baad hi vehicle listing live hoti hai.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" style={inputStyle} />
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button onClick={() => void loadQueue()} style={primaryButton}>Refresh</button>
          </div>
        </div>

        <textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder="Approval / rejection note"
          style={{ ...inputStyle, minHeight: 90, marginTop: 12 }}
        />

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {(queue?.data ?? []).map((item) => (
            <div key={item.id} style={{ border: '1px solid #eaecf0', borderRadius: 14, background: '#fff', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{item.listing?.title || item.listingId}</div>
                  <div style={{ color: '#667085', fontSize: 13 }}>{item.listing?.city || '-'} • {item.workshopPartner?.name || '-'}</div>
                  <div style={{ color: statusTone(item.status), fontWeight: 800, marginTop: 6 }}>{item.status}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                  {item.report?.formPageFrontUrl ? (
                    <a href={item.report.formPageFrontUrl} target="_blank" rel="noreferrer" style={{ ...secondaryButton, textDecoration: 'none' }}>
                      Open PDF
                    </a>
                  ) : null}
                  {item.status === 'SUBMITTED' ? (
                    <>
                      <button onClick={() => void submitDecision(item.id, 'approve')} disabled={activeId === item.id} style={primaryButton}>
                        Approve Listing
                      </button>
                      <button onClick={() => void submitDecision(item.id, 'reject')} disabled={activeId === item.id} style={dangerButton}>
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {item.auditLogs?.length ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f2f4f7' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Audit Trail</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {item.auditLogs.slice(0, 5).map((log) => (
                      <div key={log.id} style={{ color: '#475467', fontSize: 13 }}>
                        {new Date(log.createdAt).toLocaleString()} • {log.action} {log.note ? `• ${log.note}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} style={secondaryButton}>
            Prev
          </button>
          <span style={{ color: '#475467' }}>
            Page {queue?.page ?? page} / {queue?.totalPages ?? 1}
          </span>
          <button
            onClick={() => setPage((value) => value + 1)}
            disabled={loading || (queue ? page >= queue.totalPages : false)}
            style={secondaryButton}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  padding: 24,
  fontFamily: 'system-ui, sans-serif',
  color: '#101828',
  background: 'linear-gradient(180deg, #eef2f7 0%, #f8fafc 100%)',
  minHeight: '100vh',
};

const heroStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  padding: 24,
  borderRadius: 24,
  background: 'linear-gradient(135deg, #101828 0%, #1d2939 100%)',
  color: '#ffffff',
  boxShadow: '0 28px 70px rgba(15, 23, 42, 0.18)',
};

const eyebrowStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const heroMetricGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))',
  gap: 12,
  alignSelf: 'stretch',
};

const heroMetricCard: CSSProperties = {
  borderRadius: 18,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: 16,
  minWidth: 120,
};

const heroMetricLabel: CSSProperties = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.72)',
};

const heroMetricValue: CSSProperties = {
  marginTop: 8,
  fontSize: 28,
  fontWeight: 800,
};

const cardStyle: CSSProperties = {
  marginTop: 18,
  border: '1px solid #dbe2ea',
  borderRadius: 20,
  padding: 20,
  background: '#ffffff',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const subtleTextStyle: CSSProperties = {
  marginTop: 6,
  color: '#667085',
  fontSize: 13,
};

const sectionBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  marginBottom: 12,
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  background: '#eef2ff',
  color: '#344054',
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 800,
};

const grid2Style: CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid #d0d5dd',
  width: '100%',
  background: '#f8fafc',
};

const primaryButton: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#101828',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #d0d5dd',
  background: '#fff',
  color: '#101828',
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerButton: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#b42318',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const errorStyle: CSSProperties = {
  marginTop: 16,
  borderRadius: 14,
  border: '1px solid #fecdca',
  background: '#fef3f2',
  color: '#b42318',
  padding: '12px 14px',
  fontWeight: 700,
};

const successStyle: CSSProperties = {
  marginTop: 16,
  borderRadius: 14,
  border: '1px solid #abefc6',
  background: '#ecfdf3',
  color: '#067647',
  padding: '12px 14px',
  fontWeight: 700,
};

const workshopCardStyle: CSSProperties = {
  border: '1px solid #eaecf0',
  borderRadius: 16,
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  padding: 16,
};

const activePillStyle: CSSProperties = {
  borderRadius: 999,
  background: '#ecfdf3',
  color: '#067647',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 800,
};

const inactivePillStyle: CSSProperties = {
  borderRadius: 999,
  background: '#f2f4f7',
  color: '#475467',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 800,
};
