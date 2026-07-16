import api from "./api";

export const uploadVendorExcel = async (file) => {
  const formData = new FormData();

  formData.append("file", file); // "file" should match multer field name

  const response = await api.post(
    `/api/upload`,
    formData,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

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