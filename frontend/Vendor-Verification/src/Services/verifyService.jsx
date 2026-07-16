import api from "./api";

export const getVerificationDetails = async (token) => {
  const response = await api.get(`/api/verification/${token}`, {
    withCredentials: true,
  });

  return response;
};

export const confirmVerification = async (token) => {
  const response = await api.post(
    `/api/verification/${token}/confirm`,
    {},
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response;
};

export const updateVerification = async (token, payload) => {
  const response = await api.post(
    `/api/verification/${token}/update`,
    payload,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response;
};
