#!/usr/bin/env node
/**
 * Compara scoring Python (TF-IDF) vs TS (keyword count) para un set de queries.
 * Ejecutar: node scripts/check-paridad-recomendador.js
 *
 * Diferencia arquitectónica:
 *   Python → tf * idf * bonus  (IDF = log(N / df), bonus = n° palabras de la keyword)
 *   TS     → bonus             (solo conteo de palabras de la keyword, sin IDF)
 *
 * Con el dataset actual (casi todas las keywords son únicas por intención),
 * IDF ≈ log(N/1) = constante → mismo orden relativo → misma intención ganadora.
 * La divergencia real aparece si una keyword se añade a MÚLTIPLES intenciones
 * (IDF baja en Python, peso igual en TS).
 *
 * El script sale con código 1 si detecta divergencias NO documentadas.
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const SHARED = path.join(ROOT, 'shared', 'recomendador');

function cargarJSON(nombre) {
  return JSON.parse(fs.readFileSync(path.join(SHARED, `${nombre}.json`), 'utf-8'));
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const { frases_prioritarias: FRASES, palabras_clave: PALABRAS } = cargarJSON('intenciones');

const PESO_PRIORITARIO = 50.0;
const N = Object.keys(PALABRAS).length;

// IDF: log(N / df), df = cuántas intenciones tienen esa keyword exacta
const df = {};
for (const palabras of Object.values(PALABRAS)) {
  for (const p of new Set(palabras.map(normalizar))) {
    df[p] = (df[p] || 0) + 1;
  }
}
const IDF = Object.fromEntries(Object.entries(df).map(([p, d]) => [p, Math.log(N / d)]));

/**
 * Python-style: tf * idf * bonus
 */
