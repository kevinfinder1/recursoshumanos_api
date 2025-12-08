import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.50.68:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// ♻ Interceptor sincronizado con AuthContext
API.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("access") ||
      localStorage.getItem("secure_access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
