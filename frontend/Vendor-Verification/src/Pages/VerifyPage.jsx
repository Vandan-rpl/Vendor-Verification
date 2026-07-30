import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { confirmVerification, getVerificationDetails, updateVerification } from '../Services/verifyService';

const DOCUMENT_SLOTS = [
  { type: 'GST', label: 'GST Certificate', required: true },
  { type: 'Aadhar', label: 'Aadhar Card', required: true },
  { type: 'Invoice', label: 'Invoice', required: false }
];

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

  const [slotFiles, setSlotFiles] = useState({ GST: null, Aadhar: null, Invoice: null });

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

  function getMissingRequiredSlots() {
    return DOCUMENT_SLOTS.filter((slot) => slot.required && !slotFiles[slot.type]);
  }

  function handleSlotFileChange(type, e) {
    const file = e.target.files && e.target.files[0];
    setSlotFiles((prev) => ({ ...prev, [type]: file || null }));
  }

  function handleRemoveSlotFile(type) {
    setSlotFiles((prev) => ({ ...prev, [type]: null }));
  }

  function buildDocumentFormData(base) {
    const formData = new FormData();
    Object.entries(base).forEach(([key, value]) => formData.append(key, value));
    DOCUMENT_SLOTS.forEach((slot) => {
      if (slotFiles[slot.type]) {
        formData.append(slot.type, slotFiles[slot.type]);
      }
    });
    return formData;
  }

  async function handleConfirm() {
    setSubmitState('submitting');
    setSubmitMsg('');
    try {
      const response = await confirmVerification(token, new FormData());
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

    const missing = getMissingRequiredSlots();
    if (missing.length) {
      setSubmitState('error');
      setSubmitMsg(`Please attach: ${missing.map((s) => s.label).join(', ')} before submitting.`);
      return;
    }

    setSubmitState('submitting');
    setSubmitMsg('');
    try {
      const formData = buildDocumentFormData(form);
      const response = await updateVerification(token, formData);
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

  function renderDocumentSection() {
    return (
      <div className="my-6 border-y border-slate-200 py-5">
        <h3 className="text-base font-semibold text-slate-900">
          Supporting Documents
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          GST and Aadhar Card are required. Invoice is optional.
        </p>

        <div className="space-y-4">
          {DOCUMENT_SLOTS.map((slot) => {
            const selectedFile = slotFiles[slot.type];
            return (
              <div key={slot.type} className="flex flex-col">
                <label className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {slot.label}
                  {slot.required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>

                {selectedFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-center space-x-2 truncate">
                      <svg
                        className="h-5 w-5 shrink-0 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span
                        className="truncate text-xs font-medium text-slate-700"
                        title={selectedFile.name}
                      >
                        {selectedFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ml-2 text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => handleRemoveSlotFile(slot.type)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    onChange={(e) => handleSlotFileChange(slot.type, e)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const containerClass =
    "mx-auto my-12 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm";

  if (loadState === 'loading') {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center space-x-2 py-8 text-slate-500">
          <svg className="h-5 w-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Loading your details…</span>
        </div>
      </div>
    );
  }

  if (loadState === 'expired') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Link Expired</h2>
          <p className="mt-2 text-sm text-slate-600">
            This verification link is no longer valid. Please contact us to receive a new one.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Something Went Wrong</h2>
          <p className="mt-2 text-sm text-slate-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (loadState === 'already') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Already {alreadyStatus === 'updated' ? 'Submitted' : 'Confirmed'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {alreadyStatus === 'updated'
              ? 'You have already submitted updated details for this request.'
              : 'You have already confirmed your details for this request.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitState === 'done') {
    return (
      <div className={containerClass}>
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Thank You</h2>
          <p className="mt-2 text-sm text-slate-600">{submitMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Confirm Your Details
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Please review the details below and let us know if they are correct, or update anything that's changed.
        </p>
      </div>

      {mode === 'view' && (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 p-4">
            <div className="pb-2.5">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Name</span>
              <span className="text-sm font-medium text-slate-800">{vendor.name || '—'}</span>
            </div>
            <div className="py-2.5">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Mobile Number</span>
              <span className="text-sm font-medium text-slate-800">{vendor.mobileNumber || '—'}</span>
            </div>
            <div className="py-2.5">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Email</span>
              <span className="text-sm font-medium text-slate-800">{vendor.email || '—'}</span>
            </div>
            <div className="pt-2.5">
              <span className="block text-2xs font-semibold uppercase tracking-wider text-slate-400">Address</span>
              <span className="text-sm font-medium text-slate-800">{vendor.address || '—'}</span>
            </div>
          </div>

          {submitState === 'error' && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
              {submitMsg}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleConfirm}
              disabled={submitState === 'submitting'}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 disabled:opacity-60"
            >
              {submitState === 'submitting' ? 'Confirming…' : 'All details are correct'}
            </button>
            <button
              onClick={() => setMode('edit')}
              disabled={submitState === 'submitting'}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Some details need updating
            </button>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Mobile Number
            </label>
            <input
              type="text"
              value={form.mobileNumber}
              onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Address
            </label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {renderDocumentSection()}

          {submitState === 'error' && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600">
              {submitMsg}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 disabled:opacity-60"
            >
              {submitState === 'submitting' ? 'Submitting…' : 'Submit updated details'}
            </button>
            <button
              type="button"
              onClick={() => setMode('view')}
              disabled={submitState === 'submitting'}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}