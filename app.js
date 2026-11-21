const $ = s => document.querySelector(s);
const ler = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
let aulas = ler('aulas'), tarefas = ler('tarefas');
const esc = t => String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function desenharAulas() {
  const el = $('#listaAulas');
  if (!aulas.length) { el.innerHTML = '<p class="vazio">Ainda sem aulas. Adiciona a primeira.</p>'; return; }
  let h = '';
  for (let d = 1; d <= 6; d++) {
    const doDia = aulas.filter(a => a.dia == d).sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (!doDia.length) continue;
    h += `<div class="dia">${DIAS[d]}</div>`;
    doDia.forEach(a => h += `<div class="item"><div><b>${esc(a.disciplina)}</b><small>${a.inicio}–${a.fim}${a.sala ? ' · ' + esc(a.sala) : ''}</small></div><div class="acoes"><button data-del-aula="${a.id}">Apagar</button></div></div>`);
  }
  el.innerHTML = h;
}

function diasAte(data) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(data + 'T00:00:00') - hoje) / 864e5);
}

function desenharTarefas() {
  const el = $('#listaTarefas');
  if (!tarefas.length) { el.innerHTML = '<p class="vazio">Sem tarefas. Adiciona um prazo.</p>'; return; }
  const ord = [...tarefas].sort((a, b) => a.feito - b.feito || a.data.localeCompare(b.data));
  el.innerHTML = ord.map(t => {
    const d = diasAte(t.data);
    const quando = d < 0 ? `atrasada ${-d} d` : d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias`;
    return `<div class="item ${t.feito ? 'feito' : d <= 1 ? 'urg' : ''}"><div><b>${esc(t.titulo)}</b><small>${esc(t.tipo)}${t.disciplina ? ' · ' + esc(t.disciplina) : ''} · ${quando}</small></div><div class="acoes"><button data-ok="${t.id}">${t.feito ? 'Reabrir' : 'Feito'}</button><button data-del-tarefa="${t.id}">Apagar</button></div></div>`;
  }).join('');
}

$('#fAula').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  aulas.push({ id: Date.now(), ...f });
  gravar('aulas', aulas); e.target.reset(); desenharAulas();
});
$('#fTarefa').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  tarefas.push({ id: Date.now(), feito: false, ...f });
  gravar('tarefas', tarefas); e.target.reset(); desenharTarefas();
});
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.delAula) { aulas = aulas.filter(a => a.id != b.dataset.delAula); gravar('aulas', aulas); desenharAulas(); }
  if (b.dataset.delTarefa) { tarefas = tarefas.filter(t => t.id != b.dataset.delTarefa); gravar('tarefas', tarefas); desenharTarefas(); }
  if (b.dataset.ok) { const t = tarefas.find(t => t.id == b.dataset.ok); t.feito = !t.feito; gravar('tarefas', tarefas); desenharTarefas(); }
  if (b.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b));
    $('#horario').hidden = b.dataset.v !== 'horario';
    $('#tarefas').hidden = b.dataset.v !== 'tarefas';
  }
});

async function avisar() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  tarefas.filter(t => !t.feito && diasAte(t.data) <= 1).forEach(t =>
    reg.showNotification('Prazo a chegar', { body: `${t.titulo} (${t.tipo})`, tag: 't' + t.id }));
}
$('#notif').addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('Este navegador não suporta notificações.');
  if (await Notification.requestPermission() === 'granted') avisar();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(avisar).catch(() => {});
desenharAulas(); desenharTarefas();
