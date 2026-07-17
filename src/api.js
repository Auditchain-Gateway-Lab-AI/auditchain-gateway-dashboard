// src/api.js
import axios from 'axios';

const api = axios.create({
  // Sesuaikan port dengan port gateway Anda (default: 8081)
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8081/api',
});

// Interceptor untuk menyisipkan token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;