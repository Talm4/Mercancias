import { db } from "./firebase-config.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { store } from "./store.js";
import { showToast } from "./utils.js";
import { subirDocumento } from "./documentos.js";
import { certificateTexts } from "./certificados-core.js";

const TEMPLATE_URL = "assets/pdf/PLANTILLA-CERTIFICADO.pdf";
const CERT_FIELDS = ["certNumero", "certCategoria", "certMetodologia", "certCiudad", "certTratamiento", "certLicencia"];
let modal;
let currentRecord = null;


function defaultCertificateNumber(rec) {
  const suffix = String(rec.ID || rec._docId || "00000").replace(/\D/g, "").slice(-5).padStart(5, "0");
  return `CI-${suffix}`;
}

function formValues() {
  return {
    CERT_NUMERO: document.getElementById("certNumero").value.trim(),
    CERT_CATEGORIA: document.getElementById("certCategoria").value.trim(),
    CERT_METODOLOGIA: document.getElementById("certMetodologia").value.trim().toUpperCase(),
    CERT_CIUDAD: document.getElementById("certCiudad").value.trim().toUpperCase(),
    CERT_TRATAMIENTO_INSTRUCTOR: document.getElementById("certTratamiento").value,
    CERT_LICENCIA_INSTRUCTOR: document.getElementById("certLicencia").value.trim(),
  };
}

function refreshPreview() {
  if (!currentRecord) return;
  const texts = certificateTexts(currentRecord, formValues());
  document.getElementById("certPreviewBody").textContent = texts.body;
  document.getElementById("certPreviewInstructor").textContent = texts.instructorText;
  document.getElementById("certPreviewValidity").textContent = texts.validity;
}

function setStatus(message, tone = "") {
  const status = document.getElementById("certStatus");
  status.textContent = message;
  status.className = `me-auto small ${tone ? `text-${tone}` : "text-muted"}`;
}

export function abrirEditorCertificado(docId) {
  const rec = store.getRecord(docId);
  if (!rec) return showToast("No se encontró el registro para generar el certificado.", "danger");
  currentRecord = rec;
  document.getElementById("certRecordId").value = docId;
  document.getElementById("certModalTitle").textContent = `${rec.NOMBRES || "Colaborador"} · ${rec.CURSO || "Curso"}`;
  document.getElementById("certNumero").value = rec.CERT_NUMERO || defaultCertificateNumber(rec);
  document.getElementById("certCategoria").value = rec.CERT_CATEGORIA || "Cat. 8";
  document.getElementById("certMetodologia").value = rec.CERT_METODOLOGIA || "PRESENCIAL";
  document.getElementById("certCiudad").value = rec.CERT_CIUDAD || rec.BASE || "";
  document.getElementById("certTratamiento").value = rec.CERT_TRATAMIENTO_INSTRUCTOR || "la Instructora";
  document.getElementById("certLicencia").value = rec.CERT_LICENCIA_INSTRUCTOR || "";
  setStatus("Los campos se guardan en el mismo registro de Firebase.");
  refreshPreview();
  modal.show();
}

export async function saveCertificateConfig({ quiet = false } = {}) {
  if (!currentRecord) throw new Error("No hay un registro seleccionado.");
  const values = formValues();
  if (!values.CERT_CIUDAD || !values.CERT_LICENCIA_INSTRUCTOR) {
    throw new Error("Completa la ciudad y la licencia IET del instructor.");
  }
  await setDoc(doc(db, "capacitaciones", currentRecord._docId), {
    ...values,
    CERT_ACTUALIZADO: new Date().toISOString(),
  }, { merge: true });
  Object.assign(currentRecord, values);
  if (!quiet) {
    setStatus("Datos guardados en Firebase.", "success");
    showToast("Datos del certificado guardados.", "success");
  }
  return values;
}

function sanitizePdfText(value) {
  return String(value || "").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function drawWrapped(page, text, { x, y, width, font, size, lineHeight, color }) {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  lines.forEach((value, index) => page.drawText(value, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

export async function buildCertificatePdf(rec, config) {
  if (!window.PDFLib) throw new Error("La librería para generar PDF no está disponible.");
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const template = await fetch(TEMPLATE_URL).then(response => {
    if (!response.ok) throw new Error("No se pudo cargar la plantilla del certificado.");
    return response.arrayBuffer();
  });
  const pdfDoc = await PDFDocument.load(template);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const black = rgb(0.04, 0.04, 0.04);
  const white = rgb(1, 1, 1);
  const texts = certificateTexts(rec, config);

  // La plantilla original está diligenciada; estas áreas blancas convierten
  // sus textos variables en una superficie reutilizable sin alterar logos,
  // resolución, firma ni pie de página.
  page.drawRectangle({ x: 30, y: 218, width: 735, height: 150, color: white });
  page.drawRectangle({ x: 686, y: 480, width: 104, height: 30, color: white });
  page.drawText(`N°: ${sanitizePdfText(config.CERT_NUMERO || defaultCertificateNumber(rec))}`, { x: 704, y: 487, size: 8.5, font, color: black });

  drawWrapped(page, texts.body, { x: 36, y: 357, width: 720, font, size: 10.2, lineHeight: 14.2, color: black });
  drawWrapped(page, texts.instructorText, { x: 36, y: 282, width: 720, font, size: 10.2, lineHeight: 14.2, color: black });
  page.drawText(sanitizePdfText(texts.validity), { x: 36, y: 236, size: 10.2, font, color: black });
  return pdfDoc.save();
}

function fileName(rec) {
  const name = String(rec.NOMBRES || rec.ID || "COLABORADOR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `CERTIFICADO-${name}-${rec.FECHA || "SIN-FECHA"}.pdf`;
}

async function currentPdf() {
  if (!currentRecord) throw new Error("No hay un registro seleccionado.");
  const config = formValues();
  return { bytes: await buildCertificatePdf(currentRecord, config), config };
}

export async function downloadCurrentCertificate() {
  setStatus("Generando PDF...");
  const { bytes } = await currentPdf();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName(currentRecord);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("PDF generado correctamente.", "success");
}

export async function uploadCurrentCertificate() {
  setStatus("Guardando datos y subiendo PDF...");
  const config = await saveCertificateConfig({ quiet: true });
  const bytes = await buildCertificatePdf(currentRecord, config);
  const file = new File([bytes], fileName(currentRecord), { type: "application/pdf" });
  await subirDocumento(currentRecord.ID, currentRecord.NOMBRES, file);
  setStatus("Certificado guardado en Firebase Storage.", "success");
  showToast("Certificado guardado en el perfil del colaborador.", "success");
}

async function safeAction(action) {
  try { await action(); }
  catch (error) {
    console.error("[CERTIFICADO]", error);
    setStatus(error.message || String(error), "danger");
    showToast(error.message || "No fue posible procesar el certificado.", "danger");
  }
}

export function initCertificados() {
  modal = new bootstrap.Modal(document.getElementById("modalCertificado"));
  CERT_FIELDS.forEach(id => {
    const field = document.getElementById(id);
    field.addEventListener("input", refreshPreview);
    field.addEventListener("change", refreshPreview);
  });
  window.abrirCertificado = abrirEditorCertificado;
  window.guardarDatosCertificado = () => safeAction(() => saveCertificateConfig());
  window.descargarCertificadoPDF = () => safeAction(downloadCurrentCertificate);
  window.guardarCertificadoFirebase = () => safeAction(uploadCurrentCertificate);
}
