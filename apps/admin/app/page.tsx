'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InspectionRequest } from '@tgmg/types';

type QueueResponse = {
  data: InspectionRequest[];
  total: number;
  page: number;
  totalPages: number;
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

function statusTone(status: string) {
  if (status === 'APPROVED') return '#157347';
  if (status === 'REJECTED' || status === 'EXPIRED') return '#b42318';
  if (status === 'SUBMITTED') return '#1d4ed8';
  return '#475467';
}

export default function AdminHomePage() {
  const [token, setToken] = useState('');
  const [city, setCity] = useState('Lahore');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('tgmg_admin_jwt');
    if (stored) {
      setToken(stored);
    }
  }, []);

  const headers = useMemo((): Record<string, string> => {
    if (!token.trim()) return {};
    return { Authorization: `Bearer ${token.trim()}` };
  }, [token]);

  const loadQueue = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
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
        const text = await response.text();
        throw new Error(text || `Queue fetch failed: ${response.status}`);
      }
      const data = (await response.json()) as QueueResponse;
      setQueue(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Queue fetch error');
      setQueue(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitDecision = async (id: string, action: 'approve' | 'reject') => {
    if (!token.trim()) return;
    setActiveId(id);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/inspections/${id}/admin-${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(
          action === 'approve'
            ? { badgeLabel: 'TGMG Inspected' }
            : { note: decisionNote.trim() || 'Manual recheck required' },
        ),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Decision failed: ${response.status}`);
      }
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision error');
    } finally {
      setActiveId('');
    }
  };

  return (
    <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#101828' }}>
      <h1 style={{ margin: 0, fontSize: '28px' }}>TGMG Admin</h1>
      <p style={{ marginTop: 8, color: '#475467' }}>Inspection Queue (Workshop + AVLS + Police)</p>

      <section style={{ marginTop: 16, border: '1px solid #eaecf0', borderRadius: 12, padding: 16, background: '#fff' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Admin JWT token"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d0d5dd' }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="City (e.g. Lahore)"
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d0d5dd', minWidth: 220 }}
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #d0d5dd', minWidth: 220 }}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                localStorage.setItem('tgmg_admin_jwt', token.trim());
                setPage(1);
                void loadQueue();
              }}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#101828', color: '#fff', fontWeight: 700 }}
            >
              Load Queue
            </button>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16, border: '1px solid #eaecf0', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Admin Decision Note</h2>
        <textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder="Default note for reject action"
          style={{ width: '100%', minHeight: 90, borderRadius: 10, border: '1px solid #d0d5dd', padding: 12 }}
        />
      </section>

      {error ? (
        <p style={{ marginTop: 16, color: '#b42318', fontWeight: 700 }}>{error}</p>
      ) : null}

      <section style={{ marginTop: 16, border: '1px solid #eaecf0', borderRadius: 12, background: '#fff' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #eaecf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Inspection Requests</strong>
          <span style={{ color: '#475467' }}>{loading ? 'Loading...' : `Total: ${queue?.total ?? 0}`}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                <th style={{ padding: 12 }}>Listing</th>
                <th style={{ padding: 12 }}>City</th>
                <th style={{ padding: 12 }}>Workshop</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Booked</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(queue?.data ?? []).map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #f2f4f7' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{item.listing?.title || item.listingId}</div>
                    <div style={{ color: '#667085', fontSize: 12 }}>{item.id}</div>
                  </td>
                  <td style={{ padding: 12 }}>{item.listing?.city || '-'}</td>
                  <td style={{ padding: 12 }}>{item.workshopPartner?.name || '-'}</td>
                  <td style={{ padding: 12, color: statusTone(item.status), fontWeight: 700 }}>{item.status}</td>
                  <td style={{ padding: 12 }}>{item.bookedDate ? new Date(item.bookedDate).toLocaleString() : '-'}</td>
                  <td style={{ padding: 12 }}>
                    {item.status === 'SUBMITTED' ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => void submitDecision(item.id, 'approve')}
                          disabled={activeId === item.id}
                          style={{ borderRadius: 8, border: 'none', background: '#157347', color: '#fff', padding: '8px 12px', fontWeight: 700 }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void submitDecision(item.id, 'reject')}
                          disabled={activeId === item.id}
                          style={{ borderRadius: 8, border: 'none', background: '#b42318', color: '#fff', padding: '8px 12px', fontWeight: 700 }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#667085' }}>No action</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && (queue?.data?.length ?? 0) === 0 ? (
                <tr>
                  <td style={{ padding: 16, color: '#667085' }} colSpan={6}>
                    No inspection requests found for selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #eaecf0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || loading}
            style={{ borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', padding: '8px 12px' }}
          >
            Prev
          </button>
          <span style={{ color: '#475467' }}>
            Page {queue?.page ?? page} / {queue?.totalPages ?? 1}
          </span>
          <button
            onClick={() => setPage((value) => value + 1)}
            disabled={loading || (queue ? page >= queue.totalPages : false)}
            style={{ borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', padding: '8px 12px' }}
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
