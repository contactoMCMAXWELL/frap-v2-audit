
/*
PATCH: hide dispatch actions by role (safe)
Roles:
- SUPERADMIN, ADMIN, DISPATCH => full control
- PARAMEDIC => read only dispatch
*/

export function canDispatchOperate(role) {
  const r = String(role || "").toUpperCase();
  return ["SUPERADMIN", "ADMIN", "DISPATCH"].includes(r);
}
