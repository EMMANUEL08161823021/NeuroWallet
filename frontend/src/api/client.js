import axios from "axios";

export const api = axios.create({
  baseURL: "https://neurowallet.onrender.com",
  // "https://neurowallet.onrender.com",
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("access");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
