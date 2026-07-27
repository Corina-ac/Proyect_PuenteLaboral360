/* ============================================================================
   storage.js — Acceso centralizado a localStorage
   Todas las claves del proyecto usan el prefijo pl360_ para no chocar con
   otros sitios servidos desde el mismo origen (por ejemplo GitHub Pages).
   ========================================================================== */

const Storage = (() => {
    const PREFIJO = 'pl360_';

    /**
     * Lee un valor y lo convierte desde JSON.
     * Si la clave no existe o el contenido esta corrupto devuelve el respaldo.
     */
    function leer(clave, respaldo = null) {
        try {
            const crudo = localStorage.getItem(PREFIJO + clave);
            if (crudo === null) return respaldo;
            return JSON.parse(crudo);
        } catch (error) {
            console.warn(`No se pudo leer "${clave}" de localStorage:`, error);
            return respaldo;
        }
    }

    /** Guarda un valor serializado como JSON. Devuelve true si lo logro. */
    function guardar(clave, valor) {
        try {
            localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
            return true;
        } catch (error) {
            // QuotaExceededError o modo privado del navegador.
            console.error(`No se pudo guardar "${clave}" en localStorage:`, error);
            return false;
        }
    }

    function eliminar(clave) {
        localStorage.removeItem(PREFIJO + clave);
    }

    function existe(clave) {
        return localStorage.getItem(PREFIJO + clave) !== null;
    }

    /** Borra unicamente las claves del proyecto, no las de otros sitios. */
    function limpiarTodo() {
        Object.keys(localStorage)
            .filter(clave => clave.startsWith(PREFIJO))
            .forEach(clave => localStorage.removeItem(clave));
    }

    /** Lista las claves del proyecto sin el prefijo (util para evidencias). */
    function claves() {
        return Object.keys(localStorage)
            .filter(clave => clave.startsWith(PREFIJO))
            .map(clave => clave.replace(PREFIJO, ''));
    }

    return { leer, guardar, eliminar, existe, limpiarTodo, claves, PREFIJO };
})();
