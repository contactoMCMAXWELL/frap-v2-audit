export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function canViewDispatch(role) {
  return [
    "SUPERADMIN",
    "ADMIN",
    "DISPATCH",
    "PARAMEDIC",
    "DOCTOR",
    "RECEIVER_MD",
    "AUDITOR",
  ].includes(normalizeRole(role));
}

export function canOperateDispatch(role) {
  return ["SUPERADMIN", "ADMIN", "DISPATCH"].includes(normalizeRole(role));
}

export function canViewClinical(role) {
  return [
    "SUPERADMIN",
    "ADMIN",
    "PARAMEDIC",
    "DOCTOR",
    "RECEIVER_MD",
    "AUDITOR",
  ].includes(normalizeRole(role));
}

export function canEditClinical(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewVitals(role) {
  return canViewClinical(role);
}

export function canEditVitals(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewProcedures(role) {
  return canViewClinical(role);
}

export function canEditProcedures(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewMedications(role) {
  return canViewClinical(role);
}

export function canEditMedications(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewTrauma(role) {
  return canViewClinical(role);
}

export function canEditTrauma(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewRefusal(role) {
  return [
    "SUPERADMIN",
    "ADMIN",
    "PARAMEDIC",
    "DOCTOR",
    "RECEIVER_MD",
    "AUDITOR",
  ].includes(normalizeRole(role));
}

export function canEditRefusal(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewHandoff(role) {
  return [
    "SUPERADMIN",
    "ADMIN",
    "DISPATCH",
    "PARAMEDIC",
    "DOCTOR",
    "RECEIVER_MD",
    "AUDITOR",
  ].includes(normalizeRole(role));
}

export function canEditHandoff(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canSignReceiver(role) {
  return ["SUPERADMIN", "ADMIN", "DOCTOR", "RECEIVER_MD"].includes(
    normalizeRole(role)
  );
}

export function canSignResponsible(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canLockFrap(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewServiceSupplies(role) {
  return [
    "SUPERADMIN",
    "ADMIN",
    "DISPATCH",
    "PARAMEDIC",
    "AUDITOR",
  ].includes(normalizeRole(role));
}

export function canEditServiceSupplies(role) {
  return ["SUPERADMIN", "ADMIN", "PARAMEDIC"].includes(normalizeRole(role));
}

export function canViewFinancial(role) {
  return ["SUPERADMIN", "ADMIN", "DISPATCH", "AUDITOR"].includes(
    normalizeRole(role)
  );
}

export function canEditFinancial(role) {
  return ["SUPERADMIN", "ADMIN"].includes(normalizeRole(role));
}

export function getRoleCapabilities(role) {
  return {
    dispatch: {
      view: canViewDispatch(role),
      operate: canOperateDispatch(role),
    },
    clinical: {
      view: canViewClinical(role),
      edit: canEditClinical(role),
    },
    vitals: {
      view: canViewVitals(role),
      edit: canEditVitals(role),
    },
    procedures: {
      view: canViewProcedures(role),
      edit: canEditProcedures(role),
    },
    medications: {
      view: canViewMedications(role),
      edit: canEditMedications(role),
    },
    trauma: {
      view: canViewTrauma(role),
      edit: canEditTrauma(role),
    },
    refusal: {
      view: canViewRefusal(role),
      edit: canEditRefusal(role),
    },
    handoff: {
      view: canViewHandoff(role),
      edit: canEditHandoff(role),
      signReceiver: canSignReceiver(role),
    },
    supplies: {
      view: canViewServiceSupplies(role),
      edit: canEditServiceSupplies(role),
    },
    financial: {
      view: canViewFinancial(role),
      edit: canEditFinancial(role),
    },
    signatures: {
      signResponsible: canSignResponsible(role),
      signReceiver: canSignReceiver(role),
    },
    lock: {
      frap: canLockFrap(role),
    },
  };
}