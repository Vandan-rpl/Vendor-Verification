import { useState } from "react";
import { useAuth } from "../Context/authContext";

function VendorUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const { isAuthenticated } = useAuth();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/70">
      {/* Header Context */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Upload Vendor Excel
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Select or drag an Excel file to quickly import your vendor data.
        </p>
      </div>

      {/* Hidden Native Input & Styled Dropzone Label */}
      <div className="relative">
        <input
          id="vendor-excel"
          type="file"
          className="sr-only" // Completely hides native button safely for accessibility
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
        />

        <label
          htmlFor="vendor-excel"
          className="flex flex-col items-center justify-center w-full min-h-[180px] px-6 py-8 border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl cursor-pointer transition-all duration-200 group text-center"
        >
          {/* Upload Icon */}
          <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors duration-200 mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
          </div>

          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors duration-200">
            Click to upload or drag and drop
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Supported formats: .xlsx, .xls, .csv
          </span>
        </label>
      </div>

      {/* Selected File Feedback Banner */}
      {selectedFile && (
        <div className="mt-5 flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 animate-fadeIn">
          {/* Success File Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-emerald-600 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
              Selected File
            </p>
            <p className="text-sm font-semibold truncate text-slate-800">
              {selectedFile.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorUpload;
