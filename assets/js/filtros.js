// ============================================================================
// TALMA DATA CENTER — Filtros contextuales por sección
// Cada vista muestra solo filtros útiles para su objetivo. Los filtros ocultos
// se limpian al cambiar de sección para evitar resultados afectados “por detrás”.
// ============================================================================
import { store } from "./store.js";
import { uniqueSorted, debounce } from "./utils.js";
import { resumen } from "./agregados.js";

let currentContext = "inicio";
let unsub = null;

const SELECT_META = {
  base: { id: "filtroBase", campo: "BASE", label: "Base", all: "Todas" },
  grupo: { id: "filtroGrupo", campo: "GRUPO", label: "Grupo", all: "Todos" },
  curso: { id: "filtroCurso", campo: "CURSO", label: "Curso", all: "Todos" },
  salon: { id: "filtroSalon", campo: "SALON", label: "Salón", all: "Todos" },
  instructor: { id: "filtroInstructor", campo: "INSTRUCTOR", label: "Instructor", all: "Todos" },
  cargo: { id: "filtroCargo", campo: "CARGO", label: "Cargo", all: "Todos" },
};

const CONTEXTS = {
  inicio: {
    title: "Filtros del resumen",
    fields: ["base", "curso", "instructor", "desde", "hasta"],
  },
  asistencias: {
    title: "Filtros de registros",
    fields: ["busqueda", "base", "curso", "grupo", "asistio", "desde", "hasta", "instructor", "salon", "integridad"],
  },
  colaboradores: {
    title: "Filtros de personas",
    fields: ["busqueda", "base", "cargo", "curso"],
  },
  cursos: {
    title: "Filtros de cursos",
    fields: ["busqueda", "base", "instructor", "desde", "hasta"],
  },
  grupos: {
    title: "Filtros de grupos",
    fields: ["busqueda", "base", "curso", "instructor", "desde", "hasta"],
  },
  grupo: {
    title: "Filtros del grupo",
    fields: ["busqueda", "asistio"],
  },
  curso: {
    title: "Filtros del curso",
    fields: ["busqueda", "grupo", "instructor", "asistio", "desde", "hasta"],
  },
};

const FILTER_KEYS = {
  busqueda: "busqueda", base: "base", grupo: "grupo", curso: "curso",
  instructor: "instructor", salon: "salon", cargo: "cargo", asistio: "asistio",
  desde: "desde", hasta: "hasta", integridad: "integridad",
};

export function initFiltros() {
  buildFilterBar();
  unsub = store.subscribe(renderUI);
  renderUI(store);
}

export function setFiltroContexto(name) {
  const next = CONTEXTS[name] ? name : "inicio";
  const changed = next !== currentContext;
  currentContext = next;
  buildFilterBar();

  // Limpia filtros que ya no son visibles en esta sección.
  const allowed = new Set((CONTEXTS[currentContext]?.fields || []).map(f => FILTER_KEYS[f]).filter(Boolean));
  let dirty = false;
  for (const [key, value] of Object.entries(store.filtros)) {
    if (key === "semestre" || key === "estado" || key === "soloDuplicados" || key === "soloRevision") {
      // se manejan abajo según el control Integridad
    }
    const active = key === "semestre" ? value !== "todos" : (typeof value === "boolean" ? value : String(value ?? "") !== "");
    const integridadAllowed = allowed.has("integridad") && (key === "soloDuplicados" || key === "soloRevision");
    if (active && !allowed.has(key) && !integridadAllowed) {
      store.filtros[key] = key === "semestre" ? "todos" : (typeof value === "boolean" ? false : "");
      dirty = true;
    }
  }
  if (dirty) store.applyFilters();
  else if (changed) renderUI(store);
}

function buildFilterBar() {
  const bar = document.getElementById("filtroBarContainer");
  if (!bar) return;
  const cfg = CONTEXTS[currentContext] || CONTEXTS.inicio;
  const title = document.getElementById("filterPanelTitle");
  if (title) title.textContent = cfg.title;

  const primary = [];
  const secondary = [];
  cfg.fields.forEach((field, i) => {
    const html = fieldHtml(field);
    // En registros, deja filtros secundarios en segunda línea para no saturar.
    if (currentContext === "asistencias" && ["desde", "hasta", "instructor", "salon", "integridad"].includes(field)) secondary.push(html);
    else primary.push(html);
  });

  bar.innerHTML = `
    <div class="filter-bar">${primary.join("")}
      <div class="fb-item fb-clear"><label class="filter-label">&nbsp;</label><button class="btn btn-sm btn-outline-secondary w-100" id="btnLimpiarFiltros" type="button"><i class="fa-solid fa-eraser me-1"></i> Limpiar</button></div>
    </div>
    ${secondary.length ? `<div class="filter-bar mt-2">${secondary.join("")}</div>` : ""}
    <div id="filterChips" class="filter-chips"></div>
    <div id="filterSummary" class="filter-result-summary"></div>`;

  wireEvents();
  renderUI(store);
}

