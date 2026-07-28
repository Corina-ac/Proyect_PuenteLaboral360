/* ============================================================================
   componentes.js — Utilidades de interfaz compartidas por todas las paginas
   Envuelve SweetAlert2 y Toastify para no repetir configuracion.
   ========================================================================== */

const UI = (() => {

    /* ------------------------------------------------------ notificaciones */
    const COLORES_TOAST = {
        exito: 'linear-gradient(to right, #16a34a, #22c55e)',
        error: 'linear-gradient(to right, #b91c1c, #ef4444)',
        info: 'linear-gradient(to right, #1d4ed8, #3b82f6)',
        aviso: 'linear-gradient(to right, #b45309, #f59e0b)'
    };

    /** Notificacion breve con Toastify. */
    function toast(mensaje, tipo = 'exito') {
        if (typeof Toastify === 'undefined') {
            console.log(`[${tipo}] ${mensaje}`);
            return;
        }
        Toastify({
            text: mensaje,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            close: true,
            stopOnFocus: true,
            style: { background: COLORES_TOAST[tipo] || COLORES_TOAST.info, borderRadius: '8px' }
        }).showToast();
    }

    /* ------------------------------------------------------ alertas modales */
    function haySwal() {
        return typeof Swal !== 'undefined';
    }

    async function alerta(titulo, texto, icono = 'info') {
        if (!haySwal()) { window.alert(`${titulo}\n\n${texto}`); return; }
        return Swal.fire({ title: titulo, text: texto, icon: icono, confirmButtonColor: '#2563eb' });
    }

    async function error(titulo, texto) {
        return alerta(titulo, texto, 'error');
    }

    /** Confirmacion con SweetAlert2. Devuelve true si el usuario acepta. */
    async function confirmar(titulo, texto, textoBoton = 'Si, continuar') {
        if (!haySwal()) return window.confirm(`${titulo}\n\n${texto}`);
        const resultado = await Swal.fire({
            title: titulo,
            text: texto,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: textoBoton,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            reverseButtons: true
        });
        return resultado.isConfirmed;
    }

    /** Modal con contenido HTML libre (detalles de un registro). */
    async function detalle(titulo, html) {
        if (!haySwal()) { window.alert(titulo); return; }
        return Swal.fire({
            title: titulo,
            html,
            width: 640,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb'
        });
    }

    /* ----------------------------------------------------- estados de carga */
    /** Muestra un indicador de carga dentro de un contenedor. */
    function cargando(contenedor, mensaje = 'Cargando informacion...') {
        if (!contenedor) return;
        contenedor.innerHTML = `
            <section class="estado-carga" role="status" aria-live="polite">
                <span class="spinner" aria-hidden="true"></span>
                <p>${mensaje}</p>
            </section>`;
    }

    /** Mensaje cuando una busqueda o filtro no arroja resultados. */
    function vacio(contenedor, mensaje = 'No se encontraron resultados.', icono = '🔍') {
        if (!contenedor) return;
        contenedor.innerHTML = `
            <section class="estado-vacio">
                <p class="estado-icono" aria-hidden="true">${icono}</p>
                <p>${mensaje}</p>
            </section>`;
    }

    /** Mensaje de error de carga, con boton para reintentar. */
    function fallo(contenedor, mensaje, alReintentar) {
        if (!contenedor) return;
        contenedor.innerHTML = `
            <section class="estado-error" role="alert">
                <p class="estado-icono" aria-hidden="true">⚠️</p>
                <p>${mensaje}</p>
                <button type="button" class="btn btn-azul btn-reintentar">Reintentar</button>
            </section>`;
        const boton = contenedor.querySelector('.btn-reintentar');
        if (boton && alReintentar) boton.addEventListener('click', alReintentar);
    }

    /* ------------------------------------------------------------ formato */
    function escapar(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    function precio(valor) {
        return Number(valor) === 0 ? 'Gratis' : `$${Number(valor).toFixed(2)}`;
    }

    function fecha(iso) {
        if (!iso) return '—';
        const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function avatarMultiavatar(nombre) {
        if (!nombre) return null;
        const limpio = nombre.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!limpio) return null;
        return `https://api.multiavatar.com/${limpio}.svg`;
    }

    /** Avatar en SVG generado a partir de las iniciales del usuario. */
    function avatarDataUri(iniciales, color = '#2563eb') {
        const texto = (iniciales || '?').slice(0, 2).toUpperCase();
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
            <rect width="120" height="120" rx="60" fill="${color}"/>
            <text x="60" y="62" font-size="46" font-family="Segoe UI, Arial, sans-serif"
                  font-weight="700" fill="#ffffff" text-anchor="middle"
                  dominant-baseline="central">${texto}</text></svg>`;
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    }

    /** Imagen del usuario: la que subio, o multiavatar, o respaldo con iniciales. */
    function fotoUsuario(usuario) {
        if (!usuario) return avatarDataUri('?');
        if (usuario.avatar) return usuario.avatar;
        const iniciales = usuario.iniciales ||
            ((usuario.nombres || '?')[0] + (usuario.apellidos || '')[0] || '');
        const color = (Auth.ROLES[usuario.rol] || {}).color || '#2563eb';
        const respaldo = avatarDataUri(iniciales, color);
        const multiUrl = avatarMultiavatar(usuario.nombres + ' ' + (usuario.apellidos || ''));
        return multiUrl || respaldo;
    }

    /**
     * Coloca una imagen con respaldo: si el archivo no carga, se sustituye por
     * un marcador generado, de modo que nunca quede un icono roto.
     */
    function imagenConRespaldo(img, textoRespaldo, color = '#64748b') {
        if (!img) return;
        let intentado = false;
        img.addEventListener('error', () => {
            if (intentado) return;
            intentado = true;
            const iniciales = (textoRespaldo || '?').slice(0, 2).toUpperCase();
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
                <rect width="120" height="120" rx="60" fill="${color}"/>
                <text x="60" y="62" font-size="46" font-family="Segoe UI, Arial, sans-serif"
                      font-weight="700" fill="#ffffff" text-anchor="middle"
                      dominant-baseline="central">${iniciales}</text></svg>`;
            img.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
            img.classList.add('img-respaldo');
        }, { once: true });
    }

    /* -------------------------------------------------- barra de sesion */
    /**
     * Ajusta la barra de navegacion segun el estado de la sesion.
     * Sustituye los enlaces de "Iniciar sesion" / "Registrarse" por el nombre
     * del usuario y su boton de cierre de sesion.
     */
    function pintarBarraSesion() {
        const usuario = Auth.usuarioActual();
        const base = Datos.rutaBase();

        // Enlaces de cierre de sesion en cualquier pagina.
        document.querySelectorAll('[data-accion="cerrar-sesion"]').forEach(enlace => {
            enlace.addEventListener('click', async evento => {
                evento.preventDefault();
                const salir = await confirmar('Cerrar sesion',
                    '¿Deseas salir de tu cuenta?', 'Si, salir');
                if (!salir) return;
                Auth.cerrarSesion();
                toast('Sesion cerrada correctamente.', 'info');
                setTimeout(() => { window.location.href = base + 'index.html'; }, 600);
            });
        });

        const zona = document.querySelector('[data-zona="sesion"]');
        if (!zona) return;

        if (!usuario) {
            zona.innerHTML = `
                <a href="${base}pages/login/login.html"><i class="fa-solid fa-right-to-bracket"></i> Iniciar Sesión</a>
                <a href="${base}pages/registro/registro.html" class="btn-nav-registro"><i class="fa-solid fa-user-plus"></i> Registrarse</a>`;
            return;
        }

        const config = Auth.ROLES[usuario.rol] || Auth.ROLES.estudiante;
        const iniciales = usuario.iniciales ||
            ((usuario.nombres || '?')[0] + (usuario.apellidos || '')[0] || '');
        const color = (Auth.ROLES[usuario.rol] || {}).color || '#2563eb';
        zona.innerHTML = `
            <a href="${Auth.panelDe(usuario.rol)}" class="enlace-sesion">
                <img src="${fotoUsuario(usuario)}" alt="Foto de ${escapar(usuario.nombres)}" class="avatar-nav">
                <span>${escapar(usuario.nombres)} · ${config.icono} ${config.etiqueta}</span>
            </a>
            <a href="#" data-accion="cerrar-sesion" class="btn-nav-registro">
                <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión</a>`;

        const imgNav = zona.querySelector('.avatar-nav');
        if (imgNav) imagenConRespaldo(imgNav, iniciales, color);

        // El boton recien creado tambien necesita su manejador.
        zona.querySelector('[data-accion="cerrar-sesion"]').addEventListener('click', async evento => {
            evento.preventDefault();
            const salir = await confirmar('Cerrar sesion', '¿Deseas salir de tu cuenta?', 'Si, salir');
            if (!salir) return;
            Auth.cerrarSesion();
            toast('Sesion cerrada correctamente.', 'info');
            setTimeout(() => { window.location.href = base + 'index.html'; }, 600);
        });
    }

    /** Rellena las tarjetas de perfil de las barras laterales de los paneles. */
    function pintarPerfilLateral(usuario) {
        if (!usuario) return;
        const config = Auth.ROLES[usuario.rol] || Auth.ROLES.estudiante;
        const iniciales = usuario.iniciales ||
            ((usuario.nombres || '?')[0] + (usuario.apellidos || '')[0] || '');
        const color = (Auth.ROLES[usuario.rol] || {}).color || '#2563eb';

        document.querySelectorAll('[data-perfil="avatar"]').forEach(nodo => {
            if (nodo.tagName === 'IMG') {
                nodo.src = fotoUsuario(usuario);
                nodo.alt = `Foto de perfil de ${usuario.nombres}`;
                imagenConRespaldo(nodo, iniciales, color);
            } else {
                nodo.textContent = usuario.iniciales || usuario.nombres[0];
            }
        });
        document.querySelectorAll('[data-perfil="nombre"]').forEach(nodo => {
            nodo.textContent = `${usuario.nombres} ${usuario.apellidos}`;
        });
        document.querySelectorAll('[data-perfil="rol"]').forEach(nodo => {
            nodo.textContent = `${config.icono} ${config.etiqueta}`;
        });
        document.querySelectorAll('[data-perfil="email"]').forEach(nodo => {
            nodo.textContent = usuario.email;
        });
    }

    /** Muestra los avisos guardados por las redirecciones de seguridad. */
    function mostrarAvisosPendientes() {
        const aviso = Storage.leer('avisoAcceso', null);
        if (aviso) {
            Storage.eliminar('avisoAcceso');
            toast(aviso, 'aviso');
        }
    }

    /** Inicializacion comun a todas las paginas. */
    function iniciar() {
        pintarBarraSesion();
        mostrarAvisosPendientes();
    }

    return {
        toast, alerta, error, confirmar, detalle,
        cargando, vacio, fallo,
        escapar, precio, fecha,
        avatarDataUri, avatarMultiavatar, fotoUsuario, imagenConRespaldo,
        pintarBarraSesion, pintarPerfilLateral, iniciar
    };
})();

document.addEventListener('DOMContentLoaded', () => UI.iniciar());
