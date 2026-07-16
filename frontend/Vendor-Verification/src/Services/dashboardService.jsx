// Assumes services/api.jsx exports a default axios instance with baseURL
// already set (e.g. "http://localhost:5000/api"). If your baseURL does NOT
// include "/api", prefix these paths with "/api" below.
import api from "./api";

export const getDashboardSummary = async () => {
  const res = await api.get("/api/summary");
  return res.data.summary;
};

export const getVendors = async ({ page = 1, limit = 10, status, search } = {}) => {
  const res = await api.get("/api/getVendorList", {
    params: {
      page,
      limit,
      status: status || undefined,
      search: search || undefined,
    },
  });
  return res.data; // { success, vendors, pagination }
};

export const getVendorVerificationDetail = async (vendorId) => {
  const res = await api.get(`/api/${vendorId}/verification-details`);
  return res.data; // { success, vendor, emails }
};