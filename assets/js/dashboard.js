import { escapeHtml, renderMetrics } from "./ui.js";
import { formatFechaDisplay } from "./utils.js";
import { chartTheme, upsertChart } from "./chart-manager.js";

const GREEN = "#007a53";
let renderToken = 0;

function idle(task) {
  if ("requestIdleCallback" in window) requestIdleCallback(task, { timeout: 300 });
  else setTimeout(task, 32);
}

function renderHero(s) {
  const m = s.metrics;
  const active = s.filtrosActivos().length;
  document.getElementById("dashHeroSub").textContent = active
    ? `${m.summary.registros} registros en el universo seleccionado · ${active} filtros activos.`
    : `Vista consolidada de ${m.summary.personasUnicas} personas en ${m.summary.bases} bases.`;
  document.getElementById("dashCalidad").innerHTML = `<div class="health-score">${m.quality.score}%</div><div class="health-label">índice de confianza de datos</div>`;
}

function renderKpis(m) {
  renderMetrics("dashKpis", [
    { label: "Personas cubiertas", value: m.summary.personasUnicas, foot: `${m.summary.cursos} cursos activos`, tone: "positive" },
    { label: "Tasa de asistencia", value: `${m.summary.pctAsistencia}%`, foot: `${m.summary.noAsistieron} inasistencias`, tone: m.summary.pctAsistencia >= 85 ? "positive" : "warning" },
    { label: "Horas ejecutadas", value: m.summary.horas.toLocaleString("es-CO"), foot: `${m.summary.grupos} grupos`, tone: "neutral" },
    { label: "Nota promedio", value: m.summary.promedioNota === null ? "—" : m.summary.promedioNota.toFixed(1), foot: `${m.summary.registros} registros`, tone: "neutral" },
  ]);
}

function renderInsights(s) {
  document.getElementById("dashInsights").innerHTML = s.insights.map(i => `<div class="insight-item ${i.tone}"><strong>${escapeHtml(i.title)}</strong><span>${escapeHtml(i.detail)}</span></div>`).join("");
}

function renderRanking(m) {
  const rows = m.by.base.slice().sort((a, b) => b.pctAsistencia - a.pctAsistencia || b.total - a.total).slice(0, 7);
  document.getElementById("dashBaseRanking").innerHTML = rows.length ? rows.map(x => `<div class="ranking-item" title="${escapeHtml(x.key)} · ${x.total} registros"><span class="ranking-label">${escapeHtml(x.key)}</span><div class="rank-track"><div class="rank-fill" style="width:${x.pctAsistencia}%"></div></div><span class="rank-value">${x.pctAsistencia}%</span></div>`).join("") : '<div class="empty-cell">Sin datos por base.</div>';
}

function renderAlerts(m) {
  const items = [];
  const low = m.by.base.filter(x => x.total >= 3 && x.pctAsistencia < 85).sort((a, b) => a.pctAsistencia - b.pctAsistencia).slice(0, 2);
  low.forEach(x => items.push({ critical: x.pctAsistencia < 70, icon: "fa-location-dot", title: `${x.key}: asistencia bajo objetivo`, detail: `${x.pctAsistencia}% · ${x.noAsistieron} inasistencias` }));
  if (m.quality.review) items.push({ icon: "fa-triangle-exclamation", title: "Registros que requieren revisión", detail: `${m.quality.review} filas afectan la confiabilidad` });
  const expired = m.states.VENCIDO || 0;
  if (expired) items.push({ critical: true, icon: "fa-calendar-xmark", title: "Capacitaciones vencidas", detail: `${expired} registros con vigencia vencida` });
  document.getElementById("dashAlerts").innerHTML = (items.length ? items.slice(0, 4) : [{ icon: "fa-circle-check", title: "Sin alertas críticas", detail: "La operación está dentro de los umbrales actuales" }]).map(x => `<div class="alert-card ${x.critical ? "critical" : ""}"><i class="fa-solid ${x.icon}"></i><div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.detail)}</span></div></div>`).join("");
}

function renderQuality(m) {
  document.getElementById("dashQuality").innerHTML = `<div class="quality-score">${m.quality.score}%</div><span class="text-muted small">Confianza estimada</span><div class="quality-gauge"><div style="width:${m.quality.score}%"></div></div><div class="quality-lines"><span>Correctos <strong>${m.quality.correct}</strong></span><span>Para revisión <strong>${m.quality.review}</strong></span><span>Duplicados <strong>${m.quality.duplicates}</strong></span></div><button class="link-button mt-3" onclick="location.hash='#registros'; document.getElementById('filtroIntegridad').value='revision'; document.getElementById('filtroIntegridad').dispatchEvent(new Event('change'))">Revisar calidad</button>`;
}

function renderRecent(m) {
  document.getElementById("dashRecent").innerHTML = m.recent.slice(0, 6).map(r => `<div class="activity-item"><strong><span class="person-link" data-open-perfil="${escapeHtml(r._personKey)}">${escapeHtml(r.NOMBRES || "Sin nombre")}</span></strong><span>${escapeHtml(r.CURSO || "Sin curso")} · ${escapeHtml(r.BASE || "Sin base")} · ${formatFechaDisplay(r.FECHA)}</span></div>`).join("") || '<div class="empty-cell">Sin actividad reciente.</div>';
}

function renderTrend(m) {
  const rows = m.by.fecha.filter(x => x.key !== "SIN ASIGNAR").sort((a, b) => a.key.localeCompare(b.key));
  const limited = rows.length > 40 ? rows.slice(-40) : rows;
  const t = chartTheme();
  upsertChart("dashTrendChart", {
    type: "line",
    data: { labels: limited.map(x => x.key), datasets: [{ label: "% asistencia", data: limited.map(x => x.pctAsistencia), borderColor: GREEN, backgroundColor: "rgba(0,122,83,.11)", fill: true, tension: .28, pointRadius: limited.length > 20 ? 0 : 3, borderWidth: 2 }] },
    options: { interaction: { intersect: false, mode: "index" }, plugins: { legend: { display: false }, decimation: { enabled: true, algorithm: "lttb", samples: 50 } }, scales: { x: { grid: { display: false }, ticks: { color: t.text, maxTicksLimit: 10 } }, y: { min: 0, max: 100, ticks: { color: t.text, callback: value => `${value}%` }, grid: { color: t.grid } } } },
  });
}

export function renderDashboard(s) {
  const token = ++renderToken;
  renderHero(s);
  renderKpis(s.metrics);
  renderInsights(s);
  renderAlerts(s.metrics);
  renderQuality(s.metrics);
  idle(() => {
    if (token !== renderToken || !document.getElementById("view-resumen")?.classList.contains("view-active")) return;
    renderTrend(s.metrics);
    renderRanking(s.metrics);
    renderRecent(s.metrics);
  });
}
