// TALMA DATA CENTER V2 — Analítica cacheada y render diferido.
import { getAnalytics } from './analytics-engine.js';
import { parseNotaNumero } from './utils.js';

const charts = new Map();
const PALETTE = {green:'#137a42', red:'#c43d3d', blue:'#235a7f', teal:'#287d8e', amber:'#b7791f'};

function upsert(id, type, labels, datasets, extra={}) {
  const canvas=document.getElementById(id); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const existing=charts.get(id);
  const options={responsive:true,maintainAspectRatio:false,animation:false,normalized:true,plugins:{legend:{position:'bottom',labels:{boxWidth:10,usePointStyle:true}}},...extra};
  if(existing && existing.config.type===type){ existing.data.labels=labels; existing.data.datasets=datasets; existing.options={...existing.options,...options}; existing.update('none'); return; }
  if(existing) existing.destroy();
  charts.set(id,new Chart(ctx,{type,data:{labels,datasets},options}));
}
function top(items,n=10,metric='total'){ return [...items].sort((a,b)=>b[metric]-a[metric]).slice(0,n); }
function renderInsights(a){
  const el=document.getElementById('analyticsInsights'); if(!el)return;
  const bases=top(a.base,1,'no'), cursos=top(a.curso,1,'no'), inst=top(a.instructor,1,'total');
  const items=[];
  if(bases[0]&&a.summary.no) items.push(`<strong>${bases[0].key}</strong> concentra ${Math.round(bases[0].no/a.summary.no*100)}% de las inasistencias (${bases[0].no}).`);
  if(cursos[0]) items.push(`<strong>${cursos[0].key}</strong> registra ${cursos[0].pct}% de asistencia en ${cursos[0].total} registros.`);
  if(inst[0]) items.push(`<strong>${inst[0].key}</strong> es el instructor con mayor volumen: ${inst[0].total} registros.`);
  if(a.summary.promedioNota!==null) items.push(`La nota promedio del universo filtrado es <strong>${a.summary.promedioNota.toFixed(1)}</strong>.`);
  el.innerHTML=items.length?items.map((x,i)=>`<div class="insight-row"><span>${i+1}</span><p>${x}</p></div>`).join(''):'<div class="empty-mini">No hay datos suficientes para generar hallazgos.</div>';
}
function renderSummary(a){
  const s=a.summary;
  const el=document.getElementById('analyticsSummary'); if(!el)return;
  el.innerHTML=`<div><span>Registros analizados</span><strong>${s.registros.toLocaleString('es-CO')}</strong></div><div><span>Personas</span><strong>${s.personas.toLocaleString('es-CO')}</strong></div><div><span>Asistencia</span><strong>${s.pct}%</strong></div><div><span>Horas ejecutadas</span><strong>${s.horas.toLocaleString('es-CO')}</strong></div>`;
}
function renderCharts(a,s){
  const trend=a.fecha;
  upsert('chartEvolucion','line',trend.map(x=>x.key),[{label:'% asistencia',data:trend.map(x=>x.pct),borderColor:PALETTE.teal,backgroundColor:'rgba(40,125,142,.10)',fill:true,tension:.2,pointRadius:trend.length>30?0:2}],{scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}},x:{ticks:{maxTicksLimit:12}}}});
  const cursos=top(a.curso,10,'total');
  upsert('chartPorCurso','bar',cursos.map(x=>x.key),[{label:'Asistieron',data:cursos.map(x=>x.si),backgroundColor:PALETTE.green},{label:'No asistieron',data:cursos.map(x=>x.no),backgroundColor:PALETTE.red}],{indexAxis:'y',scales:{x:{stacked:true,beginAtZero:true},y:{stacked:true}}});
  const inst=top(a.instructor,10,'total');
  upsert('chartPorInstructor','bar',inst.map(x=>x.key),[{label:'% asistencia',data:inst.map(x=>x.pct),backgroundColor:PALETTE.blue}],{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'}}}});
  upsert('chartHorasPeriodo','line',a.periodo.map(x=>x.key),[{label:'Horas',data:a.periodo.map(x=>x.horas),borderColor:PALETTE.blue,backgroundColor:'rgba(35,90,127,.10)',fill:true,tension:.2}],{plugins:{legend:{display:false}}});
  const notas=(s.filtered||[]).map(x=>parseNotaNumero(x.NOTA)).filter(x=>x!==null);
  const bins=[0,60,70,80,90,101], labels=['<60','60–69','70–79','80–89','90–100'], counts=[0,0,0,0,0];
  for(const n of notas){ let idx=n<60?0:n<70?1:n<80?2:n<90?3:4; counts[idx]++; }
  upsert('chartNotas','bar',labels,[{label:'Registros',data:counts,backgroundColor:PALETTE.amber}],{plugins:{legend:{display:false}}});
}

export function renderAnalitica(s){
  performance.mark?.('tdc-analytics-start');
  const a=getAnalytics(s);
  renderSummary(a); renderInsights(a);
  const run=()=>{renderCharts(a,s);performance.mark?.('tdc-analytics-end');try{performance.measure?.('tdc-analytics-render','tdc-analytics-start','tdc-analytics-end')}catch{}};
  if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:180}); else requestAnimationFrame(run);
}
