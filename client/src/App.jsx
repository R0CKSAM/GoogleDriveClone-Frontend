import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Trash from "./pages/Trash.jsx";
import Reset from "./pages/Reset.jsx";
import AuthProvider, { useAuth } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset" element={<Reset />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/trash" element={<PrivateRoute><Trash /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
      </div>
    </AuthProvider>
  );
}
