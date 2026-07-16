import axios from "axios";
import api from "./api";

export const loginUser = async (values) => {
  
  const response = await api.post("/api/login", values);
  return response.data;
};