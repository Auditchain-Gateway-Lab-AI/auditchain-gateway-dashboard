// src/api.js
import axios from 'axios';

const api = axios.create({
  // Sesuaikan port dengan port gateway Anda (default: 8081)
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8081/api',
});

// Interceptor untuk menyisipkan kredensial secara otomatis
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Endpoint /admin/* dilindungi middleware.AdminAuth() (header X-Admin-Secret
  // dibandingkan ke env ADMIN_SECRET di backend) — mekanisme TERPISAH dari
  // JWT dashboard biasa. Disisipkan otomatis di sini kalau request menuju
  // path /admin, supaya komponen pemanggil (AdminDashboard, dst) tidak perlu
  // tahu detail header ini.
  if (config.url && config.url.startsWith('/admin')) {
    const adminSecret = sessionStorage.getItem('admin_secret');
    if (adminSecret) {
      config.headers['X-Admin-Secret'] = adminSecret;
    }
  }

  return config;
});

export default api;