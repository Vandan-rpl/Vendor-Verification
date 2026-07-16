import { useVendorDashboard, VendorDashboardProvider } from "../Context/dashboardContext";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${style}`}>
      {status}
    </span>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value ?? "—"}</p>
    </div>
  );
}

function VendorDashboardContent() {
  const {
    summary,
    vendors,
    pagination,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    loading,
    error,
    fetchVendors,
    selectedVendorId,
    detail,
    detailLoading,
    openVendorDetail,
    closeDetail,
  } = useVendorDashboard();

  return (
    <div className="w-full max-w-6xl mx-auto my-10 px-6">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">
        Vendor Verification Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Vendors" value={summary?.totalVendors} accent="text-slate-800" />
        <SummaryCard label="Pending" value={summary?.pending} accent="text-amber-600" />
        <SummaryCard label="Verified" value={summary?.verified} accent="text-emerald-600" />
        <SummaryCard label="Rejected" value={summary?.rejected} accent="text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by vendor name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Main Vendor Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Vendor Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Emails Verified</th>
              <th className="px-4 py-3">Last Verified</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Loading vendors...
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && vendors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No vendors match these filters.
                </td>
              </tr>
            )}

            {!loading && !error && vendors.map((v) => (
              <tr key={v.VendorId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-600">{v.VendorCode}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{v.VendorName}</td>
                <td className="px-4 py-3 text-slate-600">{v.City || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={v.Status} /></td>
                <td className="px-4 py-3 text-slate-600">
                  {v.VerifiedEmails}/{v.TotalEmails}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {v.LastVerifiedAt ? new Date(v.LastVerifiedAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openVendorDetail(v.VendorId)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && !error && vendors.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} vendors)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVendors(pagination.page - 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVendors(pagination.page + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verification Request Detail Drawer */}
      {selectedVendorId && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Verification Details</h2>
              <button onClick={closeDetail} className="text-slate-400 hover:text-slate-600 text-sm">
                Close
              </button>
            </div>

            <div className="px-6 py-4">
              {detailLoading && <p className="text-sm text-slate-400">Loading...</p>}

              {!detailLoading && detail && (
                <>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-800">{detail.vendor.VendorName}</p>
                    <p className="text-xs text-slate-500">
                      Code: {detail.vendor.VendorCode} · {detail.vendor.City || "—"}
                    </p>
                    <div className="mt-2"><StatusBadge status={detail.vendor.Status} /></div>
                  </div>

                  <div className="space-y-3">
                    {detail.emails.length === 0 && (
                      <p className="text-sm text-slate-400">No emails on file for this vendor.</p>
                    )}

                    {detail.emails.map((e) => (
                      <div key={e.emailId} className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{e.email}</p>
                          <span className="text-xs text-slate-400 uppercase">{e.emailType}</span>
                        </div>

                        {e.requests.length === 0 && (
                          <p className="text-xs text-slate-400 mt-1">No verification email sent yet.</p>
                        )}

                        {e.requests.map((r) => (
                          <div key={r.requestId} className="mt-2 flex items-center justify-between text-xs">
                            <StatusBadge status={r.status} />
                            <span className="text-slate-500">
                              Sent {new Date(r.sentAt).toLocaleDateString()}
                              {r.verifiedAt && ` · Verified ${new Date(r.verifiedAt).toLocaleDateString()}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Exported page wraps the content in its own provider, so this page is
// self-contained and can be dropped into a route without extra setup.
export default function VendorDashboard() {
  return (
    <VendorDashboardProvider>
      <VendorDashboardContent />
    </VendorDashboardProvider>
  );
}