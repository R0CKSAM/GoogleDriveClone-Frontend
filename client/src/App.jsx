import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
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
        {/* Topbar */}
        <nav className="bg-white/80 backdrop-blur border-b">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sky-700 font-semibold text-lg tracking-tight">
                Sam Gdrive
              </Link>
              <NavLinks />
            </div>
            <AuthActions />
          </div>
        </nav>

        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
      </div>
    </AuthProvider>
  );
}

function NavLinks() {
  const { token } = useAuth();
  if (!token) return null;
  return (
    <div className="text-sm text-gray-700 flex items-center gap-4">
      <Link to="/" className="hover:text-sky-700">Home</Link>
      <Link to="/trash" className="hover:text-sky-700">Trash</Link>
    </div>
  );
}

function AuthActions() {
  const { token, logout } = useAuth();
  if (!token) return null;
  return (
    <button onClick={logout} className="text-sm text-red-600 hover:text-red-700">
      Log out
    </button>
  );
}
