import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

let isRedirectingToLogin = false;

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      clearStoredSession();

      if (window.location.pathname !== "/login" && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default API;
