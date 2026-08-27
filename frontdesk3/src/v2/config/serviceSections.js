export const SERVICE_SECTION_GROUPS = [
  {
    key: 'operacion',
    title: 'Operación y seguimiento',
    description: 'Accesos rápidos para ubicación, despacho y seguimiento del servicio.',
    sections: [
      { id: 'detalle-servicio', label: 'Detalle del servicio', description: 'Datos generales, prioridad y ubicación.', cap: 'dispatch.view' },
      { id: 'mapa-incidente', label: 'Mapa de incidente', description: 'Ubicación del evento para navegación rápida.', cap: 'dispatch.view' },
      { id: 'despacho-operativo', label: 'Despacho', description: 'Asignación de unidad y cambios de estado operativo.', cap: 'dispatch.view' },
      { id: 'timeline-servicio', label: 'Timeline clínico-operativo', description: 'Secuencia de eventos del servicio.', cap: 'dispatch.view' },
    ],
  },
  {
    key: 'recursos',
    title: 'Recursos del servicio',
    description: 'Consumo operativo y resultado económico del servicio.',
    sections: [
      { id: 'insumos-servicio', label: 'Insumos por servicio', description: 'Control de materiales e insumos aplicados.', cap: 'supplies.view' },
      { id: 'costos-servicio', label: 'Costos y resultado económico', description: 'Costos, venta y margen del servicio.', cap: 'financial.view' },
    ],
  },
  {
    key: 'clinica',
    title: 'Atención clínica',
    description: 'Bloques centrales del FRAP clínico y evolución del paciente.',
    sections: [
      { id: 'frap-clinico', label: 'FRAP clínico', description: 'Identificación, antecedentes, motivo y estado clínico.', cap: 'clinical.view' },
      { id: 'evaluacion-clinica', label: 'Evaluación clínica', description: 'Valoración estructurada del paciente.', cap: 'clinical.view' },
      { id: 'signos-vitales', label: 'Signos vitales seriados', description: 'Toma y seguimiento de signos vitales.', cap: 'vitals.view' },
      { id: 'procedimientos', label: 'Procedimientos realizados', description: 'Intervenciones ejecutadas durante la atención.', cap: 'procedures.view' },
      { id: 'medicamentos', label: 'Medicamentos administrados', description: 'Fármacos aplicados y control de dosis.', cap: 'medications.view' },
    ],
  },
  {
    key: 'especialidades',
    title: 'Especialidades y lesiones',
    description: 'Módulos complementarios según el caso clínico.',
    sections: [
      { id: 'pediatria', label: 'Pediatría', description: 'Bloque clínico pediátrico.', cap: 'clinical.view' },
      { id: 'cardio', label: 'Cardio', description: 'Bloque cardiológico.', cap: 'clinical.view' },
      { id: 'embarazo', label: 'Embarazo avanzado', description: 'Atención obstétrica y embarazo.', cap: 'clinical.view' },
      { id: 'lesiones-corporales', label: 'Lesiones corporales', description: 'Body map y trauma.', cap: 'trauma.view' },
    ],
  },
  {
    key: 'cierre',
    title: 'Cierre médico-legal',
    description: 'Bloques de negativa, entrega, firmas y PDF final.',
    sections: [
      { id: 'negativa-atencion', label: 'Negativa de atención', description: 'Cierre por negativa o rechazo.', cap: 'refusal.view' },
      { id: 'traslado-entrega', label: 'Traslado y entrega', description: 'Cierre hospitalario y continuidad de atención.', cap: 'handoff.view' },
      { id: 'firmas-pdf', label: 'Firmas y PDF', description: 'Firmas, validación documental y PDF médico-legal.', cap: 'clinical.view' },
    ],
  },
];

export function hasSectionCapability(caps, path) {
  if (!path) return true;
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), caps) === true;
}
