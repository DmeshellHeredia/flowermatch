#!/usr/bin/env node
// Verifica que flowermatch/lib/recomendador-datos.ts está sincronizado con los JSON fuente
// y que todos los nombres de recomendaciones.json existen en el catálogo estático.
// Uso: node scripts/check-datos-ts.js
// Falla con exit 1 si el TS no fue regenerado o si una flor referenciada no está en el catálogo.

'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT         = path.resolve(__dirname, '..');
const SHARED       = path.join(ROOT, 'shared', 'recomendador');
const COLORES_PATH = path.join(ROOT, 'shared', 'colores.json');
const TS_FILE      = path.join(ROOT, 'flowermatch', 'lib', 'recomendador-datos.ts');

// Catálogo estático canónico — debe coincidir con FLORES_ESTATICAS en api.ts
// y con FLORES_NOMBRE_A_ID en generar-constantes-ts.js.
const FLORES_NOMBRE_A_ID = {
  'Rosa Roja':        1,
  'Girasol':          2,
  'Tulipán Morado':   3,
  'Lirio Blanco':     4,
  'Margarita':        5,
  'Orquídea Púrpura': 6,
  'Clavel Rosado':    7,
  'Amapola Roja':     8,
  'Hortensia Azul':   9,
  'Gerbera Naranja':  10,
  'Lavanda':          11,
  'Peonía Rosa':      12,
};

const ARCHIVOS = ['intenciones', 'contextos', 'mensajes', 'recomendaciones'];

const hashActual = crypto
  .createHash('sha256')
  .update([
    ...ARCHIVOS.map(n => fs.readFileSync(path.join(SHARED, `${n}.json`), 'utf-8')),
    fs.readFileSync(COLORES_PATH, 'utf-8'),
  ].join('\n'))
  .digest('hex')
  .slice(0, 16);

const ts = fs.readFileSync(TS_FILE, 'utf-8');
const match = ts.match(/export const DATOS_HASH = '([a-f0-9]+)'/);

if (!match) {
  console.error('ERROR: DATOS_HASH no encontrado en recomendador-datos.ts');
  console.error('       Regenera: node scripts/generar-constantes-ts.js');
  process.exit(1);
}

const hashGenerado = match[1];

if (hashActual !== hashGenerado) {
  console.error('ERROR: recomendador-datos.ts está DESACTUALIZADO.');
  console.error(`       Hash JSON actual : ${hashActual}`);
  console.error(`       Hash en TS       : ${hashGenerado}`);
  console.error('       Ejecuta: node scripts/generar-constantes-ts.js');
  process.exit(1);
}

// Validar que COLORES en el TS generado coincide con shared/colores.json.
const coloresJSON = JSON.parse(fs.readFileSync(COLORES_PATH, 'utf-8'));
const coloresMatch = ts.match(/export const COLORES: string\[\] = (\[.*?\])/s);
if (!coloresMatch) {
  console.error('ERROR: COLORES no encontrado en recomendador-datos.ts');
  console.error('       Regenera: node scripts/generar-constantes-ts.js');
  process.exit(1);
}
const coloresEnTS = JSON.parse(coloresMatch[1]);
const diff = [
  ...coloresJSON.filter(c => !coloresEnTS.includes(c)).map(c => `+ "${c}" (en JSON, ausente en TS)`),
  ...coloresEnTS.filter(c => !coloresJSON.includes(c)).map(c => `- "${c}" (en TS, ausente en JSON)`),
];
if (diff.length > 0) {
  console.error('ERROR: COLORES en recomendador-datos.ts no coincide con shared/colores.json:');
  diff.forEach(d => console.error(`       ${d}`));
  console.error('       Ejecuta: node scripts/generar-constantes-ts.js');
  process.exit(1);
}
console.log(`OK: COLORES sincronizado (${coloresJSON.length} colores)`);

// Validar que cada nombre en recomendaciones.json existe en el catálogo estático.
const recomendaciones = JSON.parse(fs.readFileSync(path.join(SHARED, 'recomendaciones.json'), 'utf-8'));
const faltantes = [];
for (const [intencion, flores] of Object.entries(recomendaciones)) {
  for (const nombre of flores) {
    if (!(nombre in FLORES_NOMBRE_A_ID)) {
      faltantes.push({ nombre, intencion });
    }
  }
}

if (faltantes.length > 0) {
  console.error('ERROR: flores en recomendaciones.json sin entrada en el catálogo estático:');
  for (const { nombre, intencion } of faltantes) {
    console.error(`       - "${nombre}" (intención: ${intencion})`);
  }
  console.error('       Añade la flor a FLORES_NOMBRE_A_ID en generar-constantes-ts.js');
  console.error('       y a FLORES_ESTATICAS en flowermatch/lib/api.ts, luego regenera.');
  process.exit(1);
}

console.log(`OK: recomendador-datos.ts sincronizado (${hashActual})`);
console.log(`OK: ${Object.values(recomendaciones).flat().length} referencias de flores validadas contra el catálogo estático`);

// Validar cobertura cruzada: toda intención definida debe tener flores asignadas.
// Sin esta validación, añadir una intención a intenciones.json o mensajes.json
// sin actualizar recomendaciones.json produce flores: [] silenciosamente.
const intenciones = JSON.parse(fs.readFileSync(path.join(SHARED, 'intenciones.json'), 'utf-8'));
const mensajes    = JSON.parse(fs.readFileSync(path.join(SHARED, 'mensajes.json'),    'utf-8'));

const intencionesDefinidas = new Set([
  ...Object.keys(intenciones.palabras_clave ?? {}),
  ...Object.keys(mensajes.genericos         ?? {}),
]);
const intencionesConFlores = new Set(Object.keys(recomendaciones));

const sinFlores = [...intencionesDefinidas].filter(i => !intencionesConFlores.has(i));
if (sinFlores.length > 0) {
  console.error('ERROR: intenciones definidas sin flores asignadas en recomendaciones.json:');
  sinFlores.forEach(i => console.error(`       - "${i}"`));
  console.error('       Añade la intención a recomendaciones.json y regenera: node scripts/generar-constantes-ts.js');
  process.exit(1);
}

console.log(`OK: cobertura cruzada verificada — ${intencionesDefinidas.size} intenciones con flores asignadas`);
