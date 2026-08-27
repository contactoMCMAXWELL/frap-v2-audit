import api from "../lib/api";

export const AdminAPI = {

  listRoles() {
    return api.get("/api/v2/roles/");
  },

  createRole(data) {
    return api.post("/api/v2/roles/", data);
  },

  listHospitals() {
    return api.get("/api/v2/hospital-catalog/");
  },

  createHospital(data) {
    return api.post("/api/v2/hospital-catalog/", data);
  },

  listMedications() {
    return api.get("/api/v2/medication-catalog/");
  },

  createMedication(data) {
    return api.post("/api/v2/medication-catalog/", data);
  },

  listProcedures() {
    return api.get("/api/v2/procedure-catalog/");
  },

  createProcedure(data) {
    return api.post("/api/v2/procedure-catalog/", data);
  },

  listUnits() {
    return api.get("/api/v2/units-admin/");
  },

  createUnit(data) {
    return api.post("/api/v2/units-admin/", data);
  }

};