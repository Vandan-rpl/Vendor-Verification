import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const loginUser = async (values) => {
  const response = await axios.post(`${API_URL}/login`, values, {
    withCredentials: true, // Required for HttpOnly Cookies
  });

  return response.data;
};