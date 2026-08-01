import api from "./api";

export const uploadVendorExcel = async (file) => {
  const formData = new FormData();

  formData.append("file", file, file.name); // "file" should match multer field name

  const response = await api.post(`/api/upload`, formData, {
    withCredentials: true,
  });

  return response.data;
};

export const getUploadedVendors = async (batchId) => {
  const response = await api.get("/api/getVendorList", {
    params: { batchId, limit: 100 },
    withCredentials: true,
  });

  return response.data;
};

export const getUploadBatches = async () => {
  const response = await api.get("/api/getUploadBatches", {
    withCredentials: true,
  });

  return response.data;
};

export const startVerificationEmails = async (batchId) => {
  const response = await api.post(
    "/api/verification/start",
    { batchId },
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const deleteVendorBatch = async (batchId) => {
  const response = await api.delete(`/api/deleteVendorBatch/${batchId}`, {
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};