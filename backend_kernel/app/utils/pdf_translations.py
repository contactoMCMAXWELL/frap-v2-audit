FIELD_TRANSLATIONS = {
    "Glasgow eye": "Glasgow ocular",
    "Glasgow verbal": "Glasgow verbal",
    "Glasgow motor": "Glasgow motor",
    "Sample s": "Síntomas",
    "Sample a": "Alergias",
    "Sample m": "Medicamentos",
    "Sample p": "Patologías",
    "Sample l": "Última ingesta",
    "Sample e": "Eventos previos",
    "Impression primary": "Impresión diagnóstica primaria",
    "Impression secondary": "Impresión diagnóstica secundaria",
    "Triage": "Triage",
    "Trauma type": "Tipo de trauma",
    "Mechanism": "Mecanismo",
    "Kinematics": "Cinética",
    "Safety equipment": "Equipo de seguridad",
    "Injured regions": "Regiones lesionadas",
    "Deformity": "Deformidad",
    "Wounds": "Heridas",
    "Bleeding": "Sangrado",
    "Burns": "Quemaduras",
    "Immobilization": "Inmovilización",
    "Trauma priority": "Prioridad de trauma",
    "Notes": "Notas",
}

VALUE_TRANSLATIONS = {
    "Yes": "Sí",
    "No": "No",
    "Unknown": "Desconocido",
    "Completed": "Completado",
    "Pending": "Pendiente",
}

def translate_text(text: str) -> str:
    if not text:
        return text

    for en, es in FIELD_TRANSLATIONS.items():
        text = text.replace(en, es)

    for en, es in VALUE_TRANSLATIONS.items():
        text = text.replace(en, es)

    # Timeline fixes
    text = text.replace("Dose:", "Dosis:")
    text = text.replace("Route:", "Vía:")
    text = text.replace("Medication:", "Medicamento:")
    text = text.replace("Signer role:", "Rol del firmante:")
    text = text.replace("Signature role:", "Tipo de firma:")
    text = text.replace("Refused to sign:", "Rechazó firmar:")

    # Body map
    text = text.replace("Type:", "Tipo:")
    text = text.replace("View:", "Vista:")
    text = text.replace("Region:", "Región:")
    text = text.replace("Severity:", "Severidad:")

    return text