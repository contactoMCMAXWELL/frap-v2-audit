// src/store/authStore.js
import { create } from "zustand";

const LS_KEY = "frap_auth_v1";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const initial = {
  token: "",
  companyId: "",       // 🔥 contexto actual (se usa en headers X-Company-Id)
  companyName: "",     // opcional (solo UI)
  companyCode: "",     // opcional (solo UI)
  userId: "",
  user: "",
  role: "",            // "DISPATCH" | "ADMIN" | "SUPERADMIN" | etc
};

const persisted = load();

export const useAuthStore = create((set, get) => ({
  ...initial,
  ...(persisted || {}),

  setAuth: (patch) => {
    const prev = get();
    const next = {
      ...prev,
      ...patch,
      token: patch?.token ?? prev.token ?? "",
      companyId: patch?.companyId ?? prev.companyId ?? "",
      companyName: patch?.companyName ?? prev.companyName ?? "",
      companyCode: patch?.companyCode ?? prev.companyCode ?? "",
      userId: patch?.userId ?? prev.userId ?? "",
      user: patch?.user ?? prev.user ?? "",
      role: patch?.role ?? prev.role ?? "",
    };

    set(next);
    save({
      token: next.token || "",
      companyId: next.companyId || "",
      companyName: next.companyName || "",
      companyCode: next.companyCode || "",
      userId: next.userId || "",
      user: next.user || "",
      role: next.role || "",
    });
  },

  // ✅ SOLO para SUPERADMIN: cambiar contexto empresa sin re-login
  setCompanyContext: ({ companyId, companyName, companyCode } = {}) => {
    const prev = get();
    const role = String(prev.role || "").toUpperCase();
    if (role !== "SUPERADMIN") return; // seguridad UI

    const next = {
      ...prev,
      companyId: companyId ?? prev.companyId,
      companyName: companyName ?? "",
      companyCode: companyCode ?? "",
    };

    set(next);
    save({
      token: next.token || "",
      companyId: next.companyId || "",
      companyName: next.companyName || "",
      companyCode: next.companyCode || "",
      userId: next.userId || "",
      user: next.user || "",
      role: next.role || "",
    });
  },

  hasRole: (role) => {
    const r = String(get().role || "").toUpperCase();
    return r === String(role || "").toUpperCase();
  },

  clear: () => {
    set(initial);
    save(initial);
  },
}));