import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { parseJwt } from './utils/formatters';

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
  });
  const [, setAuthVersion] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
    setAuthVersion(v => v + 1);
  };

  const handleAuthRefresh = () => {
    setAuthVersion(v => v + 1);
  };

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const clientInfo = useMemo(() => {
    if (!isAuthenticated) return null;
    return token ? parseJwt(token) : null;
  }, [isAuthenticated, token]);

  const isAdmin = clientInfo?.role?.toLowerCase() === 'admin';

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage onLogin={() => { setIsAuthenticated(true); handleAuthRefresh(); }} />
            ) : (
              <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardPage onLogout={handleLogout} onProfileUpdated={handleAuthRefresh} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <DashboardPage view="profile" onLogout={handleLogout} onProfileUpdated={handleAuthRefresh} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              {isAdmin ? (
                <AdminPage onLogout={handleLogout} />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
