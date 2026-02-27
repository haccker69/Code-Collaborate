/**
 * @file axiosInstance.js
 * @description Pre-configured Axios instance.
 * baseURL is "/api" — Vite dev proxy forwards to http://localhost:5000/api.
 * In production, set VITE_API_URL to your actual backend URL.
 */

import axios from "axios";

const api = axios.create({
  // In dev: Vite proxy handles /api → http://localhost:5000/api
  // In prod: set VITE_API_URL=https://yourbackend.com/api
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Request interceptor — inject JWT ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle 401 globally ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cd_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
