#!/usr/bin/env node
// Genera flowermatch/lib/recomendador-datos.ts a partir de shared/recomendador/*.json
// Uso: node scripts/generar-constantes-ts.js

'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT         = path.resolve(__dirname, '..');
const SHARED       = path.join(ROOT, 'shared', 'recomendador');
const COLORES_PATH = path.join(ROOT, 'shared', 'colores.json');
const SALIDA       = path.join(ROOT, 'flowermatch', 'lib', 'recomendador-datos.ts');

// Mapeo canónico: nombre exacto en recomendaciones.json → ID en FLORES_ESTATICAS (api.ts)
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

/**
 * Verifica que los campos requeridos existen y tienen el tipo esperado.
 * tipo: 'object' (plain object, no array) | 'string' | 'array'
 */
function validarCampos(archivo, datos, campos) {
  const tipoReal = v => Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);
  if (tipoReal(datos) !== 'object') {
    throw new Error(`${archivo}: debe ser un objeto JSON, encontrado ${tipoReal(datos)}`);
  }
  for (const [campo, tipo] of campos) {
    if (!(campo in datos)) {
      throw new Error(`${archivo}: falta el campo "${campo}"`);
    }
    const t = tipoReal(datos[campo]);
    if (t !== tipo) {
      throw new Error(`${archivo}: "${campo}" debe ser ${tipo}, encontrado ${t}`);
    }
  }
}

function validarObjetoRaiz(archivo, datos) {
  const tipoReal = v => Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);
  if (tipoReal(datos) !== 'object') {
    throw new Error(`${archivo}: debe ser un objeto JSON, encontrado ${tipoReal(datos)}`);
  }
}

function cargarJSON(nombre) {
  const ruta = path.join(SHARED, `${nombre}.json`);
  if (!fs.existsSync(ruta)) {
    throw new Error(`Archivo no encontrado: ${ruta}`);
  }
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf-8'));
  } catch (e) {
    throw new Error(`Error al parsear ${nombre}.json: ${e.message}`);
  }
}

function strArr(arr) {
  return `[${arr.map(s => JSON.stringify(s)).join(', ')}]`;
}

function recordStrArr(obj) {
  const keys = Object.keys(obj);
  const pad  = Math.max(...keys.map(k => k.length));
  return keys.map(k => `  ${k.padEnd(pad)}: ${strArr(obj[k])},`).join('\n');
}

function recordStr(obj) {
  const keys = Object.keys(obj);
  const pad  = Math.max(...keys.map(k => k.length));
  return keys.map(k => `  ${k.padEnd(pad)}: ${JSON.stringify(obj[k])},`).join('\n');
}

function recordNestedStr(obj) {
  return Object.entries(obj).map(([k, sub]) => {
    const inner = Object.entries(sub)
      .map(([sk, sv]) => `    ${sk}: ${JSON.stringify(sv)},`)
      .join('\n');
    return `  ${k}: {\n${inner}\n  },`;
  }).join('\n');
}

function recordIntArr(obj) {
  const keys = Object.keys(obj);
  const pad  = Math.max(...keys.map(k => k.length));
  return keys.map(k => `  ${k.padEnd(pad)}: [${obj[k].join(', ')}],`).join('\n');
}

// Hash de sincronización: SHA-256 (primeros 16 chars) del contenido raw de los 4 JSON + colores.json
const ARCHIVOS_HASH = ['intenciones', 'contextos', 'mensajes', 'recomendaciones'];
const datosHash = crypto
  .createHash('sha256')
  .update([
    ...ARCHIVOS_HASH.map(n => fs.readFileSync(path.join(SHARED, `${n}.json`), 'utf-8')),
    fs.readFileSync(COLORES_PATH, 'utf-8'),
  ].join('\n'))
  .digest('hex')
  .slice(0, 16);

// Carga colores
if (!fs.existsSync(COLORES_PATH)) {
  throw new Error(`Archivo no encontrado: ${COLORES_PATH}`);
}
const colores = JSON.parse(fs.readFileSync(COLORES_PATH, 'utf-8'));
if (!Array.isArray(colores) || colores.length === 0) {
  throw new Error('shared/colores.json debe ser un array no vacío de strings');
}

// Carga + validación estructural mínima
const intenciones    = cargarJSON('intenciones');
validarCampos('intenciones.json', intenciones, [
  ['frases_prioritarias', 'object'],
  ['palabras_clave',      'object'],
]);

const contextos = cargarJSON('contextos');
validarObjetoRaiz('contextos.json', contextos);

const mensajes = cargarJSON('mensajes');
validarCampos('mensajes.json', mensajes, [
  ['genericos',    'object'],
  ['contextuales', 'object'],
]);

const recomendaciones = cargarJSON('recomendaciones');
validarObjetoRaiz('recomendaciones.json', recomendaciones);

// IDS_POR_INTENCION: derivado de recomendaciones.json + FLORES_NOMBRE_A_ID
const idsPorIntencion = {};
for (const [intencion, flores] of Object.entries(recomendaciones)) {
  idsPorIntencion[intencion] = flores.map(nombre => {
    const id = FLORES_NOMBRE_A_ID[nombre];
    if (!id) {
      throw new Error(`Flor sin ID mapeado: "${nombre}" (intención: ${intencion}). Actualiza FLORES_NOMBRE_A_ID en este script.`);
    }
    return id;
  });
}

// Generación
const ts = `// AUTO-GENERADO — no editar directamente.
// Para regenerar: node scripts/generar-constantes-ts.js
// Fuente canónica: shared/recomendador/*.json + shared/colores.json
// Verificar sincronía: node scripts/check-datos-ts.js  (o: npm run check:datos)

// SHA-256 (primeros 16 chars) de los JSON fuente. Si editas los JSON, regenera este archivo.
export const DATOS_HASH = '${datosHash}'

// Fuente canónica: shared/colores.json
export const COLORES: string[] = ${JSON.stringify(colores)}

export const _PESO_PRIORITARIO = 50

export const FRASES_PRIORITARIAS: Record<string, string[]> = {
${recordStrArr(intenciones.frases_prioritarias)}
}

export const PALABRAS_CLAVE: Record<string, string[]> = {
${recordStrArr(intenciones.palabras_clave)}
}

export const CONTEXTOS: Record<string, string[]> = {
${recordStrArr(contextos)}
}

export const MENSAJES: Record<string, string> = {
${recordStr(mensajes.genericos)}
}

export const MENSAJES_CONTEXTUALES: Record<string, Record<string, string>> = {
${recordNestedStr(mensajes.contextuales)}
}

// TS-specific: mapea cada intención a IDs en FLORES_ESTATICAS (api.ts).
// Derivado de recomendaciones.json vía FLORES_NOMBRE_A_ID en el script generador.
export const IDS_POR_INTENCION: Record<string, number[]> = {
${recordIntArr(idsPorIntencion)}
}
`;

fs.writeFileSync(SALIDA, ts, 'utf-8');
console.log(`Generado: ${path.relative(ROOT, SALIDA)}`);
