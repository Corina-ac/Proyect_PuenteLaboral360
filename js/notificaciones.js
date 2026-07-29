/* ============================================================================
   notificaciones.js — Centro de notificaciones por rol

   Carga las notificaciones desde json/notificaciones.json, las filtra por
   el rol del usuario en sesion y las renderiza en las secciones "Nuevas" y
   "Anteriores" de la pagina.
   ========================================================================== */

const Notificaciones = (() => {

    function usuario() {
        return Auth.usuarioActual();
    }

    /* ----------------------------------------------------------- carga */
    async function cargar() {
        const u = usuario();
        if (!u) return [];
        const todos = await Datos.obtener('notificaciones');
        return todos.filter(n => n.rol === u.rol);
    }

    /* -------------------------------------------------------- render */

    function renderizarItem(notif) {
        const estado = notif.leida ? 'leida' : 'nueva';
        const claseExtra = !notif.leida && notif.tipo ? ' ' + notif.tipo : '';

        return `
            <section class="notif-item ${estado}${claseExtra}">
                <div class="notif-icono">${notif.icono}</div>
                <div class="notif-contenido">
                    <div class="notif-titulo">${UI.escapar(notif.titulo)}</div>
                    <div class="notif-descripcion">${notif.descripcion}</div>
                    <div class="notif-fecha">${UI.fecha(notif.fecha)} · ${UI.escapar(notif.fuente)}</div>
                </div>
            </section>`;
    }

    function renderizar(notificaciones) {
        const nuevas = notificaciones.filter(n => !n.leida);
        const anteriores = notificaciones.filter(n => n.leida);

        document.querySelectorAll('.tarjeta').forEach(tarjeta => {
            const h2 = tarjeta.querySelector('h2');
            if (!h2) return;

            const texto = h2.textContent.trim().toLowerCase();

            if (texto === 'nuevas') {
                tarjeta.innerHTML = '<h2>Nuevas</h2>';
                if (nuevas.length === 0) {
                    tarjeta.insertAdjacentHTML('beforeend',
                        '<p class="texto-info">No tienes notificaciones nuevas.</p>');
                } else {
                    tarjeta.insertAdjacentHTML('beforeend',
                        nuevas.map(renderizarItem).join(''));
                }
            } else if (texto === 'anteriores') {
                tarjeta.innerHTML = '<h2>Anteriores</h2>';
                if (anteriores.length === 0) {
                    tarjeta.insertAdjacentHTML('beforeend',
                        '<p class="texto-info">No tienes notificaciones anteriores.</p>');
                } else {
                    tarjeta.insertAdjacentHTML('beforeend',
                        anteriores.map(renderizarItem).join(''));
                }
            }
        });
    }

    /* ---------------------------------------------------- marcar todo */
    function adjuntarBotonMarcarTodo() {
        const boton = document.querySelector('[data-accion="marcar-leido"]');
        if (!boton) return;

        boton.addEventListener('click', async (e) => {
            e.preventDefault();

            const u = usuario();
            if (!u) return;

            const todos = await Datos.obtener('notificaciones');
            const actualizados = todos.map(n =>
                n.rol === u.rol ? { ...n, leida: true } : n
            );

            Datos.guardar('notificaciones', actualizados);

            const notifsRol = actualizados.filter(n => n.rol === u.rol);
            renderizar(notifsRol);

            UI.toast('Todas las notificaciones marcadas como le\u00eddas.', 'exito');
        });
    }

    /* ----------------------------------------------------- inicializar */
    async function iniciar() {
        const u = usuario();
        if (!u) return;

        UI.pintarPerfilLateral(u);

        const notificaciones = await cargar();
        renderizar(notificaciones);
        adjuntarBotonMarcarTodo();
    }

    return { iniciar, cargar, renderizar };
})();

document.addEventListener('DOMContentLoaded', () => Notificaciones.iniciar());
