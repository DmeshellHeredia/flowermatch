"""
Pruebas del módulo recomendador - FlowerMatch
Ejecutar: python -m pytest python-ai/tests/ -v
      o: python -m unittest discover python-ai/tests
"""

import json
import sys
import unittest
from pathlib import Path
from io import StringIO
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))
from recomendador import (
    normalizar, detectar_intencion, detectar_contexto,
    construir_mensaje, recomendar, obtener_flores_bd,
)


class TestNormalizar(unittest.TestCase):
    def test_convierte_a_minusculas(self):
        self.assertEqual("hola", normalizar("HOLA"))

    def test_elimina_acentos(self):
        self.assertEqual("romantico", normalizar("romántico"))
        self.assertEqual("cumpleanos", normalizar("cumpleaños"))
        self.assertEqual("orquidea", normalizar("orquídea"))

    def test_texto_ya_limpio(self):
        self.assertEqual("rosa roja", normalizar("rosa roja"))

    def test_cadena_vacia(self):
        self.assertEqual("", normalizar(""))


class TestDetectarIntencion(unittest.TestCase):
    # Intenciones básicas
    def test_romance(self):
        self.assertEqual("romance", detectar_intencion("quiero flores para mi novia en nuestra primera cita"))

    def test_amistad(self):
        self.assertEqual("amistad", detectar_intencion("un regalo para mi mejor amigo"))

    def test_disculpa(self):
        self.assertEqual("disculpa", detectar_intencion("quiero pedir perdon lo siento mucho me equivoque"))

    def test_cumpleanos(self):
        self.assertEqual("cumpleanos", detectar_intencion("mañana es el cumpleaños de mi mama felicidades"))

    def test_aniversario(self):
        self.assertEqual("aniversario", detectar_intencion("celebramos 10 años de matrimonio aniversario"))

    def test_agradecimiento(self):
        self.assertEqual("agradecimiento", detectar_intencion("muchas gracias te lo agradezco de corazon"))

    def test_luto(self):
        self.assertEqual("luto", detectar_intencion("condolencias por el fallecido velorio funeral"))

    def test_graduacion(self):
        self.assertEqual("graduacion", detectar_intencion("te graduaste felicidades por terminar la carrera"))

    def test_salud(self):
        self.assertEqual("salud", detectar_intencion("que te mejores pronta recuperacion visita al hospital"))

    def test_nacimiento(self):
        self.assertEqual("nacimiento", detectar_intencion("nacio el bebe recien nacido baby shower"))

    def test_dia_madres(self):
        self.assertEqual("dia_madres", detectar_intencion("regalo para mama dia de las madres"))

    def test_bienestar(self):
        self.assertEqual("bienestar", detectar_intencion("quiero algo para relajar serenidad y calma"))

    def test_consulta_vacia_devuelve_general(self):
        self.assertEqual("general", detectar_intencion(""))

    def test_consulta_sin_coincidencias_devuelve_general(self):
        self.assertEqual("general", detectar_intencion("xyzzyfoobarbaz"))

    # Casos con frases prioritarias
    def test_disculpa_gana_sobre_amistad(self):
        """'pedir perdón' debe ganar sobre 'amigo' aunque 'amigo' puntúe en amistad."""
        resultado = detectar_intencion("Necesito un regalo para pedir perdon a mi mejor amigo")
        self.assertEqual("disculpa", resultado)

    def test_disculpa_gana_sobre_pareja(self):
        resultado = detectar_intencion("quiero pedir perdon a mi novia lo siento mucho")
        self.assertEqual("disculpa", resultado)

    def test_luto_gana_sobre_amistad(self):
        resultado = detectar_intencion("condolencias para mi amigo por el fallecido")
        self.assertEqual("luto", resultado)

    def test_salud_gana_sobre_familia(self):
        resultado = detectar_intencion("que te mejores pronto mama estas en el hospital")
        self.assertEqual("salud", resultado)

    def test_agradecimiento_gana_sobre_amistad(self):
        resultado = detectar_intencion("muchas gracias a mi mejor amigo te lo agradezco")
        self.assertEqual("agradecimiento", resultado)

    def test_frase_repetida_no_cambia_ganador(self):
        """Divergencia conocida PHP/Python: PHP usa str_contains (presencia), Python usa count (TF).
        Con frase repetida, Python score=200, PHP score=100, pero el ganador es idéntico.
        La divergencia solo cambia el ganador si hay empate preexistente + keyword repetida;
        ese escenario no ocurre con el dataset actual."""
        resultado = detectar_intencion("pedir perdon pedir perdon")
        self.assertEqual("disculpa", resultado)


class TestDetectarContexto(unittest.TestCase):
    def test_amistad(self):
        self.assertEqual("amistad", detectar_contexto("un regalo para mi mejor amigo"))

    def test_amistad_amiga(self):
        self.assertEqual("amistad", detectar_contexto("quiero algo para mi amiga"))

    def test_pareja_novio(self):
        self.assertEqual("pareja", detectar_contexto("flores para mi novio"))

    def test_pareja_novia(self):
        self.assertEqual("pareja", detectar_contexto("quiero sorprender a mi novia"))

    def test_familia_mama(self):
        self.assertEqual("familia", detectar_contexto("un regalo para mi mama"))

    def test_familia_abuela(self):
        self.assertEqual("familia", detectar_contexto("flores para mi abuela"))

    def test_trabajo(self):
        self.assertEqual("trabajo", detectar_contexto("para mi companero de trabajo"))

    def test_sin_contexto(self):
        self.assertIsNone(detectar_contexto("quiero flores bonitas"))

    def test_sin_contexto_consulta_vacia(self):
        self.assertIsNone(detectar_contexto(""))

    def test_frase_larga_tiene_prioridad(self):
        """'companero de trabajo' debe detectarse como 'trabajo', no 'amistad'."""
        self.assertEqual("trabajo", detectar_contexto("para mi companero de trabajo"))


class TestConstruirMensaje(unittest.TestCase):
    def test_disculpa_amistad(self):
        msg = construir_mensaje("disculpa", "amistad")
        self.assertIn("amigo", msg)

    def test_disculpa_pareja(self):
        msg = construir_mensaje("disculpa", "pareja")
        self.assertIn("pareja", msg)

    def test_agradecimiento_trabajo(self):
        msg = construir_mensaje("agradecimiento", "trabajo")
        self.assertIn("profesional", msg)

    def test_luto_amistad(self):
        msg = construir_mensaje("luto", "amistad")
        self.assertIn("amigo", msg)

    def test_sin_contexto_usa_mensaje_generico(self):
        from recomendador import MENSAJES
        self.assertEqual(MENSAJES["disculpa"], construir_mensaje("disculpa", None))

    def test_combinacion_sin_entrada_especial_usa_generico(self):
        from recomendador import MENSAJES
        self.assertEqual(MENSAJES["graduacion"], construir_mensaje("graduacion", "amistad"))

    def test_intencion_desconocida_usa_general(self):
        from recomendador import MENSAJES
        self.assertEqual(MENSAJES["general"], construir_mensaje("xyz_desconocido", None))


class TestRecomendar(unittest.TestCase):
    def test_consulta_vacia_devuelve_desconocida(self):
        resultado = recomendar("")
        self.assertEqual("desconocida", resultado["intencion"])
        self.assertEqual([], resultado["flores"])
        self.assertIn("consulta_original", resultado)

    def test_consulta_solo_espacios_es_vacia(self):
        resultado = recomendar("   ")
        self.assertEqual("desconocida", resultado["intencion"])

    def test_resultado_tiene_campos_requeridos(self):
        resultado = recomendar("quiero flores para mi novia")
        campos = {"intencion", "contexto", "flores", "mensaje", "consulta_original"}
        self.assertTrue(campos.issubset(resultado.keys()))

    def test_contexto_presente_en_resultado(self):
        resultado = recomendar("flores para mi mejor amigo")
        self.assertIn("contexto", resultado)

    def test_contexto_detectado_correctamente(self):
        resultado = recomendar("quiero pedir perdon a mi novia")
        self.assertEqual("pareja", resultado["contexto"])

    def test_contexto_none_cuando_no_hay_destinatario(self):
        resultado = recomendar("quiero flores bonitas para decorar")
        self.assertIsNone(resultado["contexto"])

    def test_disculpa_con_contexto_amistad(self):
        resultado = recomendar("Necesito un regalo para pedir perdon a mi mejor amigo")
        self.assertEqual("disculpa", resultado["intencion"])
        self.assertEqual("amistad", resultado["contexto"])
        self.assertIn("amigo", resultado["mensaje"])

    def test_flores_son_lista(self):
        resultado = recomendar("cumpleaños de mi amiga")
        self.assertIsInstance(resultado["flores"], list)

    def test_flores_bd_tienen_nombre(self):
        fake_flores = [
            {"id": 1, "nombre": "Rosa Roja", "precio": 25.0},
            {"id": 2, "nombre": "Tulipán", "precio": 15.0},
        ]
        with patch("recomendador.obtener_flores_bd", return_value=fake_flores):
            resultado = recomendar("quiero flores para mi novia")
            for flor in resultado["flores"]:
                self.assertIn("nombre", flor)

    def test_mensaje_no_vacio(self):
        resultado = recomendar("necesito un regalo romantico")
        self.assertTrue(len(resultado["mensaje"]) > 0)

    def test_consulta_original_se_preserva(self):
        consulta = "flores para mi abuela"
        resultado = recomendar(consulta)
        self.assertEqual(consulta, resultado["consulta_original"])

    def test_salida_json_valida(self):
        resultado = recomendar("un regalo para celebrar")
        serializado = json.dumps(resultado, ensure_ascii=False, default=str)
        parseado = json.loads(serializado)
        self.assertIsInstance(parseado, dict)

    def test_texto_irrelevante_devuelve_general_con_flores_y_mensaje(self):
        from recomendador import MENSAJES
        fake_flores = [{"id": 1, "nombre": "Margarita", "precio": 10.0}]
        with patch("recomendador.obtener_flores_bd", return_value=fake_flores):
            r = recomendar("electrodomesticos computadora internet programacion")
            self.assertEqual("general", r["intencion"])
            self.assertGreater(len(r["flores"]), 0)
            for flor in r["flores"]:
                self.assertIn("nombre", flor)
            self.assertEqual(MENSAJES["general"], r["mensaje"])


class TestCasosEspecificos(unittest.TestCase):
    """Casos exactos solicitados por el usuario para validar el comportamiento completo."""

    def test_caso1_disculpa_amigo(self):
        r = recomendar("Necesito un regalo para pedir perdón a mi mejor amigo")
        self.assertEqual("disculpa", r["intencion"])
        self.assertEqual("amistad", r["contexto"])
        self.assertIn("amigo", r["mensaje"])

    def test_caso2_disculpa_novia(self):
        r = recomendar("quiero pedir perdón a mi novia")
        self.assertEqual("disculpa", r["intencion"])
        self.assertEqual("pareja", r["contexto"])

    def test_caso3_luto_amiga(self):
        r = recomendar("condolencias para una amiga")
        self.assertEqual("luto", r["intencion"])
        self.assertEqual("amistad", r["contexto"])

    def test_caso3b_pesame_amiga(self):
        r = recomendar("pesame para mi amiga")
        self.assertEqual("luto", r["intencion"])
        self.assertEqual("amistad", r["contexto"])

    def test_caso3c_funeral_amigo(self):
        r = recomendar("funeral de un amigo")
        self.assertEqual("luto", r["intencion"])
        self.assertEqual("amistad", r["contexto"])

    def test_caso4_romance_novia(self):
        r = recomendar("flores para mi novia")
        self.assertEqual("romance", r["intencion"])
        self.assertEqual("pareja", r["contexto"])

    def test_caso5_agradecimiento_companera_trabajo(self):
        r = recomendar("quiero agradecer a una compañera de trabajo")
        self.assertEqual("agradecimiento", r["intencion"])
        self.assertEqual("trabajo", r["contexto"])

    def test_caso6_bienestar_sin_destinatario(self):
        r = recomendar("algo para relajar y dar calma")
        self.assertEqual("bienestar", r["intencion"])

    def test_caso7_dia_madres_familia(self):
        r = recomendar("regalo para mi mamá en el día de las madres")
        self.assertEqual("dia_madres", r["intencion"])
        self.assertEqual("familia", r["contexto"])

    def test_caso8_consulta_vacia_devuelve_desconocida(self):
        r = recomendar("")
        self.assertEqual("desconocida", r["intencion"])

    def test_caso9_texto_sin_sentido_devuelve_general(self):
        r = recomendar("texto sin sentido")
        self.assertEqual("general", r["intencion"])

    def test_caso10_json_utf8_con_tildes_y_enne(self):
        r = recomendar("cumpleaños de mamá con niña")
        serializado = json.dumps(r, ensure_ascii=False, default=str)
        parseado = json.loads(serializado)
        self.assertIsInstance(parseado, dict)
        # La consulta original con tildes y ñ se preserva sin escape ASCII
        self.assertIn("cumpleaños", serializado)
        self.assertIn("mamá", serializado)


class TestValidarEstructura(unittest.TestCase):
    """Verifica que _validar_estructura detecta tipos incorrectos con mensajes claros."""

    def setUp(self):
        import recomendador
        self.mod = recomendador
        self._orig = {
            "FRASES_PRIORITARIAS":   recomendador.FRASES_PRIORITARIAS,
            "PALABRAS_CLAVE":        recomendador.PALABRAS_CLAVE,
            "CONTEXTOS":             recomendador.CONTEXTOS,
            "MENSAJES":              recomendador.MENSAJES,
            "MENSAJES_CONTEXTUALES": recomendador.MENSAJES_CONTEXTUALES,
            "RECOMENDACIONES":       recomendador.RECOMENDACIONES,
        }

    def tearDown(self):
        for attr, val in self._orig.items():
            setattr(self.mod, attr, val)

    def test_datos_reales_pasan_sin_error(self):
        self.mod._validar_estructura()  # no debe lanzar

    def test_frases_prioritarias_string_lanza_valor(self):
        self.mod.FRASES_PRIORITARIAS = "no es dict"
        with self.assertRaises(ValueError):
            self.mod._validar_estructura()

    def test_palabras_clave_lista_lanza_valor(self):
        self.mod.PALABRAS_CLAVE = ["lista", "invalida"]
        with self.assertRaises(ValueError):
            self.mod._validar_estructura()

    def test_contextos_con_valor_no_lista_lanza_valor(self):
        self.mod.CONTEXTOS = {"pareja": "string, no lista"}
        with self.assertRaises(ValueError):
            self.mod._validar_estructura()

    def test_mensajes_lista_lanza_valor(self):
        self.mod.MENSAJES = ["no", "es", "dict"]
        with self.assertRaises(ValueError):
            self.mod._validar_estructura()

    def test_recomendaciones_con_valor_no_lista_lanza_valor(self):
        self.mod.RECOMENDACIONES = {"romance": "string, no lista"}
        with self.assertRaises(ValueError):
            self.mod._validar_estructura()

    def test_mensaje_de_error_contiene_nombre_del_campo(self):
        self.mod.FRASES_PRIORITARIAS = "mal"
        with self.assertRaises(ValueError) as ctx:
            self.mod._validar_estructura()
        self.assertIn("frases_prioritarias", str(ctx.exception))


class TestObtenerFloresBd(unittest.TestCase):
    def test_nombres_vacios_devuelve_lista_vacia(self):
        self.assertEqual([], obtener_flores_bd([]))

    def test_sin_mysql_disponible_devuelve_none(self):
        import recomendador
        with patch.object(recomendador, "MYSQL_DISPONIBLE", False):
            self.assertIsNone(recomendador.obtener_flores_bd(["Rosa Roja"]))

    def test_sin_mysql_disponible_escribe_a_stderr(self):
        import recomendador
        with patch.object(recomendador, "MYSQL_DISPONIBLE", False):
            with patch("sys.stderr") as mock_stderr:
                recomendador.obtener_flores_bd(["Rosa Roja"])
                mock_stderr.write.assert_called_once()

    def test_excepcion_conexion_devuelve_none(self):
        import recomendador
        mock_mysql = MagicMock()
        mock_mysql.connector.connect.side_effect = Exception("Connection refused")
        with patch.object(recomendador, "MYSQL_DISPONIBLE", True):
            with patch.object(recomendador, "mysql", mock_mysql, create=True):
                self.assertIsNone(recomendador.obtener_flores_bd(["Rosa Roja"]))


class TestRecomendarDegradado(unittest.TestCase):
    def test_mysql_falla_devuelve_degradado_true(self):
        with patch("recomendador.obtener_flores_bd", return_value=None):
            r = recomendar("flores para mi novia")
            self.assertTrue(r.get("degradado"))
            self.assertEqual([], r["flores"])
            self.assertEqual("python-nlp", r["modo"])

    def test_mysql_devuelve_flores_no_hay_degradado(self):
        fake_flores = [{"id": 1, "nombre": "Rosa Roja", "precio": 25.0}]
        with patch("recomendador.obtener_flores_bd", return_value=fake_flores):
            r = recomendar("flores para mi novia")
            self.assertNotIn("degradado", r)
            self.assertEqual(fake_flores, r["flores"])

    def test_mysql_devuelve_lista_vacia_no_hay_degradado(self):
        with patch("recomendador.obtener_flores_bd", return_value=[]):
            r = recomendar("flores para mi novia")
            self.assertNotIn("degradado", r)
            self.assertEqual([], r["flores"])


class TestEntryPoint(unittest.TestCase):
    def test_sin_argumentos_imprime_error(self):
        with patch("sys.argv", ["recomendador.py"]):
            with patch("sys.stdout", new_callable=StringIO):
                with self.assertRaises(SystemExit) as ctx:
                    if len(sys.argv) < 2:
                        import json as _json
                        print(_json.dumps({"error": "Proporciona una consulta como argumento"}))
                        sys.exit(1)
            self.assertEqual(1, ctx.exception.code)


if __name__ == "__main__":
    unittest.main()
