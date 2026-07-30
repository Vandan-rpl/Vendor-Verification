import api from "./api";

export const getVerificationDetails = async (token) => {
  const response = await api.get(`/api/verification/${token}`, {
    withCredentials: true,
  });

  return response;
};

// formData contains the GST/Aadhar/Invoice files (appended by VerifyPage).
// No Content-Type header here — axios sets the multipart boundary itself
// when the body is a FormData instance. Setting it manually breaks the upload.
export const confirmVerification = async (token, formData) => {
  const response = await api.post(
    `/api/verification/${token}/confirm`,
    formData,
    {
      withCredentials: true,
    }
  );

  return response;
};

// formData contains name/mobileNumber/email/address as text fields
// PLUS the GST/Aadhar/Invoice files, all appended by VerifyPage.
export const updateVerification = async (token, formData) => {
  const response = await api.post(
    `/api/verification/${token}/update`,
    formData,
    {
      withCredentials: true,
    }
  );

  return response;
};