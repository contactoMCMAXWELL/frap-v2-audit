import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getMenuForRole } from "../access";


const LayoutScrollContext = createContext({ mainRef: null });

export function useLayoutScroll() {
  return useContext(LayoutScrollContext);
}

export default function V2Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const role = useAuthStore((s) => s.role);
  const name = useAuthStore((s) => s.user);
  const companyName = useAuthStore((s) => s.companyName);
  const companyCode = useAuthStore((s) => s.companyCode);
  const companyLogoUrl = useAuthStore((s) => s.companyLogoUrl);
  const clear = useAuthStore((s) => s.clear);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mainRef = useRef(null);
  const layoutScrollValue = useMemo(() => ({ mainRef }), []);

  useEffect(() => {
    const saved = localStorage.getItem("v2_sidebar_open");
    if (saved !== null) {
      setSidebarOpen(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("v2_sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  const menu = getMenuForRole(role);

  function logout() {
    clear();
    navigate("/login", { replace: true });
  }

  return (
    <LayoutScrollContext.Provider value={layoutScrollValue}>
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: sidebarOpen ? "280px 1fr" : "0px 1fr",
        background: "#f3f6fb",
        transition: "grid-template-columns 0.25s ease",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          background: "#0b1730",
          color: "#fff",
          padding: sidebarOpen ? 18 : 0,
          display: "flex",
          flexDirection: "column",
          borderRight: sidebarOpen ? "1px solid rgba(255,255,255,0.08)" : "none",
          minWidth: 0,
          overflow: "hidden",
          transition: "all 0.25s ease",
          height: "100vh",
        }}
      >
        {sidebarOpen && (
          <>
            <div style={{ marginBottom: 18, flexShrink: 0 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.1,
                  letterSpacing: 0.2,
                }}
              >
                AmbulanciaYA
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.75,
                  marginTop: 4,
                }}
              >
                MC MAXWELL SOFTWARE
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 12,
                marginBottom: 18,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 70,
                  borderRadius: 10,
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt="logo empresa"
                    style={{
                      maxWidth: "90%",
                      maxHeight: "90%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                    SIN LOGO
                  </div>
                )}
              </div>

              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {companyName || "Empresa activa"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.72,
                  marginTop: 4,
                  wordBreak: "break-word",
                }}
              >
                {companyCode || "Sin código"}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {menu.map((section, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      opacity: 0.58,
                      marginBottom: 8,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      fontWeight: 800,
                    }}
                  >
                    {section.title}
                  </div>

                  {section.items.map((item) => {
                    const active =
                      location.pathname === item.to ||
                      location.pathname.startsWith(item.to + "/");

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        style={{
                          display: "block",
                          padding: "10px 12px",
                          borderRadius: 10,
                          marginBottom: 6,
                          textDecoration: "none",
                          color: "#fff",
                          background: active ? "rgba(255,255,255,0.10)" : "transparent",
                          border: active
                            ? "1px solid rgba(255,255,255,0.10)"
                            : "1px solid transparent",
                          fontWeight: active ? 800 : 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 14,
                marginTop: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 4,
                  wordBreak: "break-word",
                }}
              >
                {name || "Usuario"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.72,
                  marginBottom: 12,
                }}
              >
                {String(role || "").toUpperCase() || "SIN ROL"}
              </div>

              <button
                type="button"
                onClick={logout}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </aside>

      <main
        ref={mainRef}
        style={{
          minWidth: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "auto",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "#f3f6fb",
            paddingBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              borderRadius: 10,
              padding: "8px 12px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
            title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          >
            {sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          </button>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
    </LayoutScrollContext.Provider>
  );
}