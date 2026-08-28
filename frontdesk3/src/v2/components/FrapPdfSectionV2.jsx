import React from "react";
import { useParams } from "react-router-dom";
import FrapSignaturesPdfPanel from "./FrapSignaturesPdfPanel";

export default function FrapPdfSectionV2({ session, intake, onIntakeChanged }) {
  const { intakeId } = useParams();

  if (!intakeId) {
    return (
      <div
        style={{
          border: "1px solid #fecaca",
          background: "#fef2f2",
          color: "#991b1b",
          borderRadius: 12,
          padding: 16,
        }}
      >
        No se encontró intakeId para el bloque de firmas y PDF.
      </div>
    );
  }

  return (
    <FrapSignaturesPdfPanel
      session={session}
      intakeId={intakeId}
      intake={intake}
      onIntakeChanged={onIntakeChanged}
    />
  );
}