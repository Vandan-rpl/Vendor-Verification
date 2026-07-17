import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  startVerificationEmails,
  getUploadedVendors,
  uploadVendorExcel,
} from "../Services/uploadService";

function VendorUpload() {
  const [verifying, setVerifying] = useState(false);
  const [previewVendors, setPreviewVendors] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchPreviewVendors = async () => {
    try {
      setPreviewLoading(true);
      const response = await getUploadedVendors();
      setPreviewVendors(response?.vendors || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch vendor records."
      );
      setPreviewVendors([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviewVendors();
  }, []);

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
      await uploadVendorExcel(file);
      toast.success("Excel uploaded successfully.");
      await fetchPreviewVendors();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to upload Excel file."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleStartVerification = async () => {
    if (previewVendors.length === 0) {
      toast.error("No vendor records available to verify.");
      return;
    }

    try {
      setVerifying(true);
      const response = await startVerificationEmails();
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

  return (
    <div className="w-full max-w-5xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/70">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Vendor Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Existing vendor records are fetched from the database below. Start verification when you are ready.
        </p>
      </div>

      <div className="mt-8 border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
        <div className="flex flex-col gap-4 rounded-xl border border-dashed border-sky-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Upload Vendor Excel
            </h2>
            <p className="text-sm text-slate-500">
              Import vendor records anytime, even if there are no existing rows in the database yet.
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
              onClick={handleStartVerification}
              disabled={verifying || previewVendors.length === 0}
              className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {verifying ? "Starting..." : "Start Verification"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-lg font-semibold text-slate-800">
            Fetched Vendor Records
          </h3>
          <p className="text-sm text-slate-500">
            Showing the vendor data already stored in the database.
          </p>
        </div>

        {previewLoading ? (
          <div className="mt-5 text-sm text-slate-500">Loading preview...</div>
        ) : previewVendors.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Vendor</th>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">City</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {previewVendors.map((vendor) => (
                  <tr key={vendor.VendorId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700">
                      {vendor.VendorName}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{vendor.VendorCode}</td>
                    <td className="px-3 py-2 text-slate-600">{vendor.City || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{vendor.State || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 text-sm text-slate-500">
            No vendor records were found in the database.
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorUpload;
