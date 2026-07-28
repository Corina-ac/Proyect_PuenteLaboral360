/* ============================================================================
   mis-cursos-instructor.js — Panel de cursos del instructor

   Muestra las estadisticas, cursos activos y solicitudes de certificacion
   pendientes del instructor actual, con CRUD completo via SweetAlert2.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const usuario = Auth.proteger(['instructor', 'admin']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);
    const enlaceInicio = document.getElementById('enlace-inicio');
    if (enlaceInicio) enlaceInicio.href = Auth.panelDe(usuario.rol);

    /* --------------------------------------------------- elementos DOM */
    const statsGrid = document.querySelector('.stats-grid');
    const botonCrear = document.querySelector('.encabezado-seccion .btn-accion');

    function buscarTarjetaPorTitulo(texto) {
        return [...document.querySelectorAll('.tarjeta')].find(t => {
            const h2 = t.querySelector('h2');
            return h2 && h2.textContent.includes(texto);
        });
    }

    const tarjetaCursos = buscarTarjetaPorTitulo('Cursos activos');
    const tarjetaSolicitudes = buscarTarjetaPorTitulo('Solicitudes');

    /* -------------------------------------------------------- estado */
    let cursos = [];
    let categorias = [];
    let instructores = [];
    let usuarios = [];
    let matriculas = [];
    let perfilInstructor = null;

    /* ------------------------------------------------ carga inicial */
    async function cargar() {
        UI.cargando(statsGrid, 'Cargando tus cursos…');
        try {
            const datos = await Datos.obtenerVarias(
                'cursos', 'matriculas', 'categorias', 'instructores', 'usuarios'
            );
            cursos = datos.cursos;
            matriculas = datos.matriculas;
            categorias = datos.categorias;
            instructores = datos.instructores;
            usuarios = datos.usuarios;

            perfilInstructor = buscarPerfilInstructor(usuario);
            if (!perfilInstructor) {
                UI.fallo(statsGrid, 'No se encontro tu perfil de instructor.', cargar);
                if (tarjetaCursos) UI.vacio(tarjetaCursos, 'No hay cursos disponibles.', '📚');
                if (tarjetaSolicitudes) UI.vacio(tarjetaSolicitudes, 'No hay solicitudes pendientes.', '✅');
                return;
            }

            const misCursos = filtrarCursos();
            const misMatriculas = filtrarMatriculas(misCursos);

            pintarEstadisticas(misCursos, misMatriculas);
            pintarCursos(misCursos, misMatriculas);
            pintarSolicitudes(misCursos, misMatriculas);
            UI.toast(`${misCursos.length} cursos cargados.`, 'exito');
        } catch (error) {
            UI.fallo(statsGrid, error.message, cargar);
            UI.toast('No se pudieron cargar los datos.', 'error');
        }
    }

    /* ---------------------------------------------------- helpers */
    function buscarPerfilInstructor(usuarioLogueado) {
        return instructores.find(i =>
            i.email && usuarioLogueado.email &&
            i.email.toLowerCase() === usuarioLogueado.email.toLowerCase()
        ) || null;
    }

    function filtrarCursos() {
        return cursos.filter(c =>
            Number(c.instructorId) === Number(perfilInstructor.id)
        );
    }

    function filtrarMatriculas(misCursos) {
        return matriculas.filter(m =>
            misCursos.some(c => Number(c.id) === Number(m.cursoId))
        );
    }

    function claseProgreso(porcentaje) {
        if (porcentaje >= 50) return 'progress-verde';
        if (porcentaje >= 25) return 'progress-azul';
        return 'progress-amarillo';
    }

    function claseBadge(estado) {
        if (estado === 'disponible') return 'badge-verde';
        if (estado === 'agotado') return 'badge-amarillo';
        return 'badge-gris';
    }

    function labelEstado(estado) {
        if (estado === 'disponible') return 'Activo';
        if (estado === 'agotado') return 'Agotado';
        return 'Borrador';
    }

    /* --------------------------------------------- estadisticas */
    function pintarEstadisticas(misCursos, misMatriculas) {
        const totalCursos = misCursos.length;
        const totalInscritos = misMatriculas.length;
        const totalCertificados = misMatriculas.filter(m => m.certificadoEmitido).length;
        const tasa = totalInscritos > 0
            ? Math.round((totalCertificados / totalInscritos) * 100)
            : 0;

        statsGrid.innerHTML = [
            [totalCursos, 'Cursos publicados'],
            [totalInscritos, 'Total inscritos'],
            [totalCertificados, 'Certificados emitidos'],
            [tasa + '%', 'Tasa de certificación']
        ].map(([valor, etiqueta]) => `
            <section class="stat-box">
                <section class="numero numero-verde">${valor}</section>
                <section class="etiqueta">${etiqueta}</section>
            </section>`).join('');
    }

    /* --------------------------------------------- cursos activos */
    function pintarCursos(misCursos, misMatriculas) {
        if (!tarjetaCursos) return;

        if (misCursos.length === 0) {
            tarjetaCursos.innerHTML = '<h2> Cursos activos</h2>';
            UI.vacio(tarjetaCursos, 'Aun no tienes cursos publicados.', '📚');
            return;
        }

        const tarjetasHtml = misCursos.map(curso => {
            const cat = Datos.categoriaDe(curso);
            const mats = misMatriculas.filter(m => Number(m.cursoId) === Number(curso.id));
            const inscritos = mats.length;
            const certs = mats.filter(m => m.certificadoEmitido).length;
            const tasa = inscritos > 0 ? Math.round((certs / inscritos) * 100) : 0;

            return `
                <section class="solicitud-card" data-curso-id="${curso.id}">
                    <section class="info-sol">
                        <section class="nombre-sol">${UI.escapar(curso.nombre)}</section>
                        <section class="detalle-sol">${UI.escapar(curso.descripcion)}</section>
                        <section class="badges-grupo">
                            <span class="badge ${claseBadge(curso.estado)}">${labelEstado(curso.estado)}</span>
                            <span class="badge badge-azul">${inscritos} inscritos</span>
                            <span class="badge badge-gris">${certs} certificados</span>
                            ${cat ? `<span class="badge badge-gris">${cat.icono} ${UI.escapar(cat.nombre)}</span>` : ''}
                        </section>
                        <section class="progreso-grupo">
                            <progress title="${tasa}%" value="${tasa}" max="100" class="${claseProgreso(tasa)}"></progress>
                            <p class="texto-progreso">Tasa de certificación: ${tasa}%</p>
                        </section>
                    </section>
                    <section class="acciones-sol">
                        <button type="button" class="btn btn-azul btn-xs" data-accion="detalle">Ver detalles</button>
                        <button type="button" class="btn btn-gris btn-xs" data-accion="editar">Editar</button>
                    </section>
                </section>`;
        }).join('');

        tarjetaCursos.innerHTML = `<h2> Cursos activos</h2>${tarjetasHtml}`;
    }

    /* -------------------------------- solicitudes certificacion */
    function pintarSolicitudes(misCursos, misMatriculas) {
        if (!tarjetaSolicitudes) return;

        const pendientes = misMatriculas.filter(m =>
            m.progreso >= 90 && !m.certificadoEmitido
        );

        if (pendientes.length === 0) {
            tarjetaSolicitudes.innerHTML = `
                <h2> Solicitudes de certificación pendientes</h2>
                <p class="texto-secundario">Estudiantes que solicitaron revisión para obtener su certificado</p>`;
            UI.vacio(tarjetaSolicitudes, 'No hay solicitudes de certificación pendientes.', '✅');
            return;
        }

        const tarjetasHtml = pendientes.map(m => {
            const estudiante = usuarios.find(u => Number(u.id) === Number(m.usuarioId));
            const curso = misCursos.find(c => Number(c.id) === Number(m.cursoId));
            const nombre = estudiante
                ? `${estudiante.nombres} ${estudiante.apellidos}`
                : 'Estudiante';
            const nombreCurso = curso ? curso.nombre : 'Curso';

            return `
                <section class="solicitud-card" data-matricula-id="${m.id}">
                    <section class="info-sol">
                        <section class="nombre-sol">${UI.escapar(nombre)}</section>
                        <section class="detalle-sol">Solicita certificación en: ${UI.escapar(nombreCurso)}</section>
                        <section class="solicitud-progreso">
                            <progress title="${m.progreso}%" value="${m.progreso}" max="100" class="${claseProgreso(m.progreso)}"></progress>
                            <p class="texto-progreso">Progreso: ${m.progreso}%</p>
                        </section>
                    </section>
                    <section class="acciones-sol">
                        <button type="button" class="btn btn-verde btn-xs" data-accion="aprobar">Aprobar</button>
                        <button type="button" class="btn btn-gris btn-xs" data-accion="revisar">Revisar</button>
                    </section>
                </section>`;
        }).join('');

        tarjetaSolicitudes.innerHTML = `
            <h2> Solicitudes de certificación pendientes</h2>
            <p class="texto-secundario">Estudiantes que solicitaron revisión para obtener su certificado</p>
            ${tarjetasHtml}`;
    }

    /* ---------------------------------------------------- formularios */
    function construirFormularioInline(curso = null) {
        const esEdicion = curso !== null;
        const opcionesCategoria = categorias.map(c =>
            `<option value="${c.id}" ${curso && curso.categoriaId === c.id ? 'selected' : ''}>${c.icono} ${UI.escapar(c.nombre)}</option>`
        ).join('');
        const opcionesNivel = ['Basico', 'Intermedio', 'Avanzado'].map(n =>
            `<option value="${n}" ${curso && curso.nivel === n ? 'selected' : ''}>${n}</option>`
        ).join('');

        return `
        <section class="tarjeta" id="formulario-curso-inline" style="border:2px solid #2563eb;margin-bottom:20px">
            <h2>${esEdicion ? '✏️ Editar curso' : '➕ Crear nuevo curso'}</h2>
            <form id="form-curso-instructor" style="display:flex;flex-direction:column;gap:14px;margin-top:12px">
                <section class="campo">
                    <label for="f-nombre"><strong>Nombre del curso *</strong></label>
                    <input type="text" id="f-nombre" value="${curso ? UI.escapar(curso.nombre) : ''}"
                           placeholder="Ej: JavaScript Avanzado" required minlength="5"
                           style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
                </section>
                <section class="campo">
                    <label for="f-descripcion"><strong>Descripcion *</strong></label>
                    <textarea id="f-descripcion" rows="3" placeholder="Describe el curso..."
                              required minlength="10"
                              style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical">${curso ? UI.escapar(curso.descripcion) : ''}</textarea>
                </section>
                <section style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                    <section class="campo">
                        <label for="f-categoria"><strong>Categoria</strong></label>
                        <select id="f-categoria" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">${opcionesCategoria}</select>
                    </section>
                    <section class="campo">
                        <label for="f-nivel"><strong>Nivel</strong></label>
                        <select id="f-nivel" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">${opcionesNivel}</select>
                    </section>
                </section>
                <section style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                    <section class="campo">
                        <label for="f-precio"><strong>Precio (USD, 0 = gratis)</strong></label>
                        <input type="number" id="f-precio" min="0" max="5000"
                               value="${curso ? curso.precio : 0}"
                               style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
                    </section>
                    <section class="campo">
                        <label for="f-duracion"><strong>Duracion (horas)</strong></label>
                        <input type="number" id="f-duracion" min="1" max="500"
                               value="${curso ? curso.duracionHoras : 10}"
                               style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
                    </section>
                </section>
                <section style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
                    <button type="button" class="btn btn-gris btn-sm" id="btn-cancelar-formulario">Cancelar</button>
                    <button type="submit" class="btn btn-azul btn-sm">${esEdicion ? 'Guardar cambios' : 'Registrar curso'}</button>
                </section>
            </form>
        </section>`;
    }

    function mostrarFormulario(curso = null) {
        const formContainer = document.createElement('section');
        formContainer.innerHTML = construirFormularioInline(curso);
        const formElement = formContainer.firstElementChild;

        const encabezado = document.querySelector('.encabezado-seccion');
        if (encabezado) {
            encabezado.insertAdjacentElement('afterend', formElement);
        }

        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const form = document.getElementById('form-curso-instructor');
        const btnCancelar = document.getElementById('btn-cancelar-formulario');

        btnCancelar.addEventListener('click', () => formElement.remove());

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('f-nombre').value.trim();
            const descripcion = document.getElementById('f-descripcion').value.trim();
            const precio = document.getElementById('f-precio').value;
            const duracion = document.getElementById('f-duracion').value;

            if (nombre.length < 5) { UI.toast('El nombre debe tener al menos 5 caracteres.', 'error'); return; }
            const repetido = cursos.some(c =>
                c.nombre.toLowerCase() === nombre.toLowerCase() && (!curso || c.id !== curso.id));
            if (repetido) { UI.toast('Ya existe un curso con ese nombre.', 'error'); return; }
            if (descripcion.length < 10) { UI.toast('La descripcion debe tener al menos 10 caracteres.', 'error'); return; }

            const datos = {
                nombre,
                descripcion,
                categoriaId: Number(document.getElementById('f-categoria').value),
                instructorId: perfilInstructor.id,
                nivel: document.getElementById('f-nivel').value,
                precio: Number(precio),
                duracionHoras: Number(duracion)
            };

            if (curso) {
                const { instructorId, ...cambios } = datos;
                Datos.actualizar('cursos', curso.id, cambios);
                UI.toast('Curso actualizado.', 'exito');
            } else {
                const cat = categorias.find(c => c.id === datos.categoriaId);
                Datos.agregar('cursos', {
                    ...datos,
                    modalidad: 'Virtual',
                    valoracion: 0,
                    cupos: 20,
                    estado: 'disponible',
                    icono: cat ? cat.icono : '📘',
                    imagen: '',
                    certificado: true,
                    fechaRegistro: new Date().toISOString().slice(0, 10)
                });
                UI.toast('Curso registrado correctamente.', 'exito');
            }

            formElement.remove();
            cursos = Datos.cache('cursos');
            matriculas = Datos.cache('matriculas');
            const misCursos = filtrarCursos();
            const misMatriculas = filtrarMatriculas(misCursos);
            pintarEstadisticas(misCursos, misMatriculas);
            pintarCursos(misCursos, misMatriculas);
            pintarSolicitudes(misCursos, misMatriculas);
        });
    }

    /* ---------------------------------------------------- acciones */
    async function verDetalle(curso) {
        const cat = Datos.categoriaDe(curso);
        const instructor = instructores.find(i => Number(i.id) === Number(curso.instructorId));

        await UI.detalle(UI.escapar(curso.nombre), `
            <section style="text-align:left">
                <p>${UI.escapar(curso.descripcion)}</p>
                <table class="tabla-datos" style="margin-top:12px">
                    <tbody>
                        <tr><th>Categoría</th><td>${cat ? cat.icono + ' ' + UI.escapar(cat.nombre) : '—'}</td></tr>
                        <tr><th>Instructor</th><td>${instructor ? UI.escapar(instructor.nombres + ' ' + instructor.apellidos) : '—'}</td></tr>
                        <tr><th>Nivel</th><td>${UI.escapar(curso.nivel)}</td></tr>
                        <tr><th>Modalidad</th><td>${UI.escapar(curso.modalidad || 'Virtual')}</td></tr>
                        <tr><th>Duración</th><td>${curso.duracionHoras} horas</td></tr>
                        <tr><th>Valoración</th><td>⭐ ${curso.valoracion}</td></tr>
                        <tr><th>Cupos</th><td>${curso.cupos}</td></tr>
                        <tr><th>Precio</th><td>${UI.precio(curso.precio)}</td></tr>
                        <tr><th>Publicado</th><td>${UI.fecha(curso.fechaRegistro)}</td></tr>
                    </tbody>
                </table>
            </section>`);
    }

    async function crearCurso() {
        mostrarFormulario(null);
    }

    async function editarCurso(curso) {
        mostrarFormulario(curso);
    }

    async function aprobarCertificacion(matriculaId) {
        const confirmado = await UI.confirmar(
            'Aprobar certificación',
            '¿Deseas emitir el certificado para este estudiante?',
            'Sí, aprobar'
        );
        if (!confirmado) return;

        const mat = matriculas.find(m => m.id === matriculaId);
        Datos.actualizar('matriculas', matriculaId, {
            certificadoEmitido: true,
            estado: 'completado'
        });

        if (mat) {
            const estudiante = usuarios.find(u => Number(u.id) === Number(mat.usuarioId));
            const curso = cursos.find(c => Number(c.id) === Number(mat.cursoId));
            if (estudiante && curso) {
                const nombreEst = `${estudiante.nombres} ${estudiante.apellidos}`;
                const nombreCurso = curso.nombre;
                await Datos.obtener('notificaciones');
                Datos.agregar('notificaciones', {
                    id: Date.now(),
                    rol: 'estudiante',
                    tipo: 'exito',
                    icono: '📜',
                    titulo: '¡Certificado emitido!',
                    descripcion: `Tu certificado del curso "${nombreCurso}" ha sido emitido por el instructor. ¡Felicitaciones!`,
                    leida: false,
                    fecha: new Date().toISOString(),
                    fuente: 'Servicio de Certificación'
                });
                Datos.agregar('notificaciones', {
                    id: Date.now() + 2,
                    rol: 'empresa',
                    tipo: 'info',
                    icono: '🎓',
                    titulo: `${nombreEst} obtuvo un certificado`,
                    descripcion: `${nombreEst} completó el curso "${nombreCurso}" y obtuvo su certificado. Perfil actualizado.`,
                    leida: false,
                    fecha: new Date().toISOString(),
                    fuente: 'Servicio de Certificación'
                });
            }
        }

        matriculas = Datos.cache('matriculas');
        const misCursos = filtrarCursos();
        const misMatriculas = filtrarMatriculas(misCursos);
        pintarEstadisticas(misCursos, misMatriculas);
        pintarCursos(misCursos, misMatriculas);
        pintarSolicitudes(misCursos, misMatriculas);
        UI.toast('Certificación aprobada y emitida.', 'exito');
    }

    async function revisarCertificacion(matriculaId) {
        UI.toast('Solicitud enviada a revisión.', 'info');
    }

    /* --------------------------------------------------- delegacion */
    if (tarjetaCursos) {
        tarjetaCursos.addEventListener('click', async evento => {
            const boton = evento.target.closest('button[data-accion]');
            if (!boton) return;

            const tarjeta = boton.closest('.solicitud-card');
            const cursoId = tarjeta ? tarjeta.dataset.cursoId : null;
            const curso = cursos.find(c => Number(c.id) === Number(cursoId));
            if (!curso) return;

            switch (boton.dataset.accion) {
                case 'detalle': await verDetalle(curso); break;
                case 'editar': await editarCurso(curso); break;
            }
        });
    }

    if (tarjetaSolicitudes) {
        tarjetaSolicitudes.addEventListener('click', async evento => {
            const boton = evento.target.closest('button[data-accion]');
            if (!boton) return;

            const tarjeta = boton.closest('.solicitud-card');
            const matriculaId = tarjeta ? Number(tarjeta.dataset.matriculaId) : null;
            if (!matriculaId) return;

            switch (boton.dataset.accion) {
                case 'aprobar': await aprobarCertificacion(matriculaId); break;
                case 'revisar': await revisarCertificacion(matriculaId); break;
            }
        });
    }

    if (botonCrear) {
        botonCrear.addEventListener('click', async evento => {
            evento.preventDefault();
            await crearCurso();
        });
    }

    /* --------------------------------------------------------- inicio */
    await cargar();
});
