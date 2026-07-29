/* ============================================================================
   dashboard-instructor.js — Panel dinamico del instructor

   Carga datos reales desde JSON/localStorage: cursos del instructor,
   matriculas de esos cursos, estadisticas y solicitudes de certificacion.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const usuario = Auth.proteger(['instructor']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);
    document.getElementById('enlace-inicio').href = Auth.panelDe(usuario.rol);

    const zonaStats = document.getElementById('stats-instructor');
    const zonaTabla = document.getElementById('tabla-cursos');
    const zonaSolicitudes = document.getElementById('solicitudes-pendientes');
    const zonaVerificacion = document.getElementById('estado-verificacion');

    /* -------------------------------------------------- cargar datos */
    async function cargar() {
        UI.cargando(zonaStats, 'Cargando tu panel…');
        try {
            await Datos.obtenerVarias('cursos', 'matriculas', 'categorias', 'instructores', 'usuarios');

            const perfilInstructor = buscarPerfilInstructor(usuario);
            const misCursos = filtrarCursosDelInstructor(usuario, perfilInstructor);
            const todasMatriculas = Datos.cache('matriculas');
            const misMatriculas = todasMatriculas.filter(m =>
                misCursos.some(c => Number(c.id) === Number(m.cursoId))
            );

            pintarEstadisticas(misCursos, misMatriculas);
            pintarGraficas(misCursos, misMatriculas);
            pintarTabla(misCursos, misMatriculas);
            pintarSolicitudes(misMatriculas);
            pintarVerificacion(perfilInstructor);
        } catch (error) {
            UI.fallo(zonaStats, error.message, cargar);
        }
    }

    /* ---------------------------------------------------- helpers */
    function buscarPerfilInstructor(usuarioLogueado) {
        const instructores = Datos.cache('instructores');
        return instructores.find(i =>
            i.email && usuarioLogueado.email &&
            i.email.toLowerCase() === usuarioLogueado.email.toLowerCase()
        ) || null;
    }

    function filtrarCursosDelInstructor(usuarioLogueado, perfilInstructor) {
        const todos = Datos.cache('cursos');
        if (perfilInstructor) {
            return todos.filter(c => Number(c.instructorId) === Number(perfilInstructor.id));
        }
        return todos.filter(c => {
            const perfil = Datos.instructorDe(c);
            if (!perfil) return false;
            return perfil.email && usuarioLogueado.email &&
                perfil.email.toLowerCase() === usuarioLogueado.email.toLowerCase();
        });
    }

    /* --------------------------------------------- estadisticas */
    function pintarEstadisticas(cursos, matriculas) {
        const certificados = matriculas.filter(m => m.certificadoEmitido).length;
        const enProgreso = matriculas.filter(m => m.estado === 'en progreso' || m.estado === 'inscrito').length;
        const completados = matriculas.filter(m => m.estado === 'completado').length;
        const tasa = matriculas.length > 0
            ? Math.round((certificados / matriculas.length) * 100)
            : 0;
        const promedioCal = certificados > 0
            ? (matriculas.filter(m => m.certificadoEmitido && m.calificacion)
                .reduce((s, m) => s + m.calificacion, 0) /
                matriculas.filter(m => m.certificadoEmitido && m.calificacion).length || 0).toFixed(1)
            : '—';

        const tasaColor = tasa >= 70 ? '#16a34a' : tasa >= 40 ? '#f59e0b' : '#ef4444';

        zonaStats.innerHTML = [
            ['fa-book', cursos.length, 'Cursos publicados', '#2563eb'],
            ['fa-users', matriculas.length, 'Total inscritos', '#8b5cf6'],
            ['fa-spinner', enProgreso, 'En progreso', '#f59e0b'],
            ['fa-check-circle', completados, 'Completados', '#10b981'],
            ['fa-award', certificados, 'Certificados emitidos', '#16a34a'],
            ['fa-chart-line', tasa + '%', 'Tasa de certificacion', tasaColor],
            ['fa-star', promedioCal, 'Promedio calificacion', '#0ea5e9']
        ].map(([icono, valor, texto, color]) => `
            <div class="stat-box" style="border-top-color:${color}">
                <div class="icono-stat" style="color:${color}"><i class="fas ${icono}"></i></div>
                <div class="numero" style="color:${color}">${valor}</div>
                <div class="etiqueta">${texto}</div>
            </div>`).join('');
    }

    /* --------------------------------------------- graficas */
    function pintarGraficas(cursos, matriculas) {
        if (typeof Chart === 'undefined') return;

        const categorias = Datos.cache('categorias');

        const cursosLabels = cursos.map(c => c.nombre.length > 16 ? c.nombre.substring(0, 14) + '…' : c.nombre);
        const inscritosPorCurso = cursos.map(c => matriculas.filter(m => Number(m.cursoId) === Number(c.id)).length);

        if (cursosLabels.length > 0) {
            const ctx1 = document.getElementById('chart-alumnos-curso');
            if (ctx1) {
                new Chart(ctx1, {
                    type: 'bar',
                    data: {
                        labels: cursosLabels,
                        datasets: [{
                            label: 'Inscritos',
                            data: inscritosPorCurso,
                            backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
                            borderRadius: 6,
                            barThickness: 30
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false }, title: { display: true, text: 'Alumnos por curso', font: { size: 14 } } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        }

        const certs = matriculas.filter(m => m.certificadoEmitido).length;
        const pendientes = matriculas.length - certs;
        if (matriculas.length > 0) {
            const ctx2 = document.getElementById('chart-tasa-certificados');
            if (ctx2) {
                new Chart(ctx2, {
                    type: 'doughnut',
                    data: {
                        labels: ['Certificados emitidos', 'Pendientes'],
                        datasets: [{
                            data: [certs, pendientes],
                            backgroundColor: ['#16a34a', '#e5e7eb'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '60%',
                        plugins: { title: { display: true, text: 'Tasa de certificación', font: { size: 14 } } }
                    }
                });
            }
        }

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const inscripcionesMes = new Array(12).fill(0);
        matriculas.forEach(m => {
            if (m.fechaInscripcion) {
                const d = new Date(m.fechaInscripcion);
                if (!isNaN(d)) inscripcionesMes[d.getMonth()]++;
            }
        });
        const ctx3 = document.getElementById('chart-inscripciones');
        if (ctx3) {
            new Chart(ctx3, {
                type: 'line',
                data: {
                    labels: meses,
                    datasets: [{
                        label: 'Inscripciones',
                        data: inscripcionesMes,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false }, title: { display: true, text: 'Inscripciones por mes', font: { size: 14 } } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
    }

    /* --------------------------------------------- tabla cursos */
    function pintarTabla(cursos, matriculas) {
        if (cursos.length === 0) {
            UI.vacio(zonaTabla, 'Aún no tienes cursos publicados.', '📚');
            return;
        }

        const categorias = Datos.cache('categorias');
        const filas = cursos.map(curso => {
            const cat = categorias.find(c => c.id === curso.categoriaId);
            const mats = matriculas.filter(m => Number(m.cursoId) === Number(curso.id));
            const enProgreso = mats.filter(m => m.estado === 'en progreso' || m.estado === 'inscrito').length;
            const certs = mats.filter(m => m.certificadoEmitido).length;
            const tasa = mats.length > 0 ? Math.round((certs / mats.length) * 100) : 0;
            const estado = curso.estado === 'disponible' ? 'verde' : 'amarillo';
            const label = curso.estado === 'disponible' ? 'Activo' : curso.estado === 'agotado' ? 'Agotado' : 'Borrador';

            return `
                <tr>
                    <td><strong>${UI.escapar(curso.nombre)}</strong></td>
                    <td>${cat ? cat.icono + ' ' + UI.escapar(cat.nombre) : '—'}</td>
                    <td>${mats.length}</td>
                    <td>${enProgreso}</td>
                    <td>${certs}</td>
                    <td>${tasa}%</td>
                    <td><span class="badge badge-${estado}">${label}</span></td>
                </tr>`;
        }).join('');

        zonaTabla.innerHTML = `
            <table class="tabla">
                <thead>
                    <tr>
                        <th>Curso</th><th>Categoría</th><th>Inscritos</th>
                        <th>En progreso</th><th>Certificados</th><th>Tasa</th><th>Estado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>`;
    }

    /* --------------------------------------------- solicitudes */
    function pintarSolicitudes(matriculas) {
        const pendientes = matriculas.filter(m =>
            m.progreso >= 90 && !m.certificadoEmitido && m.estado !== 'completado'
        );

        if (pendientes.length === 0) {
            UI.vacio(zonaSolicitudes, 'No hay solicitudes de certificación pendientes.', '✅');
            return;
        }

        const usuarios = Datos.cache('usuarios');
        const cursos = Datos.cache('cursos');

        zonaSolicitudes.innerHTML = pendientes.map(m => {
            const estudiante = usuarios.find(u => Number(u.id) === Number(m.usuarioId));
            const curso = cursos.find(c => Number(c.id) === Number(m.cursoId));
            const nombre = estudiante ? `${estudiante.nombres} ${estudiante.apellidos}` : 'Estudiante';
            const nombreCurso = curso ? curso.nombre : 'Curso';
            const clase = m.progreso >= 90 ? 'badge-verde' : 'badge-amarillo';
            const avatarUrl = estudiante ? UI.fotoUsuario(estudiante) : UI.avatarDataUri('?');

            return `
                <section class="solicitud-card">
                    <div class="info-sol" style="display:flex;align-items:center;gap:12px">
                        <img src="${avatarUrl}" alt="" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0">
                        <section>
                            <div class="nombre-sol">${UI.escapar(nombre)}</div>
                            <div class="detalle-sol">Solicita certificacion en: ${UI.escapar(nombreCurso)}</div>
                            <div class="solicitud-progreso">
                                <span class="badge ${clase}">Progreso: ${m.progreso}%</span>
                            </div>
                        </section>
                    </div>
                    <div class="acciones-sol">
                        <button type="button" class="btn btn-verde btn-xs" data-matricula="${m.id}" data-accion="aprobar">Aprobar</button>
                        <button type="button" class="btn btn-gris btn-xs" data-matricula="${m.id}" data-accion="revisar">Revisar</button>
                    </div>
                </section>`;
        }).join('');

        zonaSolicitudes.querySelectorAll('button[data-accion]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const matriculaId = Number(btn.dataset.matricula);
                if (btn.dataset.accion === 'aprobar') {
                    Datos.actualizar('matriculas', matriculaId, {
                        certificadoEmitido: true,
                        estado: 'completado'
                    });
                    UI.toast('Certificación aprobada.', 'exito');
                } else {
                    UI.toast('Solicitud enviada a revisión.', 'info');
                }
                await cargar();
            });
        });
    }

    /* --------------------------------------------- verificacion */
    function pintarVerificacion(perfilInstructor) {
        if (!perfilInstructor) {
            zonaVerificacion.innerHTML = `
                <div class="verificacion-estado">
                    <span class="badge badge-amarillo badge-grande">⚠️ Pendiente de verificación</span>
                    <span class="texto-verificacion">Tu perfil de instructor aún no ha sido verificado por un administrador.</span>
                </div>`;
            return;
        }
        const verificado = perfilInstructor.verificado;
        zonaVerificacion.innerHTML = verificado
            ? `<div class="verificacion-estado">
                    <span class="badge badge-verde badge-grande">✓ Instructor Verificado</span>
                    <span class="texto-verificacion">Tu perfil ha sido verificado y aprobado.</span>
               </div>`
            : `<div class="verificacion-estado">
                    <span class="badge badge-amarillo badge-grande">⚠️ Pendiente de verificación</span>
                    <span class="texto-verificacion">Un administrador revisará tu perfil pronto.</span>
               </div>`;
    }

    await cargar();
});
