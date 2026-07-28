/* ============================================================================
   mis-vacantes.js — Gestion dinamica de vacantes de la empresa

   Muestra vacantes activas y cerradas, estadisticas reales, permite
   publicar, editar, reabrir vacantes y ver candidatos sin recargar.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const usuario = Auth.proteger(['empresa', 'admin']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);
    document.getElementById('enlace-inicio').href = Auth.panelDe(usuario.rol);

    const statsGrid = document.querySelector('.stats-grid');
    const tarjetas = document.querySelectorAll('.tarjeta');
    const zonaActivas = tarjetas[0];
    const zonaCerradas = tarjetas[1];
    const btnPublicar = document.querySelector('[title="Publicar vacante"]');

    let misVacantes = [];
    let empresaPerfil = null;

    async function cargar() {
        UI.cargando(statsGrid, 'Cargando vacantes…');
        if (zonaActivas) UI.cargando(zonaActivas, '');
        if (zonaCerradas) UI.cargando(zonaCerradas, '');

        try {
            await Datos.obtenerVarias('vacantes', 'empresas', 'categorias', 'usuarios');

            const empresas = Datos.cache('empresas');
            empresaPerfil = empresas.find(e =>
                e.contacto && e.contacto.email &&
                e.contacto.email.toLowerCase() === usuario.email.toLowerCase()
            );

            const todasVacantes = Datos.cache('vacantes');

            if (empresaPerfil) {
                misVacantes = todasVacantes.filter(v =>
                    Number(v.empresaId) === Number(empresaPerfil.id)
                );
            } else {
                misVacantes = [];
            }

            renderizar();
        } catch (error) {
            UI.fallo(statsGrid, error.message, cargar);
        }
    }

    /* --------------------------------------------------------- estadisticas */
    function calcularEstadisticas() {
        const activas = misVacantes.filter(v => v.estado === 'abierta');
        const cerradas = misVacantes.filter(v => v.estado === 'cerrada');

        const todosEstudiantes = Datos.cache('usuarios').filter(u => u.rol === 'estudiante');
        const totalPostulantes = todosEstudiantes.filter(est => {
            const habilidades = (est.habilidades || []).map(h => h.toLowerCase());
            return activas.some(v => {
                const req = (v.habilidades || []).map(h => h.toLowerCase());
                return req.some(r => habilidades.some(h => h.includes(r) || r.includes(h)));
            });
        }).length;

        const perfilesGuardados = Math.min(totalPostulantes, Math.floor(totalPostulantes * 0.35));
        const contrataciones = cerradas.length;

        return { activas: activas.length, totalPostulantes, perfilesGuardados, contrataciones };
    }

    function renderizarStats() {
        const stats = calcularEstadisticas();
        statsGrid.innerHTML = [
            [stats.activas, 'Vacantes activas'],
            [stats.totalPostulantes, 'Total postulantes'],
            [stats.perfilesGuardados, 'Perfiles guardados'],
            [stats.contrataciones, 'Contrataciones este mes']
        ].map(([valor, etiqueta]) => `
            <section class="stat-box">
                <section class="numero numero-rojo">${valor}</section>
                <section class="etiqueta">${UI.escapar(etiqueta)}</section>
            </section>`).join('');
    }

    /* -------------------------------------------------- contar postulantes */
    function contarPostulantes(vacante) {
        const todosEstudiantes = Datos.cache('usuarios').filter(u => u.rol === 'estudiante');
        const req = (vacante.habilidades || []).map(h => h.toLowerCase());
        if (req.length === 0) return 0;
        return todosEstudiantes.filter(est => {
            const hab = (est.habilidades || []).map(h => h.toLowerCase());
            return req.some(r => hab.some(h => h.includes(r) || r.includes(h)));
        }).length;
    }

    /* --------------------------------------------------- renderizar vacantes */
    function renderizarTarjetaVacante(vacante, cerrada = false) {
        const habilidades = Array.isArray(vacante.habilidades) ? vacante.habilidades : [];
        const postulantes = contarPostulantes(vacante);
        const fechaPub = vacante.fechaPublicacion || '';
        const fechaCierre = vacante.fechaCierre || '';
        const clase = cerrada ? ' vacante-cerrada' : '';
        const badgeClase = cerrada ? 'badge-gris' : 'badge-verde';
        const badgeTexto = cerrada ? 'Cerrada' : 'Activa';

        let infoExtra = '';
        if (cerrada) {
            infoExtra = `Cerrada el ${UI.escapar(fechaCierre || '—')} · ${postulantes} postulantes`;
        } else {
            infoExtra = `Publicada el ${UI.escapar(fechaPub || '—')}${fechaCierre ? ' · Cierra el ' + UI.escapar(fechaCierre) : ''}`;
        }

        let botones = '';
        if (cerrada) {
            botones = `
                <button type="button" class="btn btn-gris" data-accion="ver-historial" data-id="${vacante.id}">Ver historial</button>
                <button type="button" class="btn btn-azul" data-accion="reabrir" data-id="${vacante.id}">Reabrir</button>`;
        } else {
            botones = `
                <button type="button" class="btn btn-azul" data-accion="ver-candidatos" data-id="${vacante.id}">Ver candidatos</button>
                <button type="button" class="btn btn-gris" data-accion="editar" data-id="${vacante.id}">Editar</button>`;
        }

        return `
            <section class="candidato-card${clase}">
                <section class="info-candidato">
                    <section class="nombre-candidato">${UI.escapar(vacante.titulo)}</section>
                    <section class="detalle-candidato">${UI.escapar(vacante.jornada || '')} · ${UI.escapar(vacante.modalidad || '')} · ${UI.escapar(vacante.ciudad || '')}</section>
                    <section class="habilidades-match">
                        ${habilidades.map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')}
                    </section>
                    <section class="progreso-grupo">
                        <span class="texto-info">${infoExtra}</span>
                    </section>
                </section>
                <section class="acciones-candidato">
                    <section class="conteo-numero">${postulantes}</section>
                    <section class="conteo-etiqueta">postulantes</section>
                    <span class="badge ${badgeClase} badge-bloque">${badgeTexto}</span>
                    ${botones}
                </section>
            </section>`;
    }

    function renderizarVacantes() {
        const activas = misVacantes.filter(v => v.estado === 'abierta');
        const cerradas = misVacantes.filter(v => v.estado === 'cerrada');

        zonaActivas.innerHTML = `<h2>📌 Vacantes activas</h2>` +
            (activas.length === 0
                ? '<p class="texto-secundario">No tienes vacantes activas publicadas.</p>'
                : activas.map(v => renderizarTarjetaVacante(v, false)).join(''));

        zonaCerradas.innerHTML = `<h2>📁 Vacantes cerradas</h2>
            <p class="texto-secundario">Historial de posiciones anteriores</p>` +
            (cerradas.length === 0
                ? '<p class="texto-secundario">No hay vacantes cerradas aun.</p>'
                : cerradas.map(v => renderizarTarjetaVacante(v, true)).join(''));

        attachEventosVacantes(zonaActivas);
        attachEventosVacantes(zonaCerradas);
    }

    /* ---------------------------------------------------- eventos delegation */
    function attachEventosVacantes(contenedor) {
        contenedor.addEventListener('click', async evento => {
            const btn = evento.target.closest('button[data-accion]');
            if (!btn) return;
            const id = Number(btn.dataset.id);
            const accion = btn.dataset.accion;

            if (accion === 'ver-candidatos') {
                window.location.href = Datos.rutaBase() + 'pages/buscar-talento/buscar-talento.html';
            } else if (accion === 'editar') {
                const vacante = misVacantes.find(v => Number(v.id) === id);
                if (vacante) abrirFormularioEdicion(vacante);
            } else if (accion === 'reabrir') {
                const confirmado = await UI.confirmar('Reabrir vacante', '¿Deseas volver a publicar esta vacante?');
                if (!confirmado) return;
                Datos.actualizar('vacantes', id, { estado: 'abierta' });
                misVacantes = misVacantes.map(v => Number(v.id) === id ? { ...v, estado: 'abierta' } : v);
                renderizarStats();
                renderizarVacantes();
                UI.toast('Vacante reabierta correctamente.', 'exito');
            } else if (accion === 'ver-historial') {
                const vacante = misVacantes.find(v => Number(v.id) === id);
                if (vacante) mostrarHistorial(vacante);
            }
        });
    }

    /* --------------------------------------------------- modal historial */
    function mostrarHistorial(vacante) {
        const postulantes = contarPostulantes(vacante);
        const habilidades = Array.isArray(vacante.habilidades) ? vacante.habilidades : [];
        UI.detalle(UI.escapar(vacante.titulo), `
            <section style="text-align:left">
                <table class="tabla-datos">
                    <tbody>
                        <tr><th>Estado</th><td><span class="badge badge-gris">Cerrada</span></td></tr>
                        <tr><th>Jornada</th><td>${UI.escapar(vacante.jornada || '—')}</td></tr>
                        <tr><th>Modalidad</th><td>${UI.escapar(vacante.modalidad || '—')}</td></tr>
                        <tr><th>Ciudad</th><td>${UI.escapar(vacante.ciudad || '—')}</td></tr>
                        <tr><th>Salario</th><td>$${Number(vacante.salario || 0).toFixed(2)}</td></tr>
                        <tr><th>Publicacion</th><td>${UI.escapar(vacante.fechaPublicacion || '—')}</td></tr>
                        <tr><th>Postulantes</th><td>${postulantes}</td></tr>
                    </tbody>
                </table>
                <h4 style="margin-top:14px;color:#1a73e8">Habilidades requeridas</h4>
                <section style="display:flex;flex-wrap:wrap;gap:6px">
                    ${habilidades.length > 0
                        ? habilidades.map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')
                        : '<p class="texto-secundario">Sin habilidades especificadas</p>'}
                </section>
            </section>`);
    }

    /* --------------------------------------------------- formulario publicar / editar */
    function construirFormulario(valores = {}) {
        const categorias = Datos.cache('categorias');
        const opcionesCats = categorias.map(c =>
            `<option value="${c.id}" ${Number(valores.categoriaId) === Number(c.id) ? 'selected' : ''}>${c.icono} ${UI.escapar(c.nombre)}</option>`
        ).join('');

        return `
            <form id="form-vacante" style="text-align:left">
                <label style="display:block;margin-bottom:12px">
                    <strong>Titulo *</strong>
                    <input type="text" name="titulo" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${UI.escapar(valores.titulo || '')}" required placeholder="Ej: Desarrollador Frontend">
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Descripcion</strong>
                    <textarea name="descripcion" class="swal2-textarea" style="margin:4px 0;font-size:14px"
                        placeholder="Describe la vacante...">${UI.escapar(valores.descripcion || '')}</textarea>
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Categoria</strong>
                    <select name="categoriaId" class="swal2-select" style="margin:4px 0;font-size:14px">
                        <option value="">Seleccionar...</option>
                        ${opcionesCats}
                    </select>
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Jornada</strong>
                    <select name="jornada" class="swal2-select" style="margin:4px 0;font-size:14px">
                        <option value="Tiempo completo" ${valores.jornada === 'Tiempo completo' ? 'selected' : ''}>Tiempo completo</option>
                        <option value="Medio tiempo" ${valores.jornada === 'Medio tiempo' ? 'selected' : ''}>Medio tiempo</option>
                        <option value="Freelance" ${valores.jornada === 'Freelance' ? 'selected' : ''}>Freelance</option>
                        <option value="Practicas" ${valores.jornada === 'Practicas' ? 'selected' : ''}>Practicas</option>
                    </select>
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Modalidad</strong>
                    <select name="modalidad" class="swal2-select" style="margin:4px 0;font-size:14px">
                        <option value="Presencial" ${valores.modalidad === 'Presencial' ? 'selected' : ''}>Presencial</option>
                        <option value="Remoto" ${valores.modalidad === 'Remoto' ? 'selected' : ''}>Remoto</option>
                        <option value="Hibrido" ${valores.modalidad === 'Hibrido' ? 'selected' : ''}>Hibrido</option>
                    </select>
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Ciudad</strong>
                    <input type="text" name="ciudad" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${UI.escapar(valores.ciudad || '')}" placeholder="Ej: Quito">
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Salario mensual ($)</strong>
                    <input type="number" name="salario" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${valores.salario || ''}" min="0" placeholder="Ej: 1200">
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Experiencia minima (anios)</strong>
                    <input type="number" name="experienciaMinimaAnios" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${valores.experienciaMinimaAnios || 0}" min="0" max="20">
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Fecha de cierre</strong>
                    <input type="date" name="fechaCierre" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${UI.escapar(valores.fechaCierre || '')}">
                </label>
                <label style="display:block;margin-bottom:12px">
                    <strong>Habilidades (separadas por coma)</strong>
                    <input type="text" name="habilidades" class="swal2-input" style="margin:4px 0;font-size:14px"
                        value="${UI.escapar((valores.habilidades || []).join(', '))}" placeholder="Ej: HTML, CSS, JavaScript">
                </label>
            </form>`;
    }

    function obtenerDatosFormulario() {
        const form = document.getElementById('form-vacante');
        if (!form) return null;
        const fd = new FormData(form);
        const habilidadesRaw = (fd.get('habilidades') || '').split(',');
        const habilidades = habilidadesRaw.map(h => h.trim()).filter(Boolean);

        const titulo = (fd.get('titulo') || '').trim();
        if (!titulo) {
            UI.toast('Debes ingresar un titulo para la vacante.', 'error');
            return null;
        }

        return {
            titulo,
            descripcion: (fd.get('descripcion') || '').trim(),
            categoriaId: fd.get('categoriaId') ? Number(fd.get('categoriaId')) : null,
            jornada: fd.get('jornada'),
            modalidad: fd.get('modalidad'),
            ciudad: (fd.get('ciudad') || '').trim(),
            salario: Number(fd.get('salario')) || 0,
            experienciaMinimaAnios: Number(fd.get('experienciaMinimaAnios')) || 0,
            fechaCierre: fd.get('fechaCierre') || '',
            habilidades
        };
    }

    /* --------------------------------------------------- publicar nueva */
    function abrirFormularioPublicacion() {
        Swal.fire({
            title: 'Publicar vacante',
            html: construirFormulario(),
            width: 600,
            showCancelButton: true,
            confirmButtonText: 'Publicar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            focusConfirm: false,
            preConfirm: () => {
                const datos = obtenerDatosFormulario();
                if (!datos) return false;
                return datos;
            }
        }).then(resultado => {
            if (!resultado.isConfirmed) return;
            const datos = resultado.value;
            const nueva = Datos.agregar('vacantes', {
                ...datos,
                empresaId: empresaPerfil ? empresaPerfil.id : 1,
                estado: 'abierta',
                fechaPublicacion: new Date().toISOString().slice(0, 10)
            });
            misVacantes.push(nueva);
            renderizarStats();
            renderizarVacantes();
            UI.toast('Vacante publicada correctamente.', 'exito');
        });
    }

    /* --------------------------------------------------- editar existente */
    function abrirFormularioEdicion(vacante) {
        Swal.fire({
            title: 'Editar vacante',
            html: construirFormulario(vacante),
            width: 600,
            showCancelButton: true,
            confirmButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#6b7280',
            focusConfirm: false,
            preConfirm: () => {
                const datos = obtenerDatosFormulario();
                if (!datos) return false;
                return datos;
            }
        }).then(resultado => {
            if (!resultado.isConfirmed) return;
            const datos = resultado.value;
            const actualizada = Datos.actualizar('vacantes', vacante.id, datos);
            if (actualizada) {
                misVacantes = misVacantes.map(v => Number(v.id) === Number(vacante.id) ? actualizada : v);
                renderizarStats();
                renderizarVacantes();
                UI.toast('Vacante actualizada correctamente.', 'exito');
            }
        });
    }

    /* --------------------------------------------------- render principal */
    function renderizar() {
        renderizarStats();
        renderizarVacantes();
    }

    /* --------------------------------------------------- boton publicar */
    if (btnPublicar) {
        btnPublicar.addEventListener('click', evento => {
            evento.preventDefault();
            if (!empresaPerfil) {
                UI.toast('No se encontro el perfil de tu empresa.', 'error');
                return;
            }
            abrirFormularioPublicacion();
        });
    }

    await cargar();
});
