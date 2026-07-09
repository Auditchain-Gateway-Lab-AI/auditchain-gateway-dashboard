// src/api.js
import axios from 'axios';

const api = axios.create({
  // Sesuaikan port dengan port gateway Anda (default: 8081)
  baseURL: 'http://192.168.11.94:8080/api',
});

// Interceptor untuk menyisipkan token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;