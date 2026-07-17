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

export const startVerificationEmails = async () => {
  const response = await api.post(
    "/api/verification/start",
    {},
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};