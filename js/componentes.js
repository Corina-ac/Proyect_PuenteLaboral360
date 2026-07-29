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

    // Control de avisos repetidos: sin esto, una accion que se repite (recargar
    // una lista, reintentar una peticion) llena la pantalla con el mismo texto.
    const MS_ANTIDUPLICADO = 2000;   // ventana en la que un mensaje no se repite
    const MAXIMO_VISIBLES = 3;       // avisos simultaneos antes de cerrar el mas viejo

    const ultimoAviso = new Map();   // mensaje -> instante en que se mostro
    let visibles = [];               // instancias de Toastify aun en pantalla

    /**
     * Notificacion breve con Toastify.
     *
     * Se descarta el mensaje si es identico a uno mostrado hace menos de dos
     * segundos, y cuando ya hay tres en pantalla se cierra el mas antiguo, de
     * modo que los avisos nunca se acumulan unos sobre otros.
     */
    function toast(mensaje, tipo = 'exito') {
        if (typeof Toastify === 'undefined') {
            console.log(`[${tipo}] ${mensaje}`);
            return;
        }

        const ahora = Date.now();
        const clave = `${tipo}|${mensaje}`;

        // 1. Mismo aviso repetido en un intervalo corto: se ignora.
        const anterior = ultimoAviso.get(clave);
        if (anterior && ahora - anterior < MS_ANTIDUPLICADO) return;
        ultimoAviso.set(clave, ahora);

        // Se limpian las marcas viejas para que el mapa no crezca sin control.
        ultimoAviso.forEach((instante, k) => {
            if (ahora - instante > MS_ANTIDUPLICADO * 5) ultimoAviso.delete(k);
        });

        // 2. Se respeta el maximo de avisos simultaneos.
        while (visibles.length >= MAXIMO_VISIBLES) {
            const masViejo = visibles.shift();
            try { masViejo.hideToast(); } catch (error) { /* ya se habia cerrado */ }
        }

        const aviso = Toastify({
            text: mensaje,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            close: true,
            stopOnFocus: true,
            style: { background: COLORES_TOAST[tipo] || COLORES_TOAST.info, borderRadius: '8px' },
            callback: () => { visibles = visibles.filter(t => t !== aviso); }
        });

        visibles.push(aviso);
        aviso.showToast();
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

    /**
     * Sustituye un <canvas> sin datos por un aviso explicando que no hay nada
     * que representar todavia. Un lienzo en blanco parece un fallo de carga;
     * este estado deja claro que el grafico esta bien y solo falta informacion,
     * y ofrece la accion que permite generarla.
     *
     *   UI.graficoVacio('chart-progreso', 'Aun no tienes cursos en progreso',
     *                   { icono: '📚', accion: { texto: 'Ver catálogo', href: '...' } });
     */
    function graficoVacio(idCanvas, mensaje, opciones = {}) {
        const lienzo = document.getElementById(idCanvas);
        if (!lienzo) return;

        const { icono = '📊', accion = null, titulo = '' } = opciones;
        const contenedor = lienzo.parentElement;
        if (!contenedor) return;

        // Si ya se pinto el aviso, no se duplica al volver a renderizar.
        if (contenedor.querySelector('.grafico-vacio')) return;

        const enlace = accion
            ? `<a href="${accion.href}" class="btn btn-azul btn-xs">${escapar(accion.texto)}</a>`
            : '';

        lienzo.style.display = 'none';
        contenedor.insertAdjacentHTML('beforeend', `
            <section class="grafico-vacio" role="status">
                ${titulo ? `<p class="grafico-vacio-titulo">${escapar(titulo)}</p>` : ''}
                <p class="grafico-vacio-icono" aria-hidden="true">${icono}</p>
                <p class="grafico-vacio-texto">${escapar(mensaje)}</p>
                ${enlace}
            </section>`);
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
        return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(limpio)}&radius=50&backgroundColor=ffffff`;
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

    /* ---------------------------------------------- menu lateral por rol */
    /**
     * Menu de cada rol, definido en un unico lugar.
     *
     * Antes cada pagina llevaba su propia copia del menu escrita a mano, y las
     * copias acabaron diferenciandose entre si (distinto numero de opciones y
     * distintos nombres para la misma seccion). Al generarlo desde aqui, todas
     * las paginas de un rol muestran siempre lo mismo.
     *
     * Las rutas se guardan desde la raiz del proyecto; Datos.rutaBase() se
     * encarga de adaptarlas a la profundidad de cada pagina.
     */
    const MENUS = {
        estudiante: [
            { icono: '🏠', texto: 'Inicio', ruta: 'pages/dashboard-estudiante/dashboard-estudiante.html' },
            { icono: '📚', texto: 'Cursos', ruta: 'pages/cursos/cursos.html' },
            { icono: '👤', texto: 'Mi Perfil', ruta: 'pages/perfil/perfil.html' },
            { icono: '🔔', texto: 'Notificaciones', ruta: 'pages/notificaciones/notificaciones.html' }
        ],
        instructor: [
            { icono: '🏠', texto: 'Inicio', ruta: 'pages/dashboard-instructor/dashboard-instructor.html' },
            { icono: '📚', texto: 'Mis Cursos', ruta: 'pages/cursos/mis-cursos-instructor.html' },
            { icono: '👤', texto: 'Mi Perfil', ruta: 'pages/perfil/perfil.html' },
            { icono: '🔔', texto: 'Notificaciones', ruta: 'pages/notificaciones/notificaciones-instructor.html' }
        ],
        empresa: [
            { icono: '🏠', texto: 'Inicio', ruta: 'pages/dashboard-empresa/dashboard-empresa.html' },
            { icono: '🔍', texto: 'Buscar Talento', ruta: 'pages/buscar-talento/buscar-talento.html' },
            { icono: '📌', texto: 'Mis Vacantes', ruta: 'pages/mis-vacantes/mis-vacantes.html' },
            { icono: '🔔', texto: 'Notificaciones', ruta: 'pages/notificaciones/notificaciones-empresa.html' }
        ],
        admin: [
            { icono: '🏠', texto: 'Inicio', ruta: 'pages/admin/admin.html' },
            { icono: '📚', texto: 'Cursos', ruta: 'pages/cursos/cursos.html' },
            { icono: '🔍', texto: 'Buscar Talento', ruta: 'pages/buscar-talento/buscar-talento.html' },
            { icono: '🔔', texto: 'Notificaciones', ruta: 'pages/notificaciones/notificaciones-admin.html' }
        ]
    };

    /**
     * Dibuja el menu lateral del rol en sesion y marca como activa la opcion
     * que corresponde a la pagina abierta, comparando el nombre del archivo.
     */
    function pintarMenuLateral(usuario) {
        if (!usuario) return;
        const nav = document.querySelector('.sidebar nav');
        if (!nav) return;

        const base = Datos.rutaBase();
        const opciones = MENUS[usuario.rol] || MENUS.estudiante;
        const archivoActual = window.location.pathname.split('/').pop();

        const enlaces = opciones.map((op, indice) => {
            const archivo = op.ruta.split('/').pop();
            const esActual = archivo === archivoActual;
            const activo = esActual ? ' class="activo"' : '';
            const actual = esActual ? ' aria-current="page"' : '';
            // La primera opcion conserva el id "enlace-inicio": varias paginas
            // lo buscan despues de pintar el menu y sin el fallaria su script.
            const id = indice === 0 ? ' id="enlace-inicio"' : '';
            return `<a href="${base}${op.ruta}"${id}${activo}${actual}>` +
                   `<span class="icono" aria-hidden="true">${op.icono}</span> ${escapar(op.texto)}</a>`;
        }).join('\n                ');

        nav.innerHTML = enlaces +
            `\n                <a href="#" data-accion="cerrar-sesion">` +
            `<span class="icono" aria-hidden="true">🚪</span> Cerrar sesión</a>`;

        // El enlace de cierre se acaba de crear, asi que necesita su manejador.
        const salir = nav.querySelector('[data-accion="cerrar-sesion"]');
        if (salir) salir.addEventListener('click', async evento => {
            evento.preventDefault();
            if (!await confirmar('Cerrar sesion', '¿Deseas salir de tu cuenta?', 'Si, salir')) return;
            Auth.cerrarSesion();
            window.location.href = base + 'index.html';
        });
    }

    /** Rellena las tarjetas de perfil de las barras laterales de los paneles. */
    function pintarPerfilLateral(usuario) {
        if (!usuario) return;

        // El menu se dibuja junto al perfil: toda pagina con barra lateral ya
        // llama a esta funcion, de modo que ninguna se queda sin menu.
        pintarMenuLateral(usuario);
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

    /* -------------------------------------------------- certificado PDF */
    function descargarCertificadoPDF(usuario, curso, fecha) {
        if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
            toast('Libreria PDF no disponible. Intenta de nuevo.', 'error');
            return;
        }
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { toast('Libreria PDF no disponible.', 'error'); return; }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();

        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, w, h, 'F');

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, 15, w - 30, h - 30, 8, 8, 'F');

        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(1.5);
        doc.roundedRect(20, 20, w - 40, h - 40, 6, 6, 'S');

        doc.setFillColor(59, 130, 246);
        doc.rect(20, 20, w - 40, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(100, 116, 139);
        doc.text('PUENTELABORAL360', w / 2, 38, { align: 'center' });

        doc.setFontSize(28);
        doc.setTextColor(30, 41, 59);
        doc.text('CERTIFICADO DE COMPLETACION', w / 2, 52, { align: 'center' });

        doc.setDrawColor(59, 130, 246);
        doc.setLineWidth(0.5);
        doc.line(w / 2 - 60, 58, w / 2 + 60, 58);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(71, 85, 105);
        doc.text('Se certifica que', w / 2, 70, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(30, 64, 175);
        doc.text(`${usuario.nombres} ${usuario.apellidos}`, w / 2, 82, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(71, 85, 105);
        doc.text('ha completado satisfactoriamente el curso', w / 2, 94, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text(curso.nombre, w / 2, 106, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        const duracion = curso.duracionHoras ? `${curso.duracionHoras} horas` : '—';
        doc.text(`Duracion: ${duracion} | Calificacion: ${curso.calificacion || '—'}/10`, w / 2, 116, { align: 'center' });

        doc.setFontSize(11);
        doc.text(`Fecha de emision: ${fecha || new Date().toLocaleDateString('es-EC')}`, w / 2, 124, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('Certificado emitido por PuenteLaboral360 - Puente entre educacion y empleo', w / 2, h - 35, { align: 'center' });
        // El codigo se deriva del estudiante y del curso, no del azar: al volver a
        // descargar el mismo certificado se obtiene siempre el mismo codigo, que es
        // lo que permitiria verificarlo.
        const codigoVerificacion = Validaciones
            .hashSimple(`${usuario.id}-${curso.id}-${usuario.email}`)
            .replace('h', '')
            .toUpperCase()
            .padStart(8, '0');
        doc.text('Codigo de verificacion: PL360-' + codigoVerificacion, w / 2, h - 30, { align: 'center' });

        doc.save(`Certificado-${curso.nombre.replace(/\s+/g, '-')}.pdf`);
    }

    return {
        toast, alerta, error, confirmar, detalle,
        cargando, vacio, fallo, graficoVacio,
        escapar, precio, fecha,
        avatarDataUri, avatarMultiavatar, fotoUsuario, imagenConRespaldo,
        pintarBarraSesion, pintarPerfilLateral, pintarMenuLateral, MENUS, iniciar,
        descargarCertificadoPDF
    };
})();

document.addEventListener('DOMContentLoaded', () => UI.iniciar());
