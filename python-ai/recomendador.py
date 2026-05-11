#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Módulo de recomendación inteligente de flores - FlowerMatch

Uso: python recomendador.py "quiero flores para mi novia"
Salida: JSON con intención, contexto detectado y flores recomendadas
"""

import math
import os
import sys
import json
import unicodedata
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

try:
    import mysql.connector
    MYSQL_DISPONIBLE = True
except ImportError:
    MYSQL_DISPONIBLE = False

CONFIG_DB = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME",     "flowermatch"),
    "charset":  "utf8mb4",
}

# Cargados desde shared/recomendador/*.json
FRASES_PRIORITARIAS:   dict[str, list[str]]       = {}
PALABRAS_CLAVE:        dict[str, list[str]]        = {}
CONTEXTOS:             dict[str, list[str]]        = {}
MENSAJES:              dict[str, str]              = {}
MENSAJES_CONTEXTUALES: dict[str, dict[str, str]]  = {}
RECOMENDACIONES:       dict[str, list[str]]        = {}
_IDF:                  dict[str, float]            = {}

# Peso base por frase prioritaria (supera al ruido TF-IDF de palabras de
# contexto como "amigo" o "novia" que puntúan ≈ 2–8 pts).
_PESO_PRIORITARIO = 50.0


def normalizar(texto: str) -> str:
    texto = texto.lower()
    nfkd  = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _validar_estructura() -> None:
    """Valida tipos mínimos de los datos cargados desde shared/recomendador/.

    No valida semántica profunda; solo que los contenedores sean del tipo
    esperado para evitar errores confusos más adelante.
    """
    def _obj_de_listas(obj: object, nombre: str) -> None:
        if not isinstance(obj, dict):
            raise ValueError(
                f"shared/recomendador: {nombre} debe ser un objeto, "
                f"encontrado {type(obj).__name__}"
            )
        for k, v in obj.items():
            if not isinstance(v, list):
                raise ValueError(
                    f"shared/recomendador: {nombre}[{k!r}] debe ser una lista, "
                    f"encontrado {type(v).__name__}"
                )

    _obj_de_listas(FRASES_PRIORITARIAS, "intenciones.frases_prioritarias")
    _obj_de_listas(PALABRAS_CLAVE,      "intenciones.palabras_clave")
    _obj_de_listas(CONTEXTOS,           "contextos")
    _obj_de_listas(RECOMENDACIONES,     "recomendaciones")
    if not isinstance(MENSAJES, dict):
        raise ValueError(
            f"shared/recomendador: mensajes.genericos debe ser un objeto, "
            f"encontrado {type(MENSAJES).__name__}"
        )
    if not isinstance(MENSAJES_CONTEXTUALES, dict):
        raise ValueError(
            f"shared/recomendador: mensajes.contextuales debe ser un objeto, "
            f"encontrado {type(MENSAJES_CONTEXTUALES).__name__}"
        )


def _calcular_idf() -> dict[str, float]:
    """IDF por palabra clave: log(N / df) donde N = total de intenciones."""
    n = len(PALABRAS_CLAVE)
    df: dict[str, int] = {}
    for palabras in PALABRAS_CLAVE.values():
        for p in set(normalizar(p) for p in palabras):
            df[p] = df.get(p, 0) + 1
    return {p: math.log(n / d) for p, d in df.items()}


def _cargar_datos_compartidos() -> None:
    """Carga los datos del recomendador desde shared/recomendador/*.json.

    Lanza FileNotFoundError si algún archivo falta o RuntimeError si el JSON
    es inválido. No hay fallback silencioso: un fallo aquí indica una
    instalación rota y debe ser visible.
    """
    global FRASES_PRIORITARIAS, PALABRAS_CLAVE, CONTEXTOS, MENSAJES, MENSAJES_CONTEXTUALES, RECOMENDACIONES, _IDF
    base = Path(__file__).parent.parent / "shared" / "recomendador"
    requeridos = ["intenciones.json", "contextos.json", "mensajes.json", "recomendaciones.json"]
    faltantes  = [a for a in requeridos if not (base / a).exists()]
    if faltantes:
        raise FileNotFoundError(
            f"Datos del recomendador no encontrados en '{base}': {', '.join(faltantes)}"
        )
    try:
        with open(base / "intenciones.json", encoding="utf-8") as f:
            datos = json.load(f)
            FRASES_PRIORITARIAS = datos["frases_prioritarias"]
            PALABRAS_CLAVE      = datos["palabras_clave"]
        with open(base / "contextos.json", encoding="utf-8") as f:
            CONTEXTOS = json.load(f)
        with open(base / "mensajes.json", encoding="utf-8") as f:
            datos                 = json.load(f)
            MENSAJES              = datos["genericos"]
            MENSAJES_CONTEXTUALES = datos["contextuales"]
        with open(base / "recomendaciones.json", encoding="utf-8") as f:
            RECOMENDACIONES = json.load(f)
        _validar_estructura()
        _IDF = _calcular_idf()
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        raise RuntimeError(f"Error al parsear datos del recomendador: {e}") from e


_cargar_datos_compartidos()


def detectar_intencion(consulta: str) -> str:
    """
    Detecta la intención usando dos pasos:
    1. Frases prioritarias: multi-word markers inequívocos que reciben un
       bonus alto (_PESO_PRIORITARIO) para evitar que palabras de contexto
       como 'amigo' o 'novia' anulen señales emocionales fuertes.
    2. Scoring TF-IDF: palabras clave con bonus por longitud de frase.
    """
    consulta_norm = normalizar(consulta)
    if not consulta_norm.strip():
        return "general"

    puntajes: dict[str, float] = {k: 0.0 for k in PALABRAS_CLAVE}

    for intencion, frases in FRASES_PRIORITARIAS.items():
        for frase in sorted(frases, key=lambda f: len(f), reverse=True):
            frase_norm = normalizar(frase)
            if frase_norm in consulta_norm:
                n_palabras = len(frase_norm.split())
                puntajes[intencion] += _PESO_PRIORITARIO * n_palabras

    for intencion, palabras in PALABRAS_CLAVE.items():
        for p in palabras:
            p_norm = normalizar(p)
            tf = consulta_norm.count(p_norm)
            if tf > 0:
                idf    = _IDF.get(p_norm, 1.0)
                bonus  = len(p_norm.split())
                puntajes[intencion] += tf * idf * bonus

    max_puntaje = max(puntajes.values())
    if max_puntaje == 0:
        return "general"

    return max(puntajes, key=lambda k: puntajes[k])


def detectar_contexto(consulta: str) -> str | None:
    """
    Detecta el destinatario o relación mencionada en la consulta.
    Devuelve una de: 'amistad', 'pareja', 'familia', 'trabajo', o None.
    Todas las frases de todos los contextos se ordenan juntas por longitud
    descendente para que "companero de trabajo" (3 palabras) gane sobre
    "companero" (1 palabra) aunque estén en contextos distintos.
    """
    consulta_norm = normalizar(consulta)
    candidatos: list[tuple[str, str]] = [
        (frase, ctx)
        for ctx, frases in CONTEXTOS.items()
        for frase in frases
    ]
    candidatos.sort(key=lambda x: len(x[0].split()), reverse=True)
    for frase, ctx in candidatos:
        if normalizar(frase) in consulta_norm:
            return ctx
    return None


def construir_mensaje(intencion: str, contexto: str | None) -> str:
    """Mensaje contextual si existe la combinación; genérico si no."""
    if contexto and intencion in MENSAJES_CONTEXTUALES:
        mensaje_ctx = MENSAJES_CONTEXTUALES[intencion].get(contexto)
        if mensaje_ctx:
            return mensaje_ctx
    return MENSAJES.get(intencion, MENSAJES["general"])


def obtener_flores_bd(nombres: list[str]) -> list[dict] | None:
    """
    Consulta flores en MySQL por nombre.
    Devuelve:
      list[dict]  — flores encontradas (puede ser [] si la consulta no arrojó resultados)
      None        — MySQL no está disponible o la conexión falló
    """
    if not nombres:
        return []

    if not MYSQL_DISPONIBLE:
        sys.stderr.write("[recomendador] MySQL no disponible (mysql.connector no instalado)\n")
        return None

    try:
        conexion = mysql.connector.connect(**CONFIG_DB)
        cursor   = conexion.cursor(dictionary=True)

        placeholders = ", ".join(["%s"] * len(nombres))
        cursor.execute(
            f"SELECT * FROM flores WHERE nombre IN ({placeholders}) AND disponible = 1",
            nombres,
        )
        flores = cursor.fetchall()
        cursor.close()
        conexion.close()
        return flores
    except Exception as e:
        sys.stderr.write(f"[recomendador] MySQL error: {e}\n")
        return None


def recomendar(consulta: str) -> dict:
    if not consulta.strip():
        return {
            "intencion":         "desconocida",
            "contexto":          None,
            "flores":            [],
            "mensaje":           "Por favor describe la ocasión o sentimiento que deseas expresar.",
            "consulta_original": consulta,
        }

    intencion = detectar_intencion(consulta)
    contexto  = detectar_contexto(consulta)
    nombres   = RECOMENDACIONES.get(intencion, RECOMENDACIONES["general"])
    flores_bd = obtener_flores_bd(nombres)

    if flores_bd is None:
        return {
            "intencion":         intencion,
            "contexto":          contexto,
            "flores":            [],
            "mensaje":           construir_mensaje(intencion, contexto),
            "consulta_original": consulta,
            "modo":              "python-nlp",
            "degradado":         True,
        }

    return {
        "intencion":         intencion,
        "contexto":          contexto,
        "flores":            flores_bd,
        "mensaje":           construir_mensaje(intencion, contexto),
        "consulta_original": consulta,
        "modo":              "python-nlp",
    }


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # garantiza UTF-8 en Windows al ser invocado por PHP

    if len(sys.argv) < 2:
        print(json.dumps({"error": "Proporciona una consulta como argumento"}))
        sys.exit(1)

    consulta_usuario = " ".join(sys.argv[1:])
    resultado        = recomendar(consulta_usuario)
    print(json.dumps(resultado, ensure_ascii=False, default=str))
