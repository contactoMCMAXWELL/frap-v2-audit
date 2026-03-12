// src/routes/AppRouter.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

import AuthPanel from "../pages/AuthPanel";
import Dispatch from "../pages/Dispatch";
import FrapWorkspace from "../pages/FrapWorkspace";
import UnitsAdmin from "../pages/UnitsAdmin";
import UsersAdmin from "../pages/UsersAdmin";
import CompaniesAdmin from "../pages/CompaniesAdmin";

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRouter() {
  const token = useAuthStore((s) => s.token);

  return (
    <BrowserRouter>
      <Routes>
        {/* Root */}
        <Route path="/" element={<Navigate to={token ? "/dispatch" : "/login"} replace />} />

        {/* Login */}
        <Route path="/login" element={token ? <Navigate to="/dispatch" replace /> : <AuthPanel />} />

        {/* Protected */}
        <Route
          path="/dispatch"
          element={
            <RequireAuth>
              <Dispatch />
            </RequireAuth>
          }
        />

        <Route
          path="/frap/:frapId"
          element={
            <RequireAuth>
              <FrapWorkspace />
            </RequireAuth>
          }
        />

        {/* Admin (company scoped) */}
        <Route
          path="/admin/company/units"
          element={
            <RequireAuth>
              <UnitsAdmin />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/company/users"
          element={
            <RequireAuth>
              <UsersAdmin />
            </RequireAuth>
          }
        />

        {/* SuperAdmin (tenants) */}
        <Route
          path="/admin/companies"
          element={
            <RequireAuth>
              <CompaniesAdmin />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}