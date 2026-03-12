// UI-only formatting helpers for FRAP timeline (no business logic).
export function formatEvent(ev) {
  const ts = ev?.ts ? new Date(ev.ts) : null;
  const when = ts && !Number.isNaN(ts.getTime()) ? ts.toLocaleString() : String(ev?.ts ?? "");

  // NOTE: Different parts of the system may put the semantic "kind" in different places.
  // Prefer payload.kind (most reliable), then ev.kind, then ev.type/event_type.
  const kindFromEv = String(ev?.kind ?? "").toLowerCase();
  const kindFromType = String(ev?.type ?? ev?.event_type ?? "").toLowerCase();
  const data = ev?.data ?? ev?.payload ?? ev?.detail ?? {};
  const kindFromData = data && typeof data === "object" ? String(data.kind ?? "").toLowerCase() : "";
  const kind = kindFromData || kindFromEv || kindFromType;

  const lines = [];
  const pick = (k) => (data && typeof data === "object" ? data[k] : undefined);

  const pushIf = (label, value) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(`${label}: ${value}`);
  };

  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const fmtNum = (v) => (v === 0 || v ? String(v) : "");
  const pickAny = (keys, obj = data) => {
    if (!obj || typeof obj !== "object") return undefined;
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
    }
    return undefined;
  };

  const unwrap = (v) => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.length === 1 ? unwrap(v[0]) : v;
    if (typeof v === "object") {
      // Common wrappers: {value:..}, {val:..}, {score:..}, {num:..}
      for (const kk of ["value", "val", "score", "num", "n"]) {
        if (Object.prototype.hasOwnProperty.call(v, kk)) return unwrap(v[kk]);
      }
    }
    return v;
  };

  const deepPickAny = (keys) => {
    // Search current data and nested objects (depth-limited).
    const seen = new Set();
    const stack = [{ obj: data, depth: 0 }];
    while (stack.length) {
      const { obj, depth } = stack.pop();
      if (!obj || typeof obj !== "object") continue;
      if (seen.has(obj)) continue;
      seen.add(obj);

      const direct = pickAny(keys, obj);
      if (direct !== undefined) return unwrap(direct);

      if (depth >= 4) continue;
      for (const v of Object.values(obj)) {
        if (v && typeof v === "object") stack.push({ obj: v, depth: depth + 1 });
      }
    }
    return undefined;
  };

  const fmtGlasgow = (g) => {
    if (g === undefined || g === null || g === "") return "";
    if (!isObj(g)) return String(g);

    const ocular = g.ocular ?? g.ocular_score ?? g.o;
    const verbal = g.verbal ?? g.verbal_score ?? g.v;
    const motora = g.motora ?? g.motor ?? g.motor_score ?? g.m;
    const total = g.total ?? g.total_score ?? g.sum;

    const parts = [];
    if (ocular !== undefined) parts.push(`Ocular ${fmtNum(ocular)}`);
    if (verbal !== undefined) parts.push(`Verbal ${fmtNum(verbal)}`);
    if (motora !== undefined) parts.push(`Motora ${fmtNum(motora)}`);
    if (total !== undefined) parts.push(`Total ${fmtNum(total)}`);
    return parts.length ? parts.join(", ") : "";
  };

  // Common fields
  const notes = pick("notes");
  const name = pick("name") || pick("label");
  const code = pick("code") || pick("procedure_code") || pick("drug_code");
  const user = pick("user") || pick("user_name") || pick("created_by") || pick("actor");
  const role = pick("role") || pick("user_role");
  const unit = pick("unit") || pick("unit_name") || pick("unit_code");

  // Try infer kind if missing.
  const k = kind || String(pick("kind") ?? "").toLowerCase();
  const hasVitalsHeuristic = data && typeof data === "object" && ("hr" in data || "rr" in data || "spo2" in data || "temp" in data || "bp_sys" in data || "bp_dia" in data || "ta" in data || "glucose" in data || "glucosa" in data || "pain" in data || "dolor" in data);
  const kk = k || (hasVitalsHeuristic ? "vitals" : "");

  // Injury / Lesión
  if (kk === "injury" || kk === "lesion" || kk === "lesión") {
    const region = pick("region_label") || pick("region") || pick("region_id");
    const injuryType = pick("injury_type") || pick("type");
    const view = pick("view");
    const severity = pick("severity");
    const title = "Lesión (Mapa corporal)";
    pushIf("Zona", region);
    pushIf("Tipo", injuryType);
    pushIf("Vista", view);
    pushIf("Severidad", severity);
    pushIf("Notas", notes);
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "🩹", lines };
  }

  // Procedure / Procedimiento
  if (kk === "procedure" || kk === "procedimiento") {
    const title = "Procedimiento";
    pushIf("Nombre", name);
    if (code) pushIf("Código", code);
    pushIf("Notas", notes);
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "🩺", lines };
  }

  // Medication / Medicamento
  if (kk === "med" || kk === "medication" || kk === "medicamento") {
    const dose = pick("dose");
    const route = pick("route");
    const title = "Medicamento";
    pushIf("Nombre", name);
    if (code) pushIf("Código", code);
    pushIf("Dosis", dose);
    pushIf("Vía", route);
    pushIf("Notas", notes);
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "💊", lines };
  }

  // Vitals / Signos vitales
  if (kk === "vitals" || kk === "signos_vitales" || kk === "signos") {
    const title = "Signos vitales / Evaluación";
    const avpu = deepPickAny(["avpu", "avpu_state"]);
    const glasgowObj = deepPickAny(["glasgow", "gcs", "gcs_detail"]);
    const gcsTotal = deepPickAny(["gcs_total", "glasgow_total", "glasgowTotal", "gcsTotal", "total"]);

    pushIf("AVPU", avpu);

    const gPretty = fmtGlasgow(glasgowObj);
    if (gPretty) {
      pushIf("Glasgow", gPretty);
    } else if (gcsTotal !== undefined) {
      pushIf("Glasgow", gcsTotal);
    }

    // Blood pressure can arrive with many key names
    const bpRaw = deepPickAny(["bp", "ta", "blood_pressure"]);
    const bpObj = (bpRaw && typeof bpRaw === "object" && !Array.isArray(bpRaw)) ? bpRaw : null;
    const bp = bpObj ? (unwrap(bpObj.sys ?? bpObj.systolic ?? bpObj.sis ?? bpObj.tas) !== undefined && unwrap(bpObj.dia ?? bpObj.diastolic ?? bpObj.dias ?? bpObj.tad) !== undefined ? `${unwrap(bpObj.sys ?? bpObj.systolic ?? bpObj.sis ?? bpObj.tas)}/${unwrap(bpObj.dia ?? bpObj.diastolic ?? bpObj.dias ?? bpObj.tad)}` : undefined) : bpRaw;
    const sys = deepPickAny(["bp_sys", "bp_systolic", "ta_systolic", "ta_sistolica", "tas", "sbp"]);
    const dia = deepPickAny(["bp_dia", "bp_diastolic", "ta_diastolic", "ta_diastolica", "tad", "dbp"]);
    pushIf("TA", bp || (sys !== undefined && dia !== undefined ? `${sys}/${dia}` : undefined));

    pushIf("FC", deepPickAny(["hr", "fc", "heart_rate"]));
    pushIf("FR", deepPickAny(["rr", "fr", "resp_rate"]));
    pushIf("SpO2", deepPickAny(["spo2", "spO2", "o2sat"]));
    pushIf("Temp", deepPickAny(["temp", "temperature"]));
    pushIf("Glucosa", deepPickAny(["glucose", "glucosa", "bg"]));
    pushIf("Dolor", deepPickAny(["pain", "dolor"]));
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "❤️", lines };
  }

  
  // SAMPLE (historia clínica breve)
  if (kk === "sample") {
    const title = "SAMPLE";
    const s = deepPickAny(["signs_symptoms","symptoms","signs","s"]);
    const a = deepPickAny(["allergies","a"]);
    const m = deepPickAny(["medications","meds","m"]);
    const p = deepPickAny(["past_history","history","conditions","p"]);
    const l = deepPickAny(["last_oral_intake","last_intake","l"]);
    const e = deepPickAny(["events","event","e"]);
    pushIf("S (Signos/Síntomas)", s);
    pushIf("A (Alergias)", a);
    pushIf("M (Medicamentos)", m);
    pushIf("P (Antecedentes)", p);
    pushIf("L (Última ingesta)", l);
    pushIf("E (Eventos)", e);
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "🧾", lines };
  }

// Clinical note / Nota
  if (kk === "note" || kk === "clinical_note" || kk === "nota") {
    const title = "Nota clínica";
    pushIf("Detalle", pick("text") || pick("note") || notes || name);
    pushIf("Usuario", user);
    if (role) pushIf("Rol", role);
    if (unit) pushIf("Unidad", unit);
    return { title, when, icon: "📝", lines };
  }

  // Default: try to be human
  const title = ev?.title || (kk ? kk.replace(/_/g, " ") : "Evento");
  if (data && typeof data === "object") {
    const keys = Object.keys(data).slice(0, 8);
    for (const kk of keys) {
      const vv = data[kk];
      if (vv === null || vv === undefined || vv === "") continue;
      if (typeof vv === "object") continue;
      lines.push(`${kk}: ${vv}`);
    }
  } else if (data) {
    lines.push(String(data));
  }
  if (lines.length === 0) lines.push("Detalle no disponible");
  return { title: title.charAt(0).toUpperCase() + title.slice(1), when, icon: "🕒", lines };
}