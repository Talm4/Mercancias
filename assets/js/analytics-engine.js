import { parseNotaNumero, parseHorasNumero, getPeriodoLabel } from './utils.js?v=2.2.0';
import { personKey, asisteSi } from './agregados.js?v=2.2.0';

const cache = new Map();
const MAX_CACHE = 24;

function filterKey(store) {
  return `${store.dataVersion || 0}|${JSON.stringify(store.filtros || {})}`;
}

function bucket(map, key) {
  const k = key || 'SIN ASIGNAR';
  if (!map.has(k)) map.set(k, { key:k, total:0, si:0, no:0, personas:new Set(), grupos:new Set(), cursos:new Set(), sumaNota:0, notas:0, horas:0 });
  return map.get(k);
}

function finalize(map) {
  return [...map.values()].map(x => ({
    key:x.key,
    total:x.total,
    si:x.si,
    no:x.no,
    pct:x.total ? Math.round((x.si/x.total)*100) : 0,
    personas:x.personas.size,
    grupos:x.grupos.size,
    cursos:x.cursos.size,
    promedioNota:x.notas ? x.sumaNota/x.notas : null,
    horas:Math.round(x.horas*10)/10,
  }));
}

export function getAnalytics(store) {
  const key = filterKey(store);
  if (cache.has(key)) return cache.get(key);
  const t0 = performance.now();
  const data = store.filtered || [];
  const personas = new Set(), cursos = new Set(), grupos = new Set(), bases = new Set(), instructores = new Set();
  const porBase = new Map(), porCurso = new Map(), porGrupo = new Map(), porInstructor = new Map(), porFecha = new Map(), porPeriodo = new Map();
  let si=0, no=0, sumaNota=0, notas=0, horas=0;

  for (const r of data) {
    const pk = personKey(r); if (pk) personas.add(pk);
    if (r.CURSO) cursos.add(r.CURSO); if (r.GRUPO) grupos.add(r.GRUPO); if (r.BASE) bases.add(r.BASE); if (r.INSTRUCTOR) instructores.add(r.INSTRUCTOR);
    const attended = asisteSi(r); attended ? si++ : no++;
    const nota = parseNotaNumero(r.NOTA); if (nota !== null) { sumaNota += nota; notas++; }
    const h = parseHorasNumero(r.INTENSIDAD); if (Number.isFinite(h)) horas += h;

    const dimensions = [[porBase,r.BASE],[porCurso,r.CURSO],[porGrupo,r.GRUPO],[porInstructor,r.INSTRUCTOR]];
    for (const [map, dim] of dimensions) {
      const b = bucket(map, dim); b.total++; attended ? b.si++ : b.no++; if(pk)b.personas.add(pk); if(r.GRUPO)b.grupos.add(r.GRUPO); if(r.CURSO)b.cursos.add(r.CURSO); if(nota!==null){b.sumaNota+=nota;b.notas++;} b.horas += Number.isFinite(h)?h:0;
    }
    if (r.FECHA) {
      const f = bucket(porFecha, r.FECHA); f.total++; attended ? f.si++ : f.no++;
      const p = bucket(porPeriodo, getPeriodoLabel(r.FECHA)); p.total++; attended ? p.si++ : p.no++; p.horas += Number.isFinite(h)?h:0;
    }
  }

  const result = {
    key,
    summary:{registros:data.length,personas:personas.size,cursos:cursos.size,grupos:grupos.size,bases:bases.size,instructores:instructores.size,si,no,pct:data.length?Math.round(si/data.length*100):0,promedioNota:notas?sumaNota/notas:null,horas:Math.round(horas*10)/10},
    base:finalize(porBase), curso:finalize(porCurso), grupo:finalize(porGrupo), instructor:finalize(porInstructor),
    fecha:finalize(porFecha).sort((a,b)=>a.key.localeCompare(b.key)), periodo:finalize(porPeriodo).sort((a,b)=>a.key.localeCompare(b.key)),
    duration: Math.round((performance.now()-t0)*10)/10
  };
  cache.set(key,result);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  return result;
}

export function invalidateAnalytics(){ cache.clear(); }
