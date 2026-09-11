import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

import AuthPanel from "../pages/AuthPanel";
import Dispatch from "../pages/Dispatch";
import FrapWorkspace from "../pages/FrapWorkspace";
import UnitsAdmin from "../pages/UnitsAdmin";
import UsersAdmin from "../pages/UsersAdmin";
import CompaniesAdmin from "../pages/CompaniesAdmin";

import {
  V2Layout,
  V2Home,
  CompanyLicenses,
  ServiceIntakeListV2,
  ServiceIntakeCreateV2,
  ServiceTimelineV2,
  EventParticipantProtectionConfig,
  PublicEventParticipantLanding,
  PublicParticipantQrLanding,
  V2AdminHome,
  V2AdminDashboardPage,
  V2AdminRolesPage,
  V2AdminUsersPage,
  V2AdminHospitalsPage,
  V2AdminMedicationsPage,
  V2AdminProceduresPage,
  V2AdminCompanyPage,
  V2AdminUnitsPage,
  V2AdminSuppliesPage,
} from "../v2";
import { getDefaultPathByRole, hasAnyRole } from "../v2/access";

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ allowedRoles, children }) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);

  if (!token) return <Navigate to="/login" replace />;
  if (!hasAnyRole(role, allowedRoles)) return <Navigate to="/v2" replace />;

  return children;
}

export default function AppRouter() {
  const token = useAuthStore((s) => s.token);
  const companyId = useAuthStore((s) => s.companyId);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);
  const companyLogoUrl = useAuthStore((s) => s.companyLogoUrl);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  const session = {
    token,
    companyId: companyId || null,
    companyName: companyName || null,
    companyCode: companyCode || null,
    companyLogoUrl: companyLogoUrl || null,
    userId: userId || null,
    role: role || null,
    name: user || null,
  };

  const defaultPath = token ? getDefaultPathByRole(session.role) : "/login";

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />

        <Route
          path="/login"
          element={token ? <Navigate to={defaultPath} replace /> : <AuthPanel />}
        />

        <Route path="/evento/:publicToken" element={<PublicEventParticipantLanding />} />
        <Route path="/participante/qr/:qrToken" element={<PublicParticipantQrLanding session={session} />} />

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

        <Route
          path="/admin/companies"
          element={
            <RequireAuth>
              <CompaniesAdmin />
            </RequireAuth>
          }
        />

        <Route
          path="/v2"
          element={
            <RequireAuth>
              <V2Layout />
            </RequireAuth>
          }
        >
          <Route index element={<V2Home session={session} />} />

          <Route
            path="licencias"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN", "AUDITOR"]}>
                <CompanyLicenses session={session} />
              </RequireRole>
            }
          />

          <Route path="intakes" element={<ServiceIntakeListV2 session={session} />} />

          <Route
            path="intakes/nuevo"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN", "DISPATCH"]}>
                <ServiceIntakeCreateV2 session={session} />
              </RequireRole>
            }
          />

          <Route
            path="intakes/:intakeId/timeline"
            element={<ServiceTimelineV2 session={session} />}
          />

          <Route
            path="intakes/:intakeId/proteccion-participantes"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN", "DISPATCH"]}>
                <EventParticipantProtectionConfig session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminHome session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/dashboard"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminDashboardPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/empresa"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminCompanyPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/roles"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN", "AUDITOR"]}>
                <V2AdminRolesPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/usuarios"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminUsersPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/unidades"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminUnitsPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/insumos"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminSuppliesPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/hospitales"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminHospitalsPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/medicamentos"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminMedicationsPage session={session} />
              </RequireRole>
            }
          />

          <Route
            path="admin/procedimientos"
            element={
              <RequireRole allowedRoles={["SUPERADMIN", "ADMIN"]}>
                <V2AdminProceduresPage session={session} />
              </RequireRole>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
