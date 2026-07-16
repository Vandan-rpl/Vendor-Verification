import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { confirmVerification, getVerificationDetails, updateVerification } from '../Services/verifyService';

// Route this at: /verify/:token
export default function VerifyPage() {
  const { token } = useParams();

  const [loadState, setLoadState] = useState('loading'); // loading | ready | error | expired | already
  const [errorMsg, setErrorMsg] = useState('');
  const [vendor, setVendor] = useState(null);
  const [alreadyStatus, setAlreadyStatus] = useState('');

  const [mode, setMode] = useState('view'); // view | edit
  const [form, setForm] = useState({ name: '', mobileNumber: '', email: '', address: '' });

  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | done | error
  const [submitMsg, setSubmitMsg] = useState('');

  useEffect(() => {
    async function loadDetails() {
      try {
        const response = await getVerificationDetails(token);
        const data = response.data;

        if (response.status === 410) {
          setLoadState('expired');
          return;
        }
        if (response.status < 200 || response.status >= 300) {
          setErrorMsg(data.error || 'Something went wrong.');
          setLoadState('error');
          return;
        }

        if (data.alreadyResponded) {
          setAlreadyStatus(data.status);
          setVendor(data.vendor);
          setLoadState('already');
          return;
        }

        setVendor(data.vendor);
        setForm({
          name: data.vendor.name || '',
          mobileNumber: data.vendor.mobileNumber || '',
          email: data.vendor.email || '',
          address: data.vendor.address || ''
        });
        setLoadState('ready');
      } catch (err) {
        setErrorMsg('Unable to load your details. Please try again later.');
        setLoadState('error');
      }
    }

    loadDetails();
  }, [token]);

  async function handleConfirm() {
    setSubmitState('submitting');
    setSubmitMsg('');
    try {
      const response = await confirmVerification(token);
      const data = response.data;
      if (response.status < 200 || response.status >= 300) {
        throw new Error(data.error || 'Something went wrong.');
      }
      setSubmitState('done');
      setSubmitMsg(data.message);
    } catch (err) {
      setSubmitState('error');
      setSubmitMsg(err.message);
    }
  }

  async function handleUpdateSubmit(e) {
    e.preventDefault();
    setSubmitState('submitting');
    setSubmitMsg('');
    try {
      const response = await updateVerification(token, form);
      const data = response.data;
      if (response.status < 200 || response.status >= 300) {
        throw new Error(data.error || 'Something went wrong.');
      }
      setSubmitState('done');
      setSubmitMsg(data.message);
    } catch (err) {
      setSubmitState('error');
      setSubmitMsg(err.message);
    }
  }

  const pageStyle = {
    maxWidth: '480px',
    margin: '3rem auto',
    padding: '2rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontFamily: 'system-ui, sans-serif'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.7rem',
    marginTop: '0.3rem',
    marginBottom: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.95rem'
  };

  const primaryBtn = {
    padding: '0.6rem 1.2rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '0.6rem'
  };

  const secondaryBtn = {
    ...primaryBtn,
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '1px solid #cbd5e1'
  };

  if (loadState === 'loading') {
    return <div style={pageStyle}>Loading your details…</div>;
  }

  if (loadState === 'expired') {
    return (
      <div style={pageStyle}>
        <h2>Link expired</h2>
        <p>This verification link is no longer valid. Please contact us to receive a new one.</p>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div style={pageStyle}>
        <h2>Something went wrong</h2>
        <p>{errorMsg}</p>
      </div>
    );
  }

  if (loadState === 'already') {
    return (
      <div style={pageStyle}>
        <h2>Already {alreadyStatus === 'updated' ? 'submitted' : 'confirmed'}</h2>
        <p>
          {alreadyStatus === 'updated'
            ? 'You have already submitted updated details for this request.'
            : 'You have already confirmed your details for this request.'}
        </p>
      </div>
    );
  }

  if (submitState === 'done') {
    return (
      <div style={pageStyle}>
        <h2>Thank you</h2>
        <p>{submitMsg}</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h2>Confirm your details</h2>
      <p style={{ color: '#475569', fontSize: '0.9rem' }}>
        Please review the details below and let us know if they're correct, or update anything that's changed.
      </p>

      {mode === 'view' && (
        <>
          <div style={{ margin: '1.2rem 0' }}>
            <div><strong>Name:</strong> {vendor.name}</div>
            <div><strong>Mobile Number:</strong> {vendor.mobileNumber}</div>
            <div><strong>Email:</strong> {vendor.email}</div>
            <div><strong>Address:</strong> {vendor.address}</div>
          </div>

          {submitState === 'error' && (
            <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{submitMsg}</div>
          )}

          <button style={primaryBtn} onClick={handleConfirm} disabled={submitState === 'submitting'}>
            {submitState === 'submitting' ? 'Confirming…' : 'All details are correct'}
          </button>
          <button style={secondaryBtn} onClick={() => setMode('edit')} disabled={submitState === 'submitting'}>
            Some details need updating
          </button>
        </>
      )}

      {mode === 'edit' && (
        <form onSubmit={handleUpdateSubmit}>
          <label>
            Name
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Mobile Number
            <input
              style={inputStyle}
              value={form.mobileNumber}
              onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>

          <label>
            Address
            <textarea
              style={{ ...inputStyle, minHeight: '70px' }}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </label>

          {submitState === 'error' && (
            <div style={{ color: '#b91c1c', marginBottom: '1rem' }}>{submitMsg}</div>
          )}

          <button type="submit" style={primaryBtn} disabled={submitState === 'submitting'}>
            {submitState === 'submitting' ? 'Submitting…' : 'Submit updated details'}
          </button>
          <button type="button" style={secondaryBtn} onClick={() => setMode('view')} disabled={submitState === 'submitting'}>
            Back
          </button>
        </form>
      )}
    </div>
  );
}