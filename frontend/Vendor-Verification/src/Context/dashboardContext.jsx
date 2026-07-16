import { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  getDashboardSummary,
  getVendors,
  getVendorVerificationDetail,
} from "../Services/dashboardService";

const VendorDashboardContext = createContext(null);

export function VendorDashboardProvider({ children }) {
  const [summary, setSummary] = useState(null);

  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load dashboard summary", err);
    }
  }, []);

  const fetchVendors = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVendors({ page, limit: 10, status: statusFilter, search });
        setVendors(data.vendors);
        setPagination(data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load vendors");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  const openVendorDetail = useCallback(async (vendorId) => {
    setSelectedVendorId(vendorId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await getVendorVerificationDetail(vendorId);
      setDetail(data);
    } catch (err) {
      console.error("Failed to load vendor detail", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedVendorId(null);
    setDetail(null);
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchVendors(1);
  }, [fetchVendors]);

  const value = {
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
  };

  return (
    <VendorDashboardContext.Provider value={value}>
      {children}
    </VendorDashboardContext.Provider>
  );
}

export function useVendorDashboard() {
  const ctx = useContext(VendorDashboardContext);
  if (!ctx) {
    throw new Error("useVendorDashboard must be used within a VendorDashboardProvider");
  }
  return ctx;
}