function scorePython(consulta) {
  const texto = normalizar(consulta);
  const puntajes = Object.fromEntries(Object.keys(PALABRAS).map(k => [k, 0]));

  for (const [intencion, frases] of Object.entries(FRASES)) {
    for (const frase of frases) {
      const fn = normalizar(frase);
      const tf = (texto.match(new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (tf > 0) {
        puntajes[intencion] += PESO_PRIORITARIO * fn.split(' ').length * tf;
      }
    }
  }

  for (const [intencion, palabras] of Object.entries(PALABRAS)) {
    for (const p of palabras) {
      const pn = normalizar(p);
      const tf = (texto.match(new RegExp(pn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (tf > 0) {
        const idf   = IDF[pn] ?? 1.0;
        const bonus = pn.split(' ').length;
        puntajes[intencion] += tf * idf * bonus;
      }
    }
  }

  const max = Math.max(...Object.values(puntajes));
  if (max === 0) return 'general';
  return Object.entries(puntajes).find(([, v]) => v === max)[0];
}

/**
 * TS-style: match booleano, solo bonus de longitud (sin IDF, sin TF)
 */
function scoreTS(consulta) {
  const texto = normalizar(consulta);
  const puntos = Object.fromEntries(Object.keys(PALABRAS).map(k => [k, 0]));

  for (const [intencion, frases] of Object.entries(FRASES)) {
    for (const frase of frases) {
      const fn = normalizar(frase);
      if (texto.includes(fn)) {
        puntos[intencion] = (puntos[intencion] || 0) + PESO_PRIORITARIO * fn.split(' ').length;
      }
    }
  }

  for (const [intencion, palabras] of Object.entries(PALABRAS)) {
    for (const p of palabras) {
      const pn = normalizar(p);
      if (texto.includes(pn)) {
        puntos[intencion] += pn.split(' ').length;
      }
    }
  }

  const max = Math.max(...Object.values(puntos));
  if (max === 0) return 'general';
  return Object.entries(puntos).find(([, v]) => v === max)[0];
}

// ─── Queries de prueba ────────────────────────────────────────────────────────
// Formato: [consulta, intencion_esperada_humana, 'EXPECTED_DIVERGENCE' | null, nota]
const QUERIES = [
  // ── Frases prioritarias dominantes — ningún algoritmo puede divergir ──────
  ['quiero pedir perdón a mi mejor amigo',      'disculpa',       null, 'FRASE PRIORITARIA "pedir perdon" (100pts) domina "mejor amigo" (2pts)'],
  ['condolencias para una amiga',               'luto',           null, 'FRASE PRIORITARIA "condolencias" (50pts) domina "amiga" (1pt)'],
  ['quiero agradecer a una compañera',          'agradecimiento', null, 'FRASE PRIORITARIA "quiero agradecer" (100pts)'],
  ['flores para el día de las madres',          'dia_madres',     null, 'FRASE PRIORITARIA "dia de las madres" (200pts)'],
  ['funeral de un amigo',                       'luto',           null, 'FRASE PRIORITARIA "funeral" (50pts) domina "amigo" (1pt)'],
  ['necesito reconciliarme con mi pareja',      'disculpa',       null, 'FRASE PRIORITARIA "reconciliarme" (50pts) domina "pareja" (1pt)'],
  ['baby shower para mi hermana',               'nacimiento',     null, 'FRASE PRIORITARIA "baby shower" (100pts)'],
  ['lo siento mucho, fue mi culpa',             'disculpa',       null, 'FRASES PRIORITARIAS acumulan muchos puntos'],

  // ── Keywords claros — una sola intención activa ───────────────────────────
  ['flores para mi novia',                      'romance',        null, '"novia" solo en romance'],
  ['algo para relajar y dar calma',             'bienestar',      null, '"relajar"+"calma" ambos en bienestar, suma 2 pts'],
  ['aniversario de boda',                       'aniversario',    null, '"aniversario"+"boda" ambos en aniversario'],
  ['computadoras electrodomesticos internet',   'general',        null, 'sin keywords → general'],
  ['amor',                                      'romance',        null, '"amor" solo en romance'],
  ['gracias',                                   'agradecimiento', null, '"gracias" solo en agradecimiento'],

  // ── Divergencia de scoring — score diferente, ganador igual ─────────────
  // PHP usa str_contains() (presencia booleana); Python usa .count() (TF).
  // Con frases repetidas, Python multiplica el score por TF; PHP lo cuenta una sola vez.
  // El ganador es idéntico siempre que la frase dominante no esté en empate.
  // La única forma de que cambie el ganador es: empate preexistente + keyword repetida.
  // Ese escenario no ocurre en el dataset actual (frases prioritarias dominan con margen).
  ['pedir perdón pedir perdón', 'disculpa', null,
    'Divergencia scoring PHP/Python: PHP score=100 (str_contains×1), Python score=200 (count×2). Ganador idéntico: disculpa domina en ambos.'],

  // ── Casos con empate — desempate por orden del dict ──────────────────────
  // Ambos algoritmos dan el mismo resultado, pero puede ser contra-intuitivo.
  ['gracias por tu apoyo',                      'amistad',        'EXPECTED_DIVERGENCE',
    'Empate: "apoyo"→amistad(1pt) vs "gracias"→agradecimiento(1pt). Amistad antes en dict. Humano esperaría agradecimiento.'],
  ['cumpleaños de mi mejor amiga',              'amistad',        'EXPECTED_DIVERGENCE',
    'Empate 3-3: amistad("amiga","mejor amiga") vs cumpleanos("cumpleanos","cumple","anos"). Amistad antes en dict.'],
];

// ─── Ejecución ────────────────────────────────────────────────────────────────
let totalOk = 0;
let totalDivergencias = 0;
let totalEsperadas = 0;

console.log('\n═══ Paridad Recomendador Python (IDF) vs TS (count) ═══\n');

for (const [consulta, esperado, tipo, nota] of QUERIES) {
  const py = scorePython(consulta);
  const ts = scoreTS(consulta);
  const acuerdan = py === ts;
  const esperadoOk = tipo === 'EXPECTED_DIVERGENCE' ? true : (py === esperado && ts === esperado);

  let estado;
  if (!acuerdan) {
    estado = '✗ DIVERGEN';
    totalDivergencias++;
  } else if (tipo === 'EXPECTED_DIVERGENCE') {
    estado = '△ ESPERADO';
    totalEsperadas++;
  } else {
    estado = '✓ OK';
    totalOk++;
  }

  console.log(`${estado}  "${consulta}"`);
  if (!acuerdan) {
    console.log(`         Python → ${py}  |  TS → ${ts}`);
  } else {
    console.log(`         ambos → ${py}`);
  }
  if (nota) console.log(`         nota : ${nota}`);
  console.log();
}

console.log('═══════════════════════════════════════════════════════');
console.log(`OK: ${totalOk}  |  Esperadas: ${totalEsperadas}  |  No esperadas: ${totalDivergencias}`);
console.log('═══════════════════════════════════════════════════════\n');

if (totalDivergencias > 0) {
  console.error(`ERROR: ${totalDivergencias} divergencia(s) no documentada(s).`);
  console.error('       Añade cada caso a QUERIES con tipo "EXPECTED_DIVERGENCE" y una nota explicativa,');
  console.error('       o ajusta los datos en shared/recomendador/ para eliminar la divergencia.');
  process.exit(1);
}

console.log('Todas las divergencias están documentadas o no existen.');
