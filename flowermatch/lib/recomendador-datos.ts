// AUTO-GENERADO — no editar directamente.
// Para regenerar: node scripts/generar-constantes-ts.js
// Fuente canónica: shared/recomendador/*.json + shared/colores.json
// Verificar sincronía: node scripts/check-datos-ts.js  (o: npm run check:datos)

// SHA-256 (primeros 16 chars) de los JSON fuente. Si editas los JSON, regenera este archivo.
export const DATOS_HASH = '4a1902256804e385'

// Fuente canónica: shared/colores.json
export const COLORES: string[] = ["Rojo","Amarillo","Morado","Blanco","Rosado","Azul","Naranja","Morado claro","Verde"]

export const _PESO_PRIORITARIO = 50

export const FRASES_PRIORITARIAS: Record<string, string[]> = {
  disculpa      : ["pedir perdon", "pidiendo perdon", "pido perdon", "pide perdon", "lo siento mucho", "lo siento", "me disculpo", "quiero disculparme", "perdoname", "disculpame", "pido disculpas", "pide disculpas", "fue mi culpa", "me arrepiento", "arrepentido", "arrepentida", "meter la pata", "no fue mi intencion", "reconciliarme", "reconciliacion", "reconciliar"],
  luto          : ["condolencias", "pesame", "en paz descanse", "descanso eterno", "fallecio", "fallecida", "fallecido", "funeral", "velorio", "sepelio", "duelo", "difunto", "difunta", "perder a alguien"],
  salud         : ["que te mejores", "pronta recuperacion", "curate pronto", "curate rapido", "visita al hospital", "esta en el hospital", "fue operado", "fue operada", "en recuperacion", "convalecencia", "deseo de salud", "mejorate pronto"],
  agradecimiento: ["muchas gracias", "te lo agradezco", "en agradecimiento", "mi agradecimiento", "gesto de gratitud", "muy agradecido", "muy agradecida", "infinitas gracias", "con gratitud", "quiero agradecer", "para agradecer"],
  nacimiento    : ["recien nacido", "recien nacida", "baby shower", "llegada del bebe", "nueva vida", "esperando un bebe", "va a nacer", "acaba de nacer", "nacio el bebe"],
  dia_madres    : ["dia de la madre", "dia de las madres", "honrar a mama", "10 de mayo", "regalo para mama", "regalo para mi madre"],
  bienestar     : ["momento de calma", "reducir estres", "aliviar ansiedad", "necesito relajarme", "quiero relajarme", "para meditar", "para hacer spa", "autocuidado", "mindfulness"],
  romance       : ["san valentin", "dia de los enamorados", "declarar mi amor", "primera cita romantica", "conquistar su corazon", "enamorarla", "enamorarlo"],
}