function fieldHtml(field) {
  if (SELECT_META[field]) {
    const m = SELECT_META[field];
    return `<div class="fb-item"><label class="filter-label">${m.label}</label><select id="${m.id}" class="form-select"><option value="">${m.all}</option></select></div>`;
  }
  if (field === "busqueda") {
    const ph = currentContext === "colaboradores" ? "Nombre, cédula o correo..." :
      currentContext === "cursos" ? "Buscar curso o programa..." :
      currentContext === "grupos" ? "Buscar grupo, curso o instructor..." :
      "Buscar en los registros...";
    return `<div class="fb-item fb-search"><label class="filter-label">Buscar</label><input type="search" id="searchInput" class="form-control" placeholder="${ph}"></div>`;
  }
  if (field === "asistio") {
    return `<div class="fb-item"><label class="filter-label">Asistencia</label><select id="filtroAsistio" class="form-select"><option value="">Todas</option><option value="SÍ">Asistió</option><option value="NO">No asistió</option></select></div>`;
  }
  if (field === "desde") return `<div class="fb-item"><label class="filter-label">Desde</label><input type="date" id="filtroFechaDesde" class="form-control"></div>`;
  if (field === "hasta") return `<div class="fb-item"><label class="filter-label">Hasta</label><input type="date" id="filtroFechaHasta" class="form-control"></div>`;
  if (field === "integridad") {
    return `<div class="fb-item"><label class="filter-label">Calidad</label><select id="filtroIntegridad" class="form-select"><option value="">Todos</option><option value="duplicados">Solo duplicados</option><option value="revision">Pendientes de revisión</option></select></div>`;
  }
  return "";
}

function wireEvents() {
  document.getElementById("btnLimpiarFiltros")?.addEventListener("click", () => {
    store.clearFiltros();
  });

  const search = document.getElementById("searchInput");
  if (search) {
    const debounced = debounce(() => store.setFiltro("busqueda", search.value), 220);
    search.addEventListener("input", debounced);
  }

  const bindings = {
    filtroBase: "base", filtroGrupo: "grupo", filtroCurso: "curso",
    filtroInstructor: "instructor", filtroSalon: "salon", filtroCargo: "cargo",
    filtroAsistio: "asistio", filtroFechaDesde: "desde", filtroFechaHasta: "hasta",
  };
  Object.entries(bindings).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener("change", e => store.setFiltro(key, e.target.value));
  });

  document.getElementById("filtroIntegridad")?.addEventListener("change", e => {
    store.filtros.soloDuplicados = e.target.value === "duplicados";
    store.filtros.soloRevision = e.target.value === "revision";
    store.applyFilters();
  });
}

function renderUI(s) {
  populateSelects(s.data);
  syncControls(s);
  renderChips(s.filtrosActivos());
  renderSummary(s.filtered);
}

function populateSelects(data) {
  Object.entries(SELECT_META).forEach(([key, meta]) => {
    const sel = document.getElementById(meta.id);
    if (!sel) return;
    const current = store.filtros[key] || "";
    const values = uniqueSorted(data.map(d => d[meta.campo]));
    sel.innerHTML = `<option value="">${meta.all}</option>` + values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    sel.value = values.includes(current) ? current : "";
  });
}

function syncControls(s) {
  const f = s.filtros;
  const values = {
    searchInput: f.busqueda, filtroBase: f.base, filtroGrupo: f.grupo,
    filtroCurso: f.curso, filtroInstructor: f.instructor, filtroSalon: f.salon,
    filtroCargo: f.cargo, filtroAsistio: f.asistio,
    filtroFechaDesde: f.desde, filtroFechaHasta: f.hasta,
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el || document.activeElement === el) return;
    el.value = value || "";
  });
  const integ = document.getElementById("filtroIntegridad");
  if (integ) integ.value = f.soloDuplicados ? "duplicados" : (f.soloRevision ? "revision" : "");
}

function renderChips(active) {
  const cont = document.getElementById("filterChips");
  if (!cont) return;
  const allowed = new Set((CONTEXTS[currentContext]?.fields || []).map(f => FILTER_KEYS[f]));
  const visible = active.filter(f => allowed.has(f.clave) || (allowed.has("integridad") && ["soloDuplicados", "soloRevision"].includes(f.clave)));
  if (!visible.length) { cont.innerHTML = ""; return; }
  cont.innerHTML = visible.map(f => `<button class="filter-chip" data-clave="${esc(f.clave)}" type="button">${esc(f.valor ? `${f.etiqueta}: ${f.valor}` : f.etiqueta)}<span class="fc-remove"><i class="fa-solid fa-xmark"></i></span></button>`).join("");
  cont.querySelectorAll(".filter-chip").forEach(btn => btn.addEventListener("click", () => {
    const key = btn.dataset.clave;
    if (key === "soloDuplicados" || key === "soloRevision") store.setFiltro(key, false);
    else store.setFiltro(key, key === "semestre" ? "todos" : "");
  }));
}

function renderSummary(data) {
  const cont = document.getElementById("filterSummary");
  if (!cont) return;
  const r = resumen(data);
  if (currentContext === "colaboradores") {
    cont.innerHTML = `<strong>${r.personasUnicas}</strong> persona(s) · <strong>${r.pctAsistencia}%</strong> asistencia en sus registros filtrados`;
  } else if (currentContext === "cursos") {
    cont.innerHTML = `<strong>${r.cursos}</strong> curso(s) · <strong>${r.grupos}</strong> grupo(s) · <strong>${r.personasUnicas}</strong> persona(s)`;
  } else if (currentContext === "grupos" || currentContext === "grupo") {
    cont.innerHTML = `<strong>${r.grupos}</strong> grupo(s) · <strong>${r.registros}</strong> registro(s) · <strong>${r.pctAsistencia}%</strong> asistencia`;
  } else {
    cont.innerHTML = `<strong>${r.registros}</strong> registro(s) · <strong>${r.personasUnicas}</strong> persona(s) · <strong>${r.pctAsistencia}%</strong> asistencia`;
  }
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
