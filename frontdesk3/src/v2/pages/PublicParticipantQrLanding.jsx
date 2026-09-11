import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { participantProtectionApi } from "../api/participantProtection";
import "./PublicParticipantQrLanding.css";

export default function PublicParticipantQrLanding({ session }) {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    valid: false,
    message: "",
  });

  useEffect(() => {
    let mounted = true;

    async function validateQr() {
      setState({
        loading: true,
        valid: false,
        message: "",
      });

      const role = String(session?.role || "").toUpperCase();
      const canResolveParticipant =
        Boolean(session?.token) &&
        Boolean(session?.companyId) &&
        ["SUPERADMIN", "ADMIN", "DISPATCH", "PARAMEDIC", "DOCTOR"].includes(role);

      if (canResolveParticipant) {
        try {
          const resolved = await participantProtectionApi.resolveQr({
            qrToken,
            token: session?.token,
            companyId: session?.companyId,
            userId: session?.userId,
          });

          if (!mounted) return;

          if (resolved?.event_intake_id && resolved?.participant_id) {
            navigate(
              `/v2/intakes/${encodeURIComponent(
                resolved.event_intake_id
              )}/proteccion-participantes?participantId=${encodeURIComponent(
                resolved.participant_id
              )}`,
              { replace: true }
            );
            return;
          }
        } catch {
          // Si no procede la resolución autenticada,
          // conservamos la validación pública neutra.
        }
      }

      try {
        const data = await participantProtectionApi.publicQrValidate({
          qrToken,
        });

        if (!mounted) return;

        setState({
          loading: false,
          valid: Boolean(data?.valid),
          message: data?.message || "Código no válido",
        });
      } catch {
        if (!mounted) return;

        setState({
          loading: false,
          valid: false,
          message: "Código no válido",
        });
      }
    }

    validateQr();

    return () => {
      mounted = false;
    };
  }, [
    qrToken,
    navigate,
    session?.token,
    session?.companyId,
    session?.userId,
    session?.role,
  ]);

  if (state.loading) {
    return (
      <main className="pqr-page">
        <section className="pqr-card" aria-live="polite">
          <div className="pqr-mark pqr-mark--loading" aria-hidden="true">
            <span />
          </div>
          <span className="pqr-eyebrow">Protección Médica del Participante</span>
          <h1>Validando registro…</h1>
          <p>Estamos verificando la credencial del participante.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="pqr-page">
      <section
        className={`pqr-card ${state.valid ? "is-valid" : "is-invalid"}`}
        aria-live="polite"
      >
        <div className="pqr-mark" aria-hidden="true">
          {state.valid ? "✓" : "×"}
        </div>

        <span className="pqr-eyebrow">Protección Médica del Participante</span>
        <h1>{state.message}</h1>

        {state.valid ? (
          <p>
            Esta credencial corresponde a un participante registrado. La información
            personal y médica permanece protegida.
          </p>
        ) : (
          <p>
            No fue posible validar esta credencial. Verifica el código o solicita apoyo
            al personal del evento.
          </p>
        )}

        <div className="pqr-security-note">
          <span aria-hidden="true">▣</span>
          <div>
            <strong>Privacidad protegida</strong>
            <small>
              Esta página pública no muestra nombre, datos de contacto ni información médica.
            </small>
          </div>
        </div>

        <footer>AmbulanciaYA · MC MAXWELL SOFTWARE Y SERVICIOS</footer>
      </section>
    </main>
  );
}