export const PALABRAS_CLAVE: Record<string, string[]> = {
  romance       : ["amor", "te quiero", "enamorado", "enamorada", "cita", "novio", "novia", "pareja", "romantico", "romantica", "pasion", "corazon", "beso", "abrazo", "enamorar", "galanteo", "san valentin", "declarar", "seducir", "conquistar", "mi amor", "te amo"],
  amistad       : ["amigo", "amiga", "amistad", "companero", "companera", "mejor amigo", "mejor amiga", "colega", "carino", "apoyo", "compadre", "cuate", "amistoso", "fraternidad"],
  disculpa      : ["perdon", "lo siento", "disculpa", "error", "arrepiento", "arrepentido", "arrepentida", "equivoque", "falle", "reconciliar", "perdoname", "disculpame", "culpa", "meter la pata", "pido disculpas", "fue mi culpa", "no fue mi intencion", "me disculpo", "quiero disculparme", "reconciliacion", "reconciliarme"],
  cumpleanos    : ["cumpleanos", "cumple", "celebracion", "anos", "fiesta", "felicidades", "natalicio", "festejo", "feliz cumpleanos", "cumpleanero", "cumpleanera", "anos de vida"],
  aniversario   : ["aniversario", "anos juntos", "matrimonio", "boda", "casados", "union", "compromiso", "prometido", "prometida", "vida juntos", "luna de miel", "anos de casados", "feliz aniversario"],
  agradecimiento: ["gracias", "agradecido", "agradecida", "agradezco", "gratitud", "reconocimiento", "aprecio", "muchas gracias", "muy agradecido", "te lo agradezco", "en agradecimiento", "gesto de gratitud", "con gratitud", "mi agradecimiento", "infinitas gracias", "agradecimiento sincero", "reconocer el esfuerzo", "agradecer", "agradecerte", "agradecerle"],
  luto          : ["luto", "condolencias", "pesame", "fallecio", "muerto", "muerte", "funeral", "difunto", "duelo", "velorio", "sepelio", "ausencia", "fallecida", "fallecido", "en paz descanse", "descanso eterno", "partida", "perder a alguien", "funeral flores", "tristeza profunda", "memoria", "recordar", "eterno descanso", "homenaje postumo"],
  graduacion    : ["graduacion", "graduado", "graduada", "titulo", "diploma", "logro", "egresado", "egresada", "universitario", "licenciatura", "maestria", "doctorado", "terminar carrera", "examen", "tesis", "felicidades graduado", "te graduaste", "termino la carrera", "culminar estudios", "obtener titulo", "recibirse"],
  salud         : ["enfermo", "enferma", "hospital", "recuperacion", "mejoria", "clinica", "operacion", "cirugia", "internado", "internada", "que te mejores", "pronta recuperacion", "herido", "herida", "convalecencia", "visita al hospital", "curate pronto", "deseo de salud", "mejorate", "accidente", "lesion", "fractura", "diagnostico", "tratamiento", "terapia", "rehabilitacion"],
  nacimiento    : ["bebe", "nacimiento", "recien nacido", "recien nacida", "embarazo", "parto", "bautizo", "llegada del bebe", "nuevo miembro", "bebita", "bebito", "nacio", "baby shower", "esperando bebe", "nueva vida", "recibir bebe", "embarazada", "gestacion", "maternidad", "paternidad", "primer hijo", "primera hija"],
  dia_madres    : ["mama", "madre", "dia de la madre", "dia de las madres", "mami", "abuela", "abuelita", "materna", "materno", "honrar a mama", "regalo para mama", "regalo para madre", "10 de mayo", "dia especial mama", "gracias mama", "te quiero mama"],
  decoracion    : ["decorar", "decoracion", "evento", "salon", "arreglo floral", "centro de mesa", "ambiente", "boda decoracion", "fiesta decoracion", "adorno", "ornamento", "arreglo de flores", "ambientar", "decorar salon", "floral", "instalacion floral", "mesa de flores", "ambiente romantico", "decoracion evento", "centros florales"],
  lujo          : ["lujo", "exclusivo", "exclusiva", "elegante", "sofisticado", "sofisticada", "premium", "lujoso", "lujosa", "exotico", "exotica", "regalo especial", "regalo exclusivo", "regalo de lujo", "distincion", "clase alta", "fino", "fina", "selecto", "alta gama", "distinguido", "distinguida", "opulento", "opulenta", "de primera clase", "regalo memorable", "impresionar"],
  bienestar     : ["relajar", "relajacion", "tranquilidad", "paz", "meditacion", "bienestar", "calma", "stress", "estres", "ansiedad", "serenidad", "zen", "descanso", "alivio", "armonia", "equilibrio", "mindfulness", "spa", "autocuidado", "respirar", "desconectar", "retiro", "momento para mi", "cuidarme", "yoga", "naturaleza", "paz interior"],
}

export const CONTEXTOS: Record<string, string[]> = {
  amistad: ["mejor amigo", "mejor amiga", "amigo de toda la vida", "amiga de toda la vida", "amigo", "amiga", "companero", "companera", "colega", "cuate", "compadre"],
  pareja : ["novio", "novia", "pareja", "esposo", "esposa", "prometido", "prometida", "marido"],
  familia: ["abuela", "abuelo", "mama", "madre", "papa", "padre", "hijo", "hija", "hermano", "hermana", "tio", "tia", "familiar", "familia"],
  trabajo: ["companero de trabajo", "companera de trabajo", "jefe", "jefa", "cliente", "empleado", "empleada", "colega de trabajo", "socio", "socia"],
}

