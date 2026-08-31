// ==========================================================================
// TALMA DATA CENTER — Helpers de UI compartidos
// ==========================================================================
import { asisteRegistro } from "./utils.js?v=2.2.0";

export function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function moneda(num) {
  return num === null || num === undefined ? "—" : Number(num).toLocaleString("es-CO");
}

export function kpiCard({ id = null, label, value, icon = null, color = "bg-navy" }) {
  return `<div class="kpi-card">
    ${icon ? `<div class="hz-diamond ${color}">${icon}</div>` : ""}
    <div>
      <div class="kpi-value"${id ? ` id="${id}"` : ""}>${escapeHtml(value)}</div>
      <div class="kpi-label">${escapeHtml(label)}</div>
    </div>
  </div>`;
}

export function renderKpiStrip(containerId, items) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML = items.map(kpiCard).join("");
}

export function asistenciaPill(rec) {
  const esSi = asisteRegistro(rec);
  return `<span class="hz-pill ${esSi ? "si" : "no"}"><span class="hz-dot"></span>${esSi ? "SÍ" : "NO"}</span>`;
}

export function personLinkText(rec, attrs = "") {
  const id = rec.ID || "";
  const nombre = escapeHtml(rec.NOMBRES || "(Sin nombre)");
  if (!id) return nombre;
  return `<span class="person-link" data-open-perfil="${escapeHtml(id)}" ${attrs}>${nombre}</span>`;
}

export function hypheno(value) { return value || "—"; }

export function promedioFmt(v) {
  return v === null || v === undefined ? "—" : v.toFixed(1);
}

export function percentFmt(p) {
  return p === null || p === undefined ? "—" : `${Math.round(p)}%`;
}


export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
