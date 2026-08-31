import { parseHorasNumero } from "./utils.js";
import { vigenciaMesesCurso } from "./capacitacion.js";

function monthName(month) {
  return ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][month] || "";
}

export function dateWords(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "FECHA SIN REGISTRAR";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${monthName(month - 1)} de ${year}`;
}

function certifiedCourse(rec, category) {
  let course = String(rec.CURSO || "CURSO SIN REGISTRAR").trim();
  if (!/MERCANC[IÍ]AS PELIGROSAS/i.test(course)) course += " DE MERCANCÍAS PELIGROSAS";
  const cat = String(category || "").trim();
  return `${course}${cat ? ` - ${cat}` : ""}`.toUpperCase();
}

function enabledGenderText(treatment) {
  if (treatment === "la Instructora") return "habilitada";
  if (treatment === "el Instructor") return "habilitado";
  return "habilitada";
}

export function certificateTexts(rec, config) {
  const hours = parseHorasNumero(rec.INTENSIDAD);
  const duration = hours || String(rec.INTENSIDAD || "").replace(/[^\d.,]/g, "") || "0";
  const note = String(rec.NOTA || "SIN NOTA").trim();
  const body = `Que el (la) Señor(a) ${String(rec.NOMBRES || "SIN NOMBRE").toUpperCase()} identificado con cédula de ciudadanía N° ${rec.ID || "SIN IDENTIFICACIÓN"}, participó y aprobó con una nota de ${note} el CURSO ${certifiedCourse(rec, config.CERT_CATEGORIA)}, impartido mediante metodología ${config.CERT_METODOLOGIA || "PRESENCIAL"} el día ${dateWords(rec.FECHA)}, con una intensidad de ${duration} hora(s) de acuerdo con el Programa de Entrenamiento vigente, aprobado para el centro de instrucción por la UAEAC y el Manual de directivas de Instrucción.`;
  const treatment = config.CERT_TRATAMIENTO_INSTRUCTOR || "la Instructora";
  const license = config.CERT_LICENCIA_INSTRUCTOR || "SIN REGISTRAR";
  const instructor = String(rec.INSTRUCTOR || "SIN INSTRUCTOR").toUpperCase();
  const instructorText = `La capacitación en mención fue impartida en la ciudad de ${config.CERT_CIUDAD || rec.BASE || "SIN REGISTRAR"} por ${treatment}, ${instructor} ${enabledGenderText(treatment)} con licencia IET No. ${license}.`;
  const years = Math.max(1, Math.round(vigenciaMesesCurso(rec.CURSO) / 12));
  const validity = `La vigencia de la capacitación es de ${years} ${years === 1 ? "año" : "años"}.`;
  return { body, instructorText, validity };
}