export const MENSAJES: Record<string, string> = {
  romance       : "Para expresar amor romántico, te recomendamos:",
  amistad       : "Para celebrar la amistad, estas flores son perfectas:",
  disculpa      : "Para pedir perdón con sinceridad, te recomendamos:",
  cumpleanos    : "Para celebrar un cumpleaños con alegría:",
  aniversario   : "Para conmemorar un aniversario especial:",
  agradecimiento: "Para expresar gratitud de corazón:",
  luto          : "Para acompañar en un momento de duelo:",
  graduacion    : "Para celebrar un gran logro académico:",
  salud         : "Para desear una pronta recuperación:",
  nacimiento    : "Para celebrar la llegada de una nueva vida:",
  dia_madres    : "Para honrar a mamá en su día especial:",
  decoracion    : "Para crear un arreglo floral elegante:",
  lujo          : "Para un regalo verdaderamente exclusivo:",
  bienestar     : "Para transmitir calma y serenidad:",
  general       : "Te recomendamos estas flores populares:",
}

export const MENSAJES_CONTEXTUALES: Record<string, Record<string, string>> = {
  disculpa: {
    amistad: "Para pedir perdón a un amigo, te recomendamos:",
    pareja: "Para pedir perdón a tu pareja con sinceridad, te recomendamos:",
    familia: "Para reconciliarte con un familiar, te recomendamos:",
    trabajo: "Para disculparte en un contexto profesional, te recomendamos:",
  },
  luto: {
    amistad: "Para acompañar a un amigo en un momento difícil, te recomendamos:",
    familia: "Para acompañar a tu familia en el duelo, te recomendamos:",
    pareja: "Para acompañar a tu pareja en el duelo, te recomendamos:",
    trabajo: "Para expresar condolencias en el ámbito laboral, te recomendamos:",
  },
  agradecimiento: {
    trabajo: "Para agradecer en un contexto profesional, te recomendamos:",
    amistad: "Para agradecer a un amigo de corazón, te recomendamos:",
    familia: "Para agradecer a un familiar con cariño, te recomendamos:",
    pareja: "Para agradecer a tu pareja, te recomendamos:",
  },
  romance: {
    pareja: "Para expresar amor a tu pareja, te recomendamos:",
    amistad: "Para expresar tus sentimientos, te recomendamos:",
  },
  salud: {
    amistad: "Para desear pronta recuperación a un amigo, te recomendamos:",
    familia: "Para desear pronta recuperación a un familiar, te recomendamos:",
    pareja: "Para desear pronta recuperación a tu pareja, te recomendamos:",
  },
  cumpleanos: {
    amistad: "Para celebrar el cumpleaños de un amigo, te recomendamos:",
    familia: "Para celebrar el cumpleaños de un familiar, te recomendamos:",
    pareja: "Para celebrar el cumpleaños de tu pareja, te recomendamos:",
  },
  nacimiento: {
    familia: "Para celebrar la llegada del nuevo bebé en familia:",
    amistad: "Para celebrar el nacimiento del bebé de un amigo:",
  },
  aniversario: {
    pareja: "Para conmemorar un aniversario con tu pareja, te recomendamos:",
  },
}

// TS-specific: mapea cada intención a IDs en FLORES_ESTATICAS (api.ts).
// Derivado de recomendaciones.json vía FLORES_NOMBRE_A_ID en el script generador.
export const IDS_POR_INTENCION: Record<string, number[]> = {
  romance       : [1, 8, 12],
  amistad       : [2, 5, 10],
  disculpa      : [7, 3, 4],
  cumpleanos    : [2, 10, 1],
  aniversario   : [4, 6, 9],
  agradecimiento: [7, 9, 2],
  luto          : [4, 11, 9],
  graduacion    : [2, 10, 12],
  salud         : [11, 5, 2],
  nacimiento    : [5, 10, 7],
  dia_madres    : [12, 1, 4],
  decoracion    : [9, 11, 6],
  lujo          : [6, 12, 1],
  bienestar     : [11, 5, 2],
  general       : [1, 2, 6],
}
