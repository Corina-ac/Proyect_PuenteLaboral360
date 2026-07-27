/* ============================================================================
   datos.js — Carga de los archivos JSON y operaciones sobre los datos

   Flujo de persistencia exigido por el proyecto:
     1. La primera ejecucion descarga los archivos de /json con fetch.
     2. Los datos se copian a localStorage.
     3. Las siguientes ejecuciones leen desde localStorage.
     4. Las altas, ediciones y bajas actualizan el arreglo y localStorage.
   ========================================================================== */

const Datos = (() => {

    // Cada coleccion corresponde a un archivo dentro de la carpeta /json.
    const COLECCIONES = {
        cursos: 'cursos.json',
        categorias: 'categorias.json',
        instructores: 'instructores.json',
        usuarios: 'usuarios.json',
        empresas: 'empresas.json',
        vacantes: 'vacantes.json',
        matriculas: 'matriculas.json',
        galeria: 'galeria.json'
    };

    /**
     * Devuelve el prefijo necesario para llegar a la raiz del proyecto.
     * index.html vive en la raiz; las demas paginas estan en /pages/<carpeta>/.
     */
    function rutaBase() {
        const ruta = window.location.pathname;
        const marca = ruta.indexOf('/pages/');
        if (marca === -1) return './';
        const resto = ruta.slice(marca + '/pages/'.length);
        return '../'.repeat(resto.split('/').length);
    }

    /** Convierte una ruta guardada en el JSON (relativa a la raiz) en una usable. */
    function recurso(rutaRelativa) {
        if (!rutaRelativa) return '';
        if (/^(https?:)?\/\//.test(rutaRelativa)) return rutaRelativa; // ya es absoluta
        return rutaBase() + rutaRelativa.replace(/^\.?\//, '');
    }

    /* ----------------------------------------------------------- descarga */
    /** Descarga un archivo JSON controlando el estado de la respuesta. */
    async function descargar(nombreArchivo) {
        const url = `${rutaBase()}json/${nombreArchivo}`;
        let respuesta;

        try {
            respuesta = await fetch(url);
        } catch (error) {
            // Sin conexion, o el archivo se abrio con file:// en lugar de un servidor.
            throw new Error(
                `No se pudo acceder a ${nombreArchivo}. Verifica tu conexion y que el ` +
                `proyecto se este ejecutando con Live Server o un servidor local.`
            );
        }

        if (!respuesta.ok) {
            throw new Error(`El archivo ${nombreArchivo} no se encontro (error ${respuesta.status}).`);
        }

        try {
            const datos = await respuesta.json();
            if (!Array.isArray(datos)) {
                throw new Error(`El archivo ${nombreArchivo} no contiene un arreglo de objetos.`);
            }
            return datos;
        } catch (error) {
            throw new Error(`El contenido de ${nombreArchivo} no es un JSON valido.`);
        }
    }

    /* ------------------------------------------------------------ lectura */
    /**
     * Obtiene una coleccion. Usa localStorage si ya existe; si no, la descarga
     * desde el archivo JSON y la guarda.
     */
    async function obtener(coleccion) {
        if (!COLECCIONES[coleccion]) {
            throw new Error(`La coleccion "${coleccion}" no existe.`);
        }

        const enCache = Storage.leer(coleccion, null);
        if (Array.isArray(enCache) && enCache.length > 0) return enCache;

        const datos = await descargar(COLECCIONES[coleccion]);
        Storage.guardar(coleccion, datos);
        return datos;
    }

    /** Carga varias colecciones a la vez. */
    async function obtenerVarias(...nombres) {
        const resultados = await Promise.all(nombres.map(obtener));
        const salida = {};
        nombres.forEach((nombre, i) => { salida[nombre] = resultados[i]; });
        return salida;
    }

    /** Version sincrona: solo sirve despues de que la coleccion ya se cargo. */
    function cache(coleccion) {
        return Storage.leer(coleccion, []);
    }

    function guardar(coleccion, datos) {
        return Storage.guardar(coleccion, datos);
    }

    /* --------------------------------------------------------------- CRUD */
    /** Calcula el siguiente id libre, evitando identificadores duplicados. */
    function siguienteId(coleccion) {
        const datos = cache(coleccion);
        if (datos.length === 0) return 1;
        return datos.reduce((mayor, item) => Math.max(mayor, Number(item.id) || 0), 0) + 1;
    }

    function buscarPorId(coleccion, id) {
        return cache(coleccion).find(item => Number(item.id) === Number(id)) || null;
    }

    /** Agrega un registro nuevo y devuelve el objeto creado con su id. */
    function agregar(coleccion, registro) {
        const datos = cache(coleccion);
        const nuevo = { ...registro, id: siguienteId(coleccion) };
        datos.push(nuevo);
        guardar(coleccion, datos);
        return nuevo;
    }

    /** Actualiza un registro existente. Devuelve el registro actualizado o null. */
    function actualizar(coleccion, id, cambios) {
        const datos = cache(coleccion);
        let actualizado = null;
        const nuevos = datos.map(item => {
            if (Number(item.id) !== Number(id)) return item;
            actualizado = { ...item, ...cambios, id: item.id };
            return actualizado;
        });
        if (!actualizado) return null;
        guardar(coleccion, nuevos);
        return actualizado;
    }

    /** Elimina un registro. Devuelve true si existia. */
    function eliminar(coleccion, id) {
        const datos = cache(coleccion);
        const restantes = datos.filter(item => Number(item.id) !== Number(id));
        if (restantes.length === datos.length) return false;
        guardar(coleccion, restantes);
        return true;
    }

    /* --------------------------------------------------------- relaciones */
    // Los archivos JSON no se llaman entre si: las relaciones se resuelven
    // aqui, buscando por identificador despues de cargar cada archivo.

    function categoriaDe(curso) {
        return cache('categorias').find(c => c.id === curso.categoriaId) || null;
    }

    function instructorDe(curso) {
        return cache('instructores').find(i => i.id === curso.instructorId) || null;
    }

    function empresaDe(vacante) {
        return cache('empresas').find(e => e.id === vacante.empresaId) || null;
    }

    /** Devuelve las matriculas de un usuario con el curso ya resuelto. */
    function matriculasDe(usuarioId) {
        const cursos = cache('cursos');
        return cache('matriculas')
            .filter(m => Number(m.usuarioId) === Number(usuarioId))
            .map(m => ({ ...m, curso: cursos.find(c => c.id === m.cursoId) || null }))
            .filter(m => m.curso !== null);
    }

    /** Cursos dictados por un instructor, a partir del id de usuario-instructor. */
    function cursosDeInstructor(instructorId) {
        return cache('cursos').filter(c => Number(c.instructorId) === Number(instructorId));
    }

    /* ----------------------------------------------------- restablecer */
    /**
     * Vuelve a descargar todos los archivos JSON y reemplaza lo almacenado.
     * La sesion activa se conserva.
     */
    async function restablecer() {
        const nombres = Object.keys(COLECCIONES);
        const descargas = await Promise.all(nombres.map(n => descargar(COLECCIONES[n])));
        nombres.forEach((nombre, i) => Storage.guardar(nombre, descargas[i]));
        return nombres.reduce((total, nombre, i) => total + descargas[i].length, 0);
    }

    /** Precarga todas las colecciones (usado por las paginas con panel de datos). */
    async function precargarTodo() {
        return obtenerVarias(...Object.keys(COLECCIONES));
    }

    return {
        COLECCIONES, rutaBase, recurso,
        obtener, obtenerVarias, cache, guardar, precargarTodo,
        siguienteId, buscarPorId, agregar, actualizar, eliminar,
        categoriaDe, instructorDe, empresaDe, matriculasDe, cursosDeInstructor,
        restablecer
    };
})();
