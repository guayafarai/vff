const API_URL = '/api/agenda';

const $ = id => document.getElementById(id);
let partidos = [];

// Quita tildes y mayúsculas para buscar fácil.
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Fecha local en formato AAAA-MM-DD (en-CA ya usa ese formato).
const fechaLocal = d => d.toLocaleDateString('en-CA');
const hora = d => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });

function sumarDia(fecha, n) {
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return fechaLocal(d);
}

async function pedir(fecha) {
  const res = await fetch(`${API_URL}?fecha=${fecha}`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  // Si la API desplegada es otra versión, avisamos en vez de fallar sin explicación.
  if (!Array.isArray(json.partidos)) {
    throw new Error('Respuesta inesperada de /api/agenda (falta "partidos"): ' + JSON.stringify(json).slice(0, 200));
  }
  return json.partidos;
}

async function cargar() {
  const fecha = $('fecha').value;
  $('lista').innerHTML = '<div class="estado">Cargando agenda...</div>';
  try {
    // La API guarda los partidos por fecha UTC, así que un partido de la noche
    // en América cae al día siguiente. Pedimos ambos días y filtramos por fecha local.
    const [hoy, manana] = await Promise.all([pedir(fecha), pedir(sumarDia(fecha, 1))]);
    const vistos = new Set();
    partidos = [...hoy, ...manana]
      .filter(p => !vistos.has(p.id) && vistos.add(p.id))
      .map(p => ({ ...p, inicio: new Date(p.inicio) }))
      .filter(p => fechaLocal(p.inicio) === fecha)
      .sort((a, b) => a.inicio - b.inicio);

    const paises = [...new Set(partidos.flatMap(p => p.canales.map(c => c.pais)).filter(Boolean))].sort();
    const actual = $('pais').value;
    $('pais').innerHTML = '<option value="">Todos los países</option>' +
      paises.map(p => `<option value="${p}">${p}</option>`).join('');
    $('pais').value = paises.includes(actual) ? actual : '';

    $('titulo').textContent = 'Partidos · ' +
      new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    mostrar();
  } catch (err) {
    console.error(err);
    $('lista').innerHTML = '<div class="estado">No se pudo cargar la agenda. Intenta de nuevo en un momento.</div>';
  }
}

function mostrar() {
  const q = norm($('buscar').value);
  const pais = $('pais').value;
  const deporte = $('deporte').value;
  const lista = $('lista');
  lista.innerHTML = '';

  const visibles = partidos
    .map(p => ({ ...p, canales: pais ? p.canales.filter(c => c.pais === pais) : p.canales }))
    .filter(p => (!deporte || p.deporte === deporte) && (!pais || p.canales.length) && norm(p.partido + ' ' + p.torneo).includes(q));

  if (!visibles.length) {
    lista.innerHTML = '<div class="estado">No hay partidos para mostrar.</div>';
    return;
  }

  for (const p of visibles) {
    const fila = document.createElement('div');
    fila.className = 'partido';

    const h = document.createElement('div');
    h.className = 'hora';
    h.textContent = hora(p.inicio);

    const info = document.createElement('div');
    info.className = 'info';
    const titulo = document.createElement('div');
    const torneo = document.createElement('span');
    torneo.className = 'torneo';
    torneo.textContent = p.torneo ? p.torneo + ': ' : '';
    titulo.append(torneo, document.createTextNode(p.partido));
    info.appendChild(titulo);

    const canales = document.createElement('div');
    canales.className = 'canales';
    for (const c of p.canales) {
      const chip = document.createElement('span');
      chip.className = 'canal';
      chip.textContent = pais || !c.pais ? c.nombre : `${c.nombre} (${c.pais})`;
      canales.appendChild(chip);
    }
    info.appendChild(canales);

    fila.append(h, info);
    lista.appendChild(fila);
  }
}

$('fecha').value = fechaLocal(new Date());
$('fecha').addEventListener('change', cargar);
$('pais').addEventListener('change', mostrar);
$('deporte').addEventListener('change', mostrar);
$('buscar').addEventListener('input', mostrar);
cargar();
