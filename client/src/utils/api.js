import axios from "axios";

// Determine baseURL based on environment
const getBaseURL = () => {
  // In development, use relative path (Vite proxy will handle it)
  if (import.meta.env.DEV) {
    return "/api";
  }
  // In production, use full URL from env or default
  return import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - unauthorized (expired token)
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Handle timeout
    if (error.code === "ECONNABORTED") {
      error.message = "Request timeout - server is not responding";
    }

    // Handle network error
    if (error.message === "Network Error") {
      error.message = "Network error - check your connection";
    }

    // Log errors in development
    if (import.meta.env.DEV) {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return Promise.reject(error);
  }
);
