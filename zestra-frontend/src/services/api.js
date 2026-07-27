import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  // If Aniket's backend is on a different port, update this. Usually FastAPI runs on 8000.
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;