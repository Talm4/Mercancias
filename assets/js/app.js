// ==========================================================================
// TALMA DATA CENTER — Boot (SPA)
// Inicializa la conexión a Firestore, el router, los filtros compartidos y
// orquesta el re-render de la vista activa cada vez que cambian los datos
// o los filtros. Toda la app consume una única fuente: store.filtered.
// ==========================================================================
import { store } from "./store.js?v=2.2.0";
import { defineRoute, initRouter, route, navigate } from "./router.js?v=2.2.0";
import { initFiltros, setFiltroContexto } from "./filtros.js?v=2.2.0";
import { initAsistencias, render as renderAsistencias } from "./asistencias.js?v=2.2.0";
import { renderDashboard } from "./dashboard.js?v=2.2.0";
import { renderColaboradores } from "./colaboradores.js?v=2.2.0";
import { renderGrupos, renderGrupoDetalle } from "./grupos.js?v=2.2.0";
import { renderCursos, renderCursoDetalle } from "./cursos.js?v=2.2.0";
import { initPerfil, abrirPerfil, renderPerfil, cerrarPerfil } from "./perfil.js?v=2.2.0";
import { escapeHtml } from "./ui.js?v=2.2.0";

let currentRoute = { name: "inicio", param: "" };

/* ------------------------------ Rutas ------------------------------ */
defineRoute("inicio", () => renderDashboard(store));
defineRoute("asistencias", () => renderAsistencias(store));
defineRoute("colaboradores", () => renderColaboradores(store));
defineRoute("cursos", () => renderCursos(store));
defineRoute("grupos", () => renderGrupos(store));
defineRoute("grupo", (nombre) => renderGrupoDetalle(store, nombre));
defineRoute("curso", (nombre) => renderCursoDetalle(store, nombre));

/* ------------------------------ Render central ------------------------------ */
function renderCurrent() {
  switch (currentRoute.name) {
    case "inicio": renderDashboard(store); break;
    case "asistencias": renderAsistencias(store); break;
    case "colaboradores": renderColaboradores(store); break;
    case "cursos": renderCursos(store); break;
    case "grupos": renderGrupos(store); break;
    case "grupo": renderGrupoDetalle(store, currentRoute.param); break;
    case "curso": renderCursoDetalle(store, currentRoute.param); break;
  }
  renderPerfil(store); // si hay perfil abierto, se mantiene sincronizado
}

function renderChrome() {
  const total = document.getElementById("totalRecords");
  if (total) total.innerText = store.sizeCrudo;

  const ult = document.getElementById("lastUpdated");
  if (ult) ult.innerText = store.ultimaActualizacion ? `Actualizado: ${store.ultimaActualizacion}` : "";
  const topUlt = document.getElementById("topLastUpdated");
  if (topUlt) topUlt.innerText = store.estado === "loading"
    ? "Cargando datos…"
    : (store.ultimaActualizacion ? `Actualizado ${store.ultimaActualizacion}` : "");

  const btn = document.getElementById("btnTraerDatos");
  if (btn) {
    const loading = store.estado === "loading";
    btn.disabled = loading;
    btn.innerHTML = loading
      ? '<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Cargando…'
      : '<i class="fa-solid fa-arrow-down-long me-1"></i> Traer datos';
  }
}

window.navigate = navigate;

window.traerDatos = async function () {
  const r = await store.actualizar();
  if (!r.ok) store.connect();
};

document.getElementById("btnTraerDatos")?.addEventListener("click", () => window.traerDatos());

window.reintentarCarga = function () {
  store.connect();
};

// Desde el dashboard: ver solo los que no asistieron en el módulo Asistencias.
window.irANoAsistieron = function () {
  store.setFiltro("asistio", "NO");
  navigate("asistencias");
};

/* ------------------------------ Delegación de clicks (perfil / grupo / curso) ------------------------------ */
document.addEventListener("click", (e) => {
  const perfil = e.target.closest("[data-open-perfil]");
  if (perfil) { e.preventDefault(); abrirPerfil(perfil.dataset.openPerfil); return; }
  const grupo = e.target.closest("[data-open-grupo]");
  if (grupo) { e.preventDefault(); navigate("grupo/" + encodeURIComponent(grupo.dataset.openGrupo)); return; }
  const curso = e.target.closest("[data-open-curso]");
  if (curso) { e.preventDefault(); navigate("curso/" + encodeURIComponent(curso.dataset.openCurso)); return; }
});

/* ------------------------------ Inicio ------------------------------ */
initFiltros();
initAsistencias();
initPerfil();

initRouter((name, param) => {
  // El router ya ejecuta el render de la ruta. Aquí solo sincronizamos estado.
  currentRoute = { name, param };
  setFiltroContexto(name);
});

store.subscribe((s) => {
  renderChrome();
  renderCurrent();
});

store.iniciar();
