import { agregarPorCurso } from "./agregados.js";
import { aggregateRecords } from "./data-engine.js";
import { escapeHtml, asistenciaPill } from "./ui.js";
import { formatFechaDisplay } from "./utils.js";
import { store } from "./store.js";

export function renderCursos(s) {
  const cursos = agregarPorCurso(s.filtered).sort((a, b) => b.resumen.registros - a.resumen.registros);
  document.getElementById("courseCards").innerHTML = cursos.length ? cursos.map(c => `<article class="entity-card" data-open-course-profile="${escapeHtml(c.curso)}"><div><span class="section-kicker">Curso</span><h3>${escapeHtml(c.curso)}</h3><p>${escapeHtml(c.programa || "Programa sin asignar")}</p></div><div class="entity-metrics"><div><strong>${c.resumen.personasUnicas}</strong><span>Personas</span></div><div><strong>${c.resumen.grupos}</strong><span>Grupos</span></div><div><strong>${c.resumen.pctAsistencia}%</strong><span>Asistencia</span></div></div><div class="entity-progress"><div style="width:${c.resumen.pctAsistencia}%"></div></div><div class="entity-foot"><span>${c.resumen.instructores} instructores</span><span>Ver perfil <i class="fa-solid fa-arrow-right"></i></span></div></article>`).join("") : '<div class="surface empty-cell">No hay cursos para este filtro.</div>';
}

export function abrirCurso(nombre) {
  const records = store.getCourse(nombre);
  abrirEntityDrawer("Curso", nombre, records, "curso");
}

export function abrirEntityDrawer(kind, name, records, type) {
  const overlay = document.getElementById("entityOverlay");
  const content = document.getElementById("entityContent");
  const m = aggregateRecords(records);
  const sorted = records.slice().sort((a, b) => (b.FECHA || "").localeCompare(a.FECHA || "")).slice(0, 100);
  content.innerHTML = `<header class="drawer-header"><button class="drawer-close" data-close-entity aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button><span class="hero-kicker">${escapeHtml(kind)}</span><div class="drawer-title">${escapeHtml(name)}</div><div class="drawer-subtitle">Perfil consolidado con ${records.length} registros históricos</div></header><div class="drawer-body"><div class="drawer-stat-grid"><div class="kpi-card"><div class="kpi-value">${m.summary.personasUnicas}</div><div class="kpi-label">Personas</div></div><div class="kpi-card"><div class="kpi-value">${m.summary.pctAsistencia}%</div><div class="kpi-label">Asistencia</div></div><div class="kpi-card"><div class="kpi-value">${m.summary.promedioNota === null ? "—" : m.summary.promedioNota.toFixed(1)}</div><div class="kpi-label">Nota promedio</div></div><div class="kpi-card"><div class="kpi-value">${m.summary.horas}</div><div class="kpi-label">Horas</div></div></div><div class="section-title">Historial reciente</div><div class="drawer-table"><table class="enterprise-table"><thead><tr><th>Persona</th><th>Fecha</th><th>${type === "curso" ? "Grupo" : "Curso"}</th><th>Base</th><th>Instructor</th><th>Asistencia</th></tr></thead><tbody>${sorted.map(r => `<tr><td><span class="person-link" data-open-perfil="${escapeHtml(r._personKey)}">${escapeHtml(r.NOMBRES || "—")}</span></td><td>${formatFechaDisplay(r.FECHA)}</td><td>${escapeHtml(type === "curso" ? r.GRUPO || "—" : r.CURSO || "—")}</td><td>${escapeHtml(r.BASE || "—")}</td><td>${escapeHtml(r.INSTRUCTOR || "—")}</td><td>${asistenciaPill(r)}</td></tr>`).join("")}</tbody></table></div></div>`;
  overlay.classList.add("open");
}

export function cerrarEntityDrawer() { document.getElementById("entityOverlay")?.classList.remove("open"); }

export function renderCursoDetalle(_s, nombre) { abrirCurso(nombre); }

