import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  startVerificationEmails,
  getUploadedVendors,
  uploadVendorExcel,
  deleteVendorBatch,
  getUploadBatches,
} from "../Services/uploadService";

function VendorUpload() {
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [uploadBatches, setUploadBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [fileSummary, setFileSummary] = useState(null);

  // Rows for the batch, only fetched/shown when the user opens the preview.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewVendors, setPreviewVendors] = useState([]);

  const fileInputRef = useRef(null);

  // Keep localStorage in sync so refreshing the page restores the card.
  useEffect(() => {
    fetchUploadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUploadBatches = async (preferredBatchId = null) => {
    try {
      setBatchLoading(true);
      const response = await getUploadBatches();
      const batches = response?.batches || [];
      setUploadBatches(batches);

      const selectedId = preferredBatchId
        ? preferredBatchId
        : batches[0]?.BatchId ?? null;

      if (selectedId) {
        const selectedBatch = batches.find((b) => b.BatchId === selectedId);
        if (selectedBatch) {
          await fetchBatchSummary(
            selectedId,
            selectedBatch.FileName,
            selectedBatch.CanDelete
          );
        }
      } else {
        setSelectedBatchId(null);
        setFileSummary(null);
        setPreviewVendors([]);
        setPreviewOpen(false);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch uploaded batches."
      );
    } finally {
      setBatchLoading(false);
    }
  };

  // Pulls just the count (and optionally the rows) for a given batch from
  // the backend, so this screen never has to load the full vendor list
  // unless the user explicitly asks to preview it.
  const fetchBatchSummary = async (batchId, fileName, canDelete = false) => {
    try {
      setSummaryLoading(true);
      const response = await getUploadedVendors(batchId);
      const rowCount =
        response?.pagination?.totalCount ?? response?.vendors?.length ?? 0;

      setSelectedBatchId(batchId);
      setFileSummary({
        fileName: fileName || null,
        batchId: batchId ?? null,
        rowCount,
        canDelete,
      });
      // Cache rows from this same call so opening Preview doesn't need a
      // second request (capped at 100 by getUploadedVendors already).
      setPreviewVendors(response?.vendors || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch vendor summary."
      );
      setFileSummary(null);
      setPreviewVendors([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      toast.error("Please upload a valid Excel or CSV file.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const response = await uploadVendorExcel(file);
      toast.success("Excel uploaded successfully.");

      const batchId = response?.batchId ?? null;
      setPreviewOpen(false);
      await fetchUploadBatches(batchId);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to upload Excel file."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleStartVerification = async (batchId) => {
    if (!batchId) {
      toast.error("No batch selected for verification.");
      return;
    }

    try {
      setVerifying(true);
      const response = await startVerificationEmails(batchId);
      toast.success(response.message || "Verification process started.");
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to start verification."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteBatch = async (batchId, fileName, rowCount) => {
    if (!batchId) return;

    const confirmed = window.confirm(
      `Delete "${fileName || "this file"}" and its ${rowCount} row(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteVendorBatch(batchId);
      toast.success("Excel batch deleted.");
      await fetchUploadBatches();
      setPreviewOpen(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete this batch."
      );
    } finally {
      setDeleting(false);
    }
  };

  const hasSummary = !!fileSummary;
  const hasData = !!fileSummary && fileSummary.rowCount > 0;

  const formatRowCount = (count) =>
    count > 0 ? `${count} row${count !== 1 ? "s" : ""}` : "Completed";

  const handleSelectBatch = async (batch) => {
    setPreviewOpen(false);
    await fetchBatchSummary(batch.BatchId, batch.FileName, batch.CanDelete);
  };

  return (
  <div className="w-full max-w-5xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/70">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
        Vendor Verification
      </h1>
      <p className="text-sm text-slate-500 mt-1">
        Upload a vendor excel to start a new verification batch.
      </p>
    </div>

    <div className="mt-8 border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-sky-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Upload Vendor Excel
          </h2>
          <p className="text-sm text-slate-500">
            Import vendor records to start a new verification batch.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
            className="px-6 py-2 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload Excel"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={() => handleStartVerification(selectedBatchId)}
            disabled={verifying || !hasData}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {verifying ? "Starting..." : "Start Verification"}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-lg font-semibold text-slate-800">
          Uploaded Excel Batches
        </h3>
        <p className="text-sm text-slate-500">
          View all uploaded Excel files and start verification per batch.
        </p>
      </div>

      {batchLoading ? (
        <div className="mt-5 text-sm text-slate-500">Loading batches...</div>
      ) : uploadBatches.length === 0 ? (
        <div className="mt-5 text-sm text-slate-500">
          No excel uploaded yet. Upload a file to see its details here.
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            {uploadBatches.map((batch) => (
              <div
                key={batch.BatchId}
                className={`rounded-xl border p-4 ${
                  selectedBatchId === batch.BatchId
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {batch.FileName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatRowCount(batch.TotalRows)} • Success {batch.SuccessRows} • Failed {batch.FailedRows}
                    </p>
                    <p className="text-xs text-slate-400">
                      Uploaded {new Date(batch.UploadedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectBatch(batch)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                    >
                      Select
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartVerification(batch.BatchId)}
                      disabled={verifying}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {verifying ? "Starting..." : "Start Verification"}
                    </button>

                    {!!batch.CanDelete && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteBatch(batch.BatchId, batch.FileName, batch.TotalRows)
                        }
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-semibold text-slate-800">
              Selected Batch Preview
            </h4>
            <p className="text-sm text-slate-500">
              Preview rows for the currently selected batch.
            </p>
          </div>

          {summaryLoading ? (
            <div className="mt-5 text-sm text-slate-500">
              Loading summary...
            </div>
          ) : hasSummary ? (
            <>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 font-semibold">
                    XLS
                  </div>

                  <div>
                    <p className="font-medium text-slate-800">
                      {!!fileSummary.fileName || "Uploaded file"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatRowCount(fileSummary.rowCount)} in this batch
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((open) => !open)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    {previewOpen ? "Hide Preview" : "Preview"}
                  </button>

                  {fileSummary?.canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteBatch(
                          fileSummary.batchId,
                          fileSummary.fileName,
                          fileSummary.rowCount
                        )
                      }
                      disabled={deleting}
                      className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>

              {previewOpen && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Vendor</th>
                        <th className="px-3 py-2 font-semibold">Code</th>
                        <th className="px-3 py-2 font-semibold">City</th>
                        <th className="px-3 py-2 font-semibold">State</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">
                      {previewVendors.map((vendor) => (
                        <tr key={vendor.VendorId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-700">
                            {vendor.VendorName}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {vendor.VendorCode}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {vendor.City || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {vendor.State || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-600 capitalize">
                            {vendor.Status || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {fileSummary.rowCount > previewVendors.length && (
                    <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50">
                      Showing first {previewVendors.length} of {" "}
                      {fileSummary.rowCount} rows.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 text-sm text-slate-500">
              No excel uploaded yet. Upload a file to see its details here.
            </div>
          )}
        </>
      )}
    </div>
  </div>
);
}

export default VendorUpload;