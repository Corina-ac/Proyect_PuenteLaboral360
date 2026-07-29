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
    // Las claves NO se escriben aqui. Se leen de js/config.js, un archivo
    // ignorado por git (ver .gitignore) que cada quien crea a partir de
    // js/config.example.js. Si no existe, las funciones de IA se desactivan
    // solas y el resto de la aplicacion sigue funcionando con normalidad.
    const GROK_KEYS = (typeof CONFIG !== 'undefined' && Array.isArray(CONFIG.GROK_KEYS))
        ? CONFIG.GROK_KEYS.filter(k => k && !k.startsWith('tu-api-key'))
        : [];
    const GROK_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const GROK_MODEL = 'llama-3.3-70b-versatile';
    let _grokKeyIdx = 0;

    /** Indica si la IA esta configurada; las paginas la usan para ocultar botones. */
    function hayIA() {
        return GROK_KEYS.length > 0;
    }

    function _rotarKey() {
        _grokKeyIdx = (_grokKeyIdx + 1) % GROK_KEYS.length;
    }

    async function _llamarGrok(messages) {
        // Sin claves configuradas no se intenta la peticion.
        if (GROK_KEYS.length === 0) {
            console.info('IA no configurada: copia js/config.example.js como js/config.js.');
            return null;
        }

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

    /**
     * Analiza la empleabilidad del usuario contra las vacantes reales del
     * sistema: cuantas cubre hoy, que habilidades le faltan para las demas y
     * que cursos del catalogo se las darian.
     *
     * A diferencia de rellenar campos del perfil, aqui la IA aporta algo que
     * el usuario no puede saber por si mismo: el cruce entre lo que tiene y lo
     * que el mercado de la plataforma esta pidiendo.
     */
    async function analizarEmpleabilidad() {
        const sesion = Storage.leer('sesion', null);
        if (!sesion) return null;

        const usuarios = Datos.cache('usuarios') || [];
        const usuario = usuarios.find(u => u.id === sesion.id) || sesion;
        const habilidades = (usuario.habilidades || []).map(h => h.toLowerCase());

        const vacantes = (Datos.cache('vacantes') || []).filter(v => v.estado === 'abierta');
        const cursos = (Datos.cache('cursos') || []).filter(c => c.estado === 'disponible');
        const empresas = Datos.cache('empresas') || [];

        if (vacantes.length === 0) return null;

        // El cruce se calcula aqui, con datos reales, y no se le pide al
        // modelo: asi las cifras que se muestran son siempre exactas.
        const analizadas = vacantes.map(v => {
            const requeridas = (v.habilidades || []);
            const cubiertas = requeridas.filter(r =>
                habilidades.some(h => h.includes(r.toLowerCase()) || r.toLowerCase().includes(h)));
            const faltantes = requeridas.filter(r => !cubiertas.includes(r));
            const empresa = empresas.find(e => e.id === v.empresaId);
            return {
                titulo: v.titulo,
                empresa: empresa ? empresa.nombre : 'Empresa',
                salario: v.salario,
                ciudad: v.ciudad,
                porcentaje: requeridas.length
                    ? Math.round((cubiertas.length / requeridas.length) * 100)
                    : 0,
                faltantes
            };
        }).sort((a, b) => b.porcentaje - a.porcentaje);

        const califican = analizadas.filter(v => v.porcentaje >= 70);

        // Habilidades que mas se repiten entre las que le faltan.
        const conteo = {};
        analizadas.forEach(v => v.faltantes.forEach(f => {
            conteo[f] = (conteo[f] || 0) + 1;
        }));
        const brechas = Object.entries(conteo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([nombre, veces]) => {
                // Curso del catalogo que cubre esa habilidad.
                const curso = cursos.find(c =>
                    `${c.nombre} ${c.descripcion || ''}`.toLowerCase().includes(nombre.toLowerCase()));
                return { habilidad: nombre, vacantes: veces, curso: curso ? curso.nombre : null };
            });

        const salarios = analizadas.filter(v => v.salario).map(v => v.salario);
        const resumen = {
            totalVacantes: analizadas.length,
            califican: califican.length,
            mejores: analizadas.slice(0, 3),
            brechas,
            salarioMedio: salarios.length
                ? Math.round(salarios.reduce((a, b) => a + b, 0) / salarios.length)
                : 0
        };

        // La IA solo redacta la lectura del resultado, no inventa las cifras.
        const consejo = await _llamarGrok([
            {
                role: 'system',
                content: 'Eres un orientador laboral de PuenteLaboral360. Recibes el analisis ya calculado ' +
                    'del perfil de un estudiante frente a las vacantes abiertas. Redacta en espanol una lectura ' +
                    'breve y concreta en 2 o 3 oraciones: donde esta hoy y cual seria su siguiente paso. ' +
                    'No inventes cifras ni repitas los numeros literalmente. Tono directo y alentador, sin exagerar.'
            },
            {
                role: 'user',
                content: `Perfil: ${usuario.nombres}, nivel ${usuario.nivel || 'sin definir'}, ` +
                    `habilidades: ${(usuario.habilidades || []).join(', ') || 'ninguna'}.\n` +
                    `Califica para ${resumen.califican} de ${resumen.totalVacantes} vacantes abiertas.\n` +
                    `Habilidades que mas le faltan: ${brechas.map(b => b.habilidad).join(', ') || 'ninguna'}.`
            }
        ]);

        resumen.consejo = consejo;
        return resumen;
    }

    async function sugerirTrabajos() {
        const ctx = _contextoUsuario();
        const respuesta = await _llamarGrok([
            { role: 'system', content: `Eres un asistente de empleos en PuenteLaboral360. Analiza el perfil del usuario y sugiere 3-5 empleos que se ajusten a su perfil, nivel, habilidades y cursos completados.\n\nPerfil del usuario:\n${ctx}\n\nResponde SOLO con un JSON array de objetos con campos "cargo", "empresa", "descripcion" (por que le sirve al usuario), y "habilidadesRequeridas" (array de strings). Sin texto adicional, sin markdown.` },
            { role: 'user', content: 'Sugereme empleos que se ajusten a mi perfil, nivel y habilidades.' }
        ]);
        if (!respuesta) return [];
        try {
            const match = respuesta.match(/\[[\s\S]*\]/);
            if (!match) return [];
            return JSON.parse(match[0]);
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
    const CACHE_PAISES = 'cachePaises_v2';

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
            .map(pais => {
                // Se usa alpha2Code: es el codigo ISO de DOS letras (EC, CO, MX)
                // que necesitan tanto flagcdn.com como el listado de ciudades.
                // Esta API no expone el campo cca2, y cioc trae tres letras
                // (ECU, COL), que ninguno de los dos usos acepta.
                const codigo = (pais.alpha2Code || '').toLowerCase();
                return {
                    nombre: pais.name,
                    codigo: codigo,
                    codigo3: (pais.alpha3Code || pais.cioc || '').toLowerCase(),
                    bandera: pais.flag || '🏳️',
                    banderaImg: (pais.flags && (pais.flags.svg || pais.flags.png)) || '',
                    banderaSmall: codigo ? `https://flagcdn.com/24x18/${codigo}.png` : '',
                    region: pais.region || ''
                };
            })
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

    /* ------------------------------------------------------------ ciudades */
    const CIUDADES_POR_PAIS = {
        'EC': ['Quito', 'Guayaquil', 'Cuenca', 'Santo Domingo', 'Machala', 'Manta', 'Portoviejo', 'Ambato', 'Riobamba', 'Loja', 'Ibarra', 'Quevedo', 'Esmeraldas', 'Latacunga', 'Ambato'],
        'CO': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Pasto', 'Manizales', 'Villavicencio', 'Neiva', 'Armenia'],
        'MX': ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Ciudad Juárez', 'Zapopan', 'Mérida', 'San Luis Potosí', 'Querétaro', 'Aguascalientes', 'Morelia', 'Cancún', 'Veracruz'],
        'PE': ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Cusco', 'Piura', 'Iquitos', 'Huancayo', 'Chimbote', 'Pucallpa', 'Tacna', 'Ica', 'Cajamarca', 'Sullana', 'Ayacucho'],
        'AR': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Corrientes', 'Neuquén', 'Posadas', 'Bahía Blanca'],
        'CL': ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Iquique', 'Osorno', 'Puerto Montt', 'Arica', 'Chillán', 'Calama', 'Punta Arenas', 'Copiapó'],
        'ES': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón'],
        'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Miami', 'Seattle', 'Denver', 'Boston', 'Atlanta']
    };

    /**
     * Devuelve las ciudades principales de un pais a partir de su codigo ISO
     * de dos letras (EC, CO, MX...). Para los paises de la region se usa el
     * listado propio; para el resto se devuelve un arreglo vacio y el
     * formulario deja escribir la ciudad a mano.
     */
    async function obtenerCiudades(codigoPais) {
        if (!codigoPais) return [];
        return CIUDADES_POR_PAIS[codigoPais.toUpperCase()] || [];
    }

    async function reportarCurso(nombreCurso, razon, detalle) {
        const respuesta = await _llamarGrok([
            { role: 'system', content: `Eres un asistente de soporte de PuenteLaboral360. Un estudiante reporto un problema con un curso.\n\nCurso: ${nombreCurso}\nRazon del reporte: ${razon}\nDetalle: ${detalle}\n\nGenera una respuesta profesional confirmando la recepcion del reporte, explicando que sera revisado por el equipo en 48 horas, y brindando un numero de seguimiento ficticio pero realista. Responde en 3-4 oraciones, en espanol, tono amable y profesional.` },
            { role: 'user', content: `Reporte del curso "${nombreCurso}": ${razon}. ${detalle}` }
        ]);
        return respuesta || 'Hemos recibido tu reporte y sera revisado por nuestro equipo.';
    }

    return {
        obtenerPaises, obtenerClima, CIUDADES, describirClima,
        hayIA,
        recomendarCursos, mejorarPerfil, sugerirHabilidades, sugerirTrabajos,
        analizarEmpleabilidad, generarDescripcionCurso, resumenSistema,
        obtenerCiudades, reportarCurso
    };
})();
