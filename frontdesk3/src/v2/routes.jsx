import React from "react";
import { Route } from "react-router-dom";
import {
  CompanyLicenses,
  ServiceIntakeCreateV2,
  ServiceIntakeListV2,
  ServiceTimelineV2,
  V2AdminCompanyPage,
  V2AdminDashboardPage,
  V2AdminHome,
  V2AdminHospitalsPage,
  V2AdminMedicationsPage,
  V2AdminProceduresPage,
  V2AdminRolesPage,
  V2AdminSuppliesPage,
  V2AdminUnitsPage,
  V2AdminUsersPage,
  V2Home,
  V2Layout,
} from "./index";

export function buildV2Routes(session) {
  return (
    <Route path="/v2" element={<V2Layout />}>
      <Route index element={<V2Home />} />
      <Route path="licencias" element={<CompanyLicenses session={session} />} />
      <Route path="intakes" element={<ServiceIntakeListV2 session={session} />} />
      <Route path="intakes/nuevo" element={<ServiceIntakeCreateV2 session={session} />} />
      <Route path="intakes/:intakeId/timeline" element={<ServiceTimelineV2 session={session} />} />

      <Route path="admin" element={<V2AdminHome />} />
      <Route path="admin/dashboard" element={<V2AdminDashboardPage session={session} />} />
      <Route path="admin/empresa" element={<V2AdminCompanyPage session={session} />} />
      <Route path="admin/roles" element={<V2AdminRolesPage session={session} />} />
      <Route path="admin/usuarios" element={<V2AdminUsersPage session={session} />} />
      <Route path="admin/hospitales" element={<V2AdminHospitalsPage session={session} />} />
      <Route path="admin/medicamentos" element={<V2AdminMedicationsPage session={session} />} />
      <Route path="admin/procedimientos" element={<V2AdminProceduresPage session={session} />} />
      <Route path="admin/unidades" element={<V2AdminUnitsPage session={session} />} />
      <Route path="admin/insumos" element={<V2AdminSuppliesPage session={session} />} />
    </Route>
  );
}