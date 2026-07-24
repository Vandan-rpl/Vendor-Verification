import { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';

const STATUS_STYLES = {
  sent:      { bg: '#e0e7ff', color: '#3730a3', label: 'Sent' },
  opened:    { bg: '#fef9c3', color: '#854d0e', label: 'Opened' },
  confirmed: { bg: '#dcfce7', color: '#166534', label: 'Confirmed' },
  updated:   { bg: '#fee2e2', color: '#991b1b', label: 'Updated' },
  expired:   { bg: '#f1f5f9', color: '#475569', label: 'Expired' },
  bounced:   { bg: '#fce7f3', color: '#9d174d', label: 'Bounced' }
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#334155', label: status };
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.8rem',
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.color
    }}>
      {style.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function VendorResponse() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [changesModal, setChangesModal] = useState(null); // { requestId, original, submitted } | null
  const [changesLoading, setChangesLoading] = useState(false);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/api/verification/responses', {
        params: {
          status: statusFilter || undefined,
          search: search || undefined,
        },
      });

      setRows(response.data?.data || []);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to load responses.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  async function handleViewChanges(requestId) {
    setChangesLoading(true);
    setChangesModal({ requestId, original: null, submitted: null });
    try {
      const response = await api.get(`/api/verification/responses/${requestId}/changes`);
      setChangesModal({ requestId, ...response.data });
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to load changes.';
      setChangesModal({ requestId, error: message });
    } finally {
      setChangesLoading(false);
    }
  }

  const counts = rows.reduce((acc, r) => {
    acc[r.Status] = (acc[r.Status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Vendor Response</h1>
      <p style={{ color: '#64748b', marginTop: 0, marginBottom: '1.25rem' }}>
        Track every verification request and its current status.
      </p>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <SummaryCard label="Total" value={rows.length} />
        <SummaryCard label="Sent" value={counts.sent || 0} />
        <SummaryCard label="Opened" value={counts.opened || 0} />
        <SummaryCard label="Confirmed" value={counts.confirmed || 0} />
        <SummaryCard label="Updated" value={counts.updated || 0} />
        <SummaryCard label="Expired" value={counts.expired || 0} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="opened">Opened</option>
          <option value="confirmed">Confirmed</option>
          <option value="updated">Updated</option>
          <option value="expired">Expired</option>
          <option value="bounced">Bounced</option>
        </select>

        <input
          type="text"
          placeholder="Search vendor name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1 }}
        />
      </div>

      {errorMsg && <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{errorMsg}</div>}
      {loading && <div>Loading…</div>}

      {!loading && !errorMsg && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.5rem' }}>Vendor</th>
              <th style={{ padding: '0.5rem' }}>Email</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Sent At</th>
              <th style={{ padding: '0.5rem' }}>Opened At</th>
              <th style={{ padding: '0.5rem' }}>Responded At</th>
              <th style={{ padding: '0.5rem' }}>Reminders</th>
              <th style={{ padding: '0.5rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '1rem', color: '#64748b' }}>No records found.</td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.RequestId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem' }}>{row.VendorName}</td>
                <td style={{ padding: '0.5rem' }}>{row.Email}</td>
                <td style={{ padding: '0.5rem' }}><StatusBadge status={row.Status} /></td>
                <td style={{ padding: '0.5rem' }}>{formatDate(row.SentAt)}</td>
                <td style={{ padding: '0.5rem' }}>{formatDate(row.OpenedAt)}</td>
                <td style={{ padding: '0.5rem' }}>{formatDate(row.RespondedAt)}</td>
                <td style={{ padding: '0.5rem' }}>{row.ReminderCount}</td>
                <td style={{ padding: '0.5rem' }}>
                  {row.Status === 'updated' && (
                    <button
                      onClick={() => handleViewChanges(row.RequestId)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      View Changes
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {changesModal && (
        <ChangesModal
          modal={changesModal}
          loading={changesLoading}
          onClose={() => setChangesModal(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={{
      padding: '0.6rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      minWidth: '90px'
    }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{label}</div>
    </div>
  );
}

function ChangesModal({ modal, loading, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
    }}>
      <div style={{ background: '#fff', borderRadius: '10px', padding: '1.5rem', width: 'auto', maxWidth: '90%' }}>
        <h3 style={{ marginTop: 0 }}>Submitted Changes</h3>

        {loading && <div>Loading…</div>}
        {modal.error && <div style={{ color: '#b91c1c' }}>{modal.error}</div>}

        {modal.original && modal.submitted && (
          <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.4rem' }}>Field</th>
                <th style={{ textAlign: 'left', padding: '0.4rem' }}>Original</th>
                <th style={{ textAlign: 'left', padding: '0.4rem' }}>Submitted</th>
              </tr>
            </thead>
            <tbody>
              <ChangeRow label="Name" original={modal.original.Name} submitted={modal.submitted.VendorName} />
              <ChangeRow label="Mobile" original={modal.original.MobileNumber} submitted={modal.submitted.ContactNumber} />
              <ChangeRow label="Email" original={modal.original.Email} submitted={modal.submitted.Email} />
              <ChangeRow label="Address" original={modal.original.Address} submitted={modal.submitted.Address} />
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeRow({ label, original, submitted }) {
  const changed = (original || '') !== (submitted || '');
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '0.4rem', fontWeight: 600 }}>{label}</td>
      <td style={{ padding: '0.4rem' }}>{original || '—'}</td>
      <td style={{ padding: '0.4rem', color: changed ? '#b91c1c' : 'inherit', fontWeight: changed ? 600 : 400 }}>
        {submitted || '—'}
      </td>
    </tr>
  );
}

export default VendorResponse;