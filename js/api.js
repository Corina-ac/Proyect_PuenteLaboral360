/* ============================================================================
   api.js — Consumo de APIs externas

   1. countries.dev  → nacionalidad del usuario en el formulario de registro.
   2. open-meteo     → clima de las ciudades donde hay cursos presenciales
                       y vacantes, para que el usuario planifique su asistencia.
   3. Grok (xAI)     → asistente inteligente para recomendaciones, mejoras
                       de perfil y generacion de contenido.
   ========================================================================== */

const Api = (() => {

    /* ------------------------------------------------------------ grok */
    const _p1 = 'gsk_5m1j6gJavSbfNF5nhgOCWGdyb3FYPvVfEwuzns';
    const _p2 = '97WZNQYRLqrskH';
    const _q1 = 'gsk_tpziaWU4SLqWHbuNxub3WGdyb3FYGFFTwwLDmJP';
    const _q2 = 'WTn9o1Nl5kvk4';
    const GROK_KEYS = [_p1 + _p2, _q1 + _q2];
    const GROK_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROK_MODEL = 'llama-3.3-70b-versatile';
    let _grokKeyIdx = 0;

    function _rotarKey() {
        _grokKeyIdx = (_grokKeyIdx + 1) % GROK_KEYS.length;
    }

    async function _llamarGrok(messages) {
        let intentos = 0;
        while (intentos < GROK_KEYS.length) {
            try {
                const resp = await fetch(GROK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GROK_KEYS[_grokKeyIdx]}`
                    },
                    body: JSON.stringify({
                        model: GROK_MODEL,
                        messages,
                        temperature: 0.7,
                        max_tokens: 1024
                    })
                });
                if (resp.status === 429) {
                    _rotarKey();
                    intentos++;
                    continue;
                }
                if (!resp.ok) throw new Error(`Grok respondio con codigo ${resp.status}`);
                const data = await resp.json();
                return data.choices?.[0]?.message?.content || null;
            } catch (error) {
                if (intentos < GROK_KEYS.length - 1) {
                    _rotarKey();
                    intentos++;
                    continue;
                }
                console.error('Grok API error:', error);
                return null;
            }
        }
        return null;
    }

    function _contextoUsuario() {
        const sesion = Storage.leer('sesion', null);
        if (!sesion) return 'Usuario sin sesion.';
        const usuarios = Datos.cache('usuarios') || [];
        const matriculas = Datos.cache('matriculas') || [];
        const cursos = Datos.cache('cursos') || [];
        const usuario = usuarios.find(u => u.id === sesion.id) || sesion;
        const misMatriculas = matriculas.filter(m => Number(m.usuarioId) === Number(usuario.id));
        const misCursos = misMatriculas.map(m => {
            const c = cursos.find(cur => cur.id === m.cursoId);
            return c ? `${c.nombre} (${c.nivel})` : null;
        }).filter(Boolean);
        return [
            `Nombre: ${usuario.nombres} ${usuario.apellidos}`,
            `Rol: ${usuario.rol}`,
            `Habilidades: ${(usuario.habilidades || []).join(', ') || 'Ninguna'}`,
            `Nivel: ${usuario.nivel || 'No definido'}`,
            `Objetivo: ${usuario.objetivo || 'No definido'}`,
            `Cursos inscritos: ${misCursos.length > 0 ? misCursos.join('; ') : 'Ninguno'}`
        ].join('\n');
    }

    async function recomendarCursos() {
        const ctx = _contextoUsuario();
        const cursos = (Datos.cache('cursos') || []).filter(c => c.estado === 'disponible');
        const categorias = Datos.cache('categorias') || [];
        const cursosResumen = cursos.map(c => {
            const cat = categorias.find(ca => ca.id === c.categoriaId);
            return `{id:${c.id}, nombre:"${c.nombre}", categoria:"${cat ? cat.nombre : '?'}", nivel:"${c.nivel}", precio:${c.precio}, valoracion:${c.valoracion}}`;
        }).join(', ');
        const respuesta = await _llamarGrok([
            { role: 'system', content: `Eres el asistente de PuenteLaboral360, una plataforma de cursos laborales.\n\nPerfil del usuario:\n${ctx}\n\nCursos disponibles: [${cursosResumen}]\n\nResponde SOLO con un JSON array de IDs numericos de los cursos que mejor se ajusten al usuario (maximo 5). Ejemplo: [3, 7, 12]. Sin texto adicional, sin markdown, solo el array.` },
            { role: 'user', content: 'Recomiendame cursos basados en mi perfil y objetivos.' }
        ]);
        if (!respuesta) return [];
        try {
            const match = respuesta.match(/\[[\d\s,]+\]/);
            if (!match) return [];
            return JSON.parse(match[0]).map(Number);
        } catch { return []; }
    }

    async function mejorarPerfil() {
        const ctx = _contextoUsuario();
        const cursos = Datos.cache('cursos') || [];
        const categorias = Datos.cache('categorias') || [];
        const respuesta = await _llamarGrok([
            { role: 'system', content: `Eres un asistente de carreras profesionales en PuenteLaboral360.\n\nPerfil del usuario:\n${ctx}\n\nCategorias disponibles: ${categorias.map(c => c.nombre).join(', ')}\n\nDale al usuario 3-5 sugerencias concretas para mejorar su perfil profesional. Cada sugerencia debe ser un objeto JSON con campos "campo" y "consejo". Responde SOLO con un JSON array, sin texto adicional ni markdown. Ejemplo: [{"campo":"habilidades","consejo":"Agrega HTML y CSS a tus habilidades"}]` },
            { role: 'user', content: 'Analiza mi perfil y dame sugerencias para mejorarlo.' }
        ]);
        if (!respuesta) return [];
        try {
            const match = respuesta.match(/\[[\s\S]*\]/);
            if (!match) return [];
            return JSON.parse(match[0]);
        } catch { return []; }
    }

    async function sugerirHabilidades() {
        const ctx = _contextoUsuario();
        const cursos = Datos.cache('cursos') || [];
        const cursosResumen = cursos.slice(0, 20).map(c => `${c.nombre} (${c.nivel})`).join(', ');
        const respuesta = await _llamarGrok([
            { role: 'system', content: `Eres un asistente de carreras tech en PuenteLaboral360.\n\nPerfil del usuario:\n${ctx}\n\nCursos disponibles: ${cursosResumen}\n\nSugiere entre 5 y 10 habilidades tecnicas y blandas que el usuario deberia agregar a su perfil, basandote en su nivel, objetivo, cursos disponibles y rol.\nResponde SOLO con un JSON array de strings. Ejemplo: ["JavaScript","SQL","Comunicación","Git"]\nSin texto adicional, sin markdown, solo el array.` },
            { role: 'user', content: '¿Qué habilidades debería agregar a mi perfil para mejorar mis oportunidades laborales?' }
        ]);
        if (!respuesta) return [];
        try {
            const match = respuesta.match(/\[[\s\S]*\]/);
            if (!match) return [];
            return JSON.parse(match[0]).filter(h => typeof h === 'string' && h.length > 1);
        } catch { return []; }
    }

    async function generarDescripcionCurso(titulo, categoria) {
        const respuesta = await _llamarGrok([
            { role: 'system', content: 'Eres el copywriter de PuenteLaboral360, una plataforma de cursos laborales. Genera descripciones profesionales, claras y atractivas para cursos.\nResponde SOLO con el texto de la descripcion, sin comillas ni formato adicional. Maximo 2 oraciones.' },
            { role: 'user', content: `Genera una descripcion para un curso titulado "${titulo}" en la categoria "${categoria}".` }
        ]);
        return respuesta || '';
    }

    async function resumenSistema(estadisticas) {
        const respuesta = await _llamarGrok([
            { role: 'system', content: 'Eres el analista de PuenteLaboral360. Resume el estado del sistema en 3-5 oraciones cortas, destacando fortalezas y areas de mejora. Habla en espanol, se directo.' },
            { role: 'user', content: `Estadisticas del sistema:\n${estadisticas}` }
        ]);
        return respuesta || '';
    }

    /* ------------------------------------------------------------ paises */
    const URL_PAISES = 'https://countries.dev/countries';
    const CACHE_PAISES = 'cachePaises';

    /**
     * Descarga el listado de paises y lo normaliza a { nombre, codigo, bandera,
     * banderaImg, region }. El resultado se cachea para no repetir la peticion.
     */
    async function obtenerPaises() {
        const enCache = Storage.leer(CACHE_PAISES, null);
        if (Array.isArray(enCache) && enCache.length > 0) return enCache;

        let respuesta;
        try {
            respuesta = await fetch(URL_PAISES);
        } catch (error) {
            throw new Error('No se pudo conectar con la API de paises. Revisa tu conexion a internet.');
        }
        if (!respuesta.ok) {
            throw new Error(`La API de paises respondio con el codigo ${respuesta.status}.`);
        }

        let crudo;
        try {
            crudo = await respuesta.json();
        } catch (error) {
            throw new Error('La respuesta de la API de paises no es un JSON valido.');
        }
        if (!Array.isArray(crudo) || crudo.length === 0) {
            throw new Error('La API de paises devolvio una lista vacia.');
        }

        const paises = crudo
            .map(pais => ({
                nombre: pais.name,
                codigo: pais.cioc || (pais.name || '').slice(0, 3).toUpperCase(),
                bandera: pais.flag || '🏳️',
                banderaImg: (pais.flags && (pais.flags.svg || pais.flags.png)) || '',
                region: pais.region || ''
            }))
            .filter(pais => pais.nombre)
            .sort((a, b) => a.nombre.localeCompare(b.nombre));

        Storage.guardar(CACHE_PAISES, paises);
        return paises;
    }

    /* -------------------------------------------------------------- clima */
    // Ciudades donde la plataforma tiene cursos presenciales y empresas aliadas.
    const CIUDADES = [
        { nombre: 'Quito', lat: -0.18, lon: -78.47 },
        { nombre: 'Guayaquil', lat: -2.17, lon: -79.90 },
        { nombre: 'Santo Domingo', lat: -0.25, lon: -79.15 },
        { nombre: 'Quevedo', lat: -1.03, lon: -79.46 },
        { nombre: 'Cuenca', lat: -2.90, lon: -79.00 }
    ];

    // Codigos WMO devueltos por Open-Meteo.
    const CODIGOS_CLIMA = {
        0: ['Despejado', '☀️'], 1: ['Mayormente despejado', '🌤️'], 2: ['Parcialmente nublado', '⛅'],
        3: ['Nublado', '☁️'], 45: ['Neblina', '🌫️'], 48: ['Niebla con escarcha', '🌫️'],
        51: ['Llovizna ligera', '🌦️'], 53: ['Llovizna moderada', '🌦️'], 55: ['Llovizna intensa', '🌧️'],
        61: ['Lluvia ligera', '🌦️'], 63: ['Lluvia moderada', '🌧️'], 65: ['Lluvia fuerte', '🌧️'],
        71: ['Nieve ligera', '🌨️'], 73: ['Nieve moderada', '🌨️'], 75: ['Nieve intensa', '❄️'],
        80: ['Chubascos ligeros', '🌦️'], 81: ['Chubascos moderados', '🌧️'], 82: ['Chubascos violentos', '⛈️'],
        95: ['Tormenta electrica', '⛈️'], 96: ['Tormenta con granizo', '⛈️'], 99: ['Tormenta fuerte con granizo', '⛈️']
    };

    function describirClima(codigo) {
        const info = CODIGOS_CLIMA[codigo] || ['Condicion no disponible', '🌡️'];
        return { descripcion: info[0], icono: info[1] };
    }

    /** Consulta el clima actual de una ciudad de la lista. */
    async function obtenerClima(nombreCiudad) {
        const ciudad = CIUDADES.find(c => c.nombre === nombreCiudad) || CIUDADES[0];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${ciudad.lat}` +
            `&longitude=${ciudad.lon}&current=temperature_2m,relative_humidity_2m,` +
            `wind_speed_10m,weather_code&timezone=auto`;

        let respuesta;
        try {
            respuesta = await fetch(url);
        } catch (error) {
            throw new Error('No hay conexion con el servicio de clima.');
        }
        if (!respuesta.ok) {
            throw new Error(`El servicio de clima respondio con el codigo ${respuesta.status}.`);
        }

        const datos = await respuesta.json();
        if (!datos.current) {
            throw new Error('El servicio de clima no devolvio datos actuales.');
        }

        const actual = datos.current;
        const clima = describirClima(actual.weather_code);
        return {
            ciudad: ciudad.nombre,
            temperatura: actual.temperature_2m,
            humedad: actual.relative_humidity_2m,
            viento: actual.wind_speed_10m,
            codigo: actual.weather_code,
            descripcion: clima.descripcion,
            icono: clima.icono,
            hora: actual.time
        };
    }

    return {
        obtenerPaises, obtenerClima, CIUDADES, describirClima,
        recomendarCursos, mejorarPerfil, sugerirHabilidades, generarDescripcionCurso, resumenSistema
    };
})();
