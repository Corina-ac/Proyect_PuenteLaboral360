/* ============================================================================
   dashboard-empresa.js — Panel dinamico de la empresa

   Muestra vacantes propias, candidatos con match, perfiles de estudiantes
   (sin boton de IA) y funcionalidad de contacto con telefono + codigo de pais.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const empresaUsuario = Auth.proteger(['empresa']);
    if (!empresaUsuario) return;

    UI.pintarPerfilLateral(empresaUsuario);
    const enlaceInicio = document.getElementById('enlace-inicio');
    if (enlaceInicio) enlaceInicio.href = Auth.panelDe(empresaUsuario.rol);

    const zonaStats = document.getElementById('stats-empresa');
    const zonaFiltros = document.getElementById('filtros-vacante');
    const zonaCandidatos = document.getElementById('lista-candidatos');
    const selectVacante = document.getElementById('select-vacante-empresa');
    const selectNivel = document.getElementById('select-nivel-empresa');
    const btnBuscar = document.getElementById('btn-buscar-candidatos');

    let todosEstudiantes = [];
    let todasVacantes = [];
    let matriculas = [];

    async function cargar() {
        UI.cargando(zonaStats, 'Cargando panel de empresa…');
        try {
            await Datos.obtenerVarias('usuarios', 'vacantes', 'matriculas', 'cursos', 'categorias', 'empresas');

            todosEstudiantes = Datos.cache('usuarios').filter(u => u.rol === 'estudiante');
            todasVacantes = Datos.cache('vacantes');
            matriculas = Datos.cache('matriculas');

            const misVacantes = buscarVacantesDeEmpresa(empresaUsuario, todasVacantes);
            const candidatos = calcularCandidatos(todosEstudiantes, misVacantes, matriculas);

            pintarEstadisticas(misVacantes, candidatos);
            pintarGraficas(candidatos, misVacantes);
            pintarSelectorVacantes(misVacantes);
            pintarCandidatos(candidatos, misVacantes);
        } catch (error) {
            UI.fallo(zonaStats, error.message, cargar);
        }
    }

    /* --------------------------------------------------- buscar vacantes de la empresa */
    function buscarVacantesDeEmpresa(usuarioEmp, vacantes) {
        const empresas = Datos.cache('empresas');
        const empresaPerfil = empresas.find(e =>
            e.contacto && e.contacto.email &&
            e.contacto.email.toLowerCase() === usuarioEmp.email.toLowerCase()
        );
        if (empresaPerfil) {
            return vacantes.filter(v => Number(v.empresaId) === Number(empresaPerfil.id));
        }
        return vacantes.filter(v => {
            const emp = Datos.empresaDe(v);
            if (!emp) return false;
            return emp.contacto && emp.contacto.email &&
                emp.contacto.email.toLowerCase() === usuarioEmp.email.toLowerCase();
        });
    }

    /* --------------------------------------------------- calcular candidatos */
    function calcularCandidatos(estudiantes, vacantes, mats) {
        const cursos = Datos.cache('cursos');
        const categorias = Datos.cache('categorias');

        return estudiantes.map(est => {
            const matsEst = mats.filter(m => Number(m.usuarioId) === Number(est.id));
            const certs = matsEst.filter(m => m.certificadoEmitido).length;
            const habilidades = (est.habilidades || []).map(h => h.toLowerCase());
            const nivel = est.nivel || 'Principiante';

            let mejorMatch = 0;
            let vacanteMejor = null;
            vacantes.forEach(v => {
                const req = (v.habilidades || []).map(h => h.toLowerCase());
                const coincidencias = req.filter(h =>
                    habilidades.some(eh => eh.includes(h) || h.includes(eh))
                );
                const match = req.length > 0 ? Math.round((coincidencias.length / req.length) * 100) : 0;
                if (match > mejorMatch) {
                    mejorMatch = match;
                    vacanteMejor = v;
                }
            });

            const pais = est.nacionalidad || {};
            const contacto = est.contacto || {};

            return {
                ...est,
                certs,
                nivel,
                habilidades,
                match: mejorMatch,
                vacanteAsociada: vacanteMejor,
                pais,
                telefonoCompleto: pais.codigo && contacto.telefono
                    ? `+${obtenerCodigoTelefonico(pais.codigo)} ${contacto.telefono}`
                    : contacto.telefono || '—'
            };
        }).sort((a, b) => b.match - a.match);
    }

    function obtenerCodigoTelefonico(codigoPais) {
        const codigos = {
            EC: '593', CO: '57', PE: '51', MX: '52', AR: '54', CL: '56',
            VE: '58', ES: '34', US: '1', BR: '55', CR: '506', PA: '507'
        };
        return codigos[codigoPais] || '0';
    }

    /* --------------------------------------------------- estadisticas */
    function pintarEstadisticas(misVacantes, candidatos) {
        const abiertas = misVacantes.filter(v => v.estado === 'abierta').length;
        const buenos = candidatos.filter(c => c.match >= 60).length;
        zonaStats.innerHTML = [
            ['fa-users', candidatos.length, 'Candidatos encontrados', '#dc3545'],
            ['fa-briefcase', abiertas, 'Vacantes activas', '#1a73e8'],
            ['fa-bullseye', buenos, 'Buen match (≥60%)', '#f59e0b'],
            ['fa-list-check', misVacantes.length, 'Mis vacantes', '#16a34a']
        ].map(([icono, valor, texto, color]) => `
            <div class="stat-box" style="border-top-color:${color}">
                <div class="icono-stat" style="color:${color}"><i class="fas ${icono}"></i></div>
                <div class="numero" style="color:${color}">${valor}</div>
                <div class="etiqueta">${texto}</div>
            </div>`).join('');
    }

    /* --------------------------------------------------- graficas */
    function pintarGraficas(candidatos, vacantes) {
        if (typeof Chart === 'undefined') return;

        const rangos = { 'Alto (≥70%)': 0, 'Medio (40-69%)': 0, 'Bajo (<40%)': 0 };
        candidatos.forEach(c => {
            if (c.match >= 70) rangos['Alto (≥70%)']++;
            else if (c.match >= 40) rangos['Medio (40-69%)']++;
            else rangos['Bajo (<40%)']++;
        });

        if (candidatos.length > 0) {
            const ctx1 = document.getElementById('chart-match-distribucion');
            if (ctx1) {
                new Chart(ctx1, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(rangos),
                        datasets: [{
                            data: Object.values(rangos),
                            backgroundColor: ['#16a34a', '#f59e0b', '#ef4444'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '55%',
                        plugins: { title: { display: true, text: 'Distribución de compatibilidad', font: { size: 14 } } }
                    }
                });
            }
        } else {
            UI.graficoVacio('chart-match-distribucion',
                'Publica una vacante para ver qué tan bien encajan los candidatos.', {
                    titulo: 'Distribución de compatibilidad',
                    icono: '🎯',
                    accion: { texto: 'Publicar vacante', href: '../mis-vacantes/mis-vacantes.html' }
                });
        }

        const niveles = { 'Principiante': 0, 'Junior': 0, 'Semi-senior': 0, 'Senior': 0 };
        candidatos.forEach(c => {
            const n = c.nivel || 'Principiante';
            if (niveles.hasOwnProperty(n)) niveles[n]++;
        });

        if (candidatos.length > 0) {
            const ctx2 = document.getElementById('chart-nivel-candidatos');
            if (ctx2) {
                new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(niveles),
                        datasets: [{
                            label: 'Candidatos',
                            data: Object.values(niveles),
                            backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#16a34a'],
                            borderRadius: 6,
                            barThickness: 32
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false }, title: { display: true, text: 'Candidatos por nivel', font: { size: 14 } } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        } else {
            UI.graficoVacio('chart-nivel-candidatos',
                'Aún no hay candidatos que coincidan con tus vacantes.', {
                    titulo: 'Candidatos por nivel',
                    icono: '👥',
                    accion: { texto: 'Buscar talento', href: '../buscar-talento/buscar-talento.html' }
                });
        }
    }

    /* --------------------------------------------------- selector vacantes */
    function pintarSelectorVacantes(misVacantes) {
        if (!selectVacante) return;
        selectVacante.innerHTML = '<option value="">Todas las vacantes</option>' +
            misVacantes.map(v => `<option value="${v.id}">${UI.escapar(v.titulo)}</option>`).join('');
    }

    /* --------------------------------------------------- candidatos */
    function pintarCandidatos(candidatos, misVacantes) {
        if (candidatos.length === 0) {
            UI.vacio(zonaCandidatos, 'No hay candidatos disponibles aún.', '👥');
            return;
        }

        zonaCandidatos.innerHTML = candidatos.map(est => {
            const clase = est.match >= 70 ? 'match-alto' : est.match >= 40 ? 'match-medio' : 'match-bajo';
            const nivelClase = est.nivel === 'Senior' ? 'badge-verde' : est.nivel === 'Semi-senior' ? 'badge-azul' : 'badge-gris';

            return `
                <section class="candidato-card">
                    <div class="info-candidato">
                        <div class="nombre-candidato">${UI.escapar(est.nombres)} ${UI.escapar(est.apellidos)}</div>
                        <div class="detalle-candidato">
                            <span class="badge ${nivelClase}">${UI.escapar(est.nivel)}</span>
                            · ${est.certs} certificado${est.certs !== 1 ? 's' : ''}
                            · ${est.habilidades.length > 0 ? est.habilidades.slice(0, 4).join(', ') : 'Sin habilidades'}
                        </div>
                        <section>
                            ${est.habilidades.slice(0, 5).map(h =>
                                `<span class="habilidad-tag">${UI.escapar(h)}</span>`
                            ).join('')}
                        </section>
                    </div>
                    <div class="acciones-candidato">
                        <div class="match-grande ${clase}">
                            ${est.match}%<span class="etiqueta-match">de match</span>
                        </div>
                        <button type="button" class="btn btn-azul btn-xs" data-accion="ver-perfil" data-id="${est.id}">Ver perfil</button>
                        <button type="button" class="btn btn-verde btn-xs" data-accion="contactar" data-id="${est.id}">Contactar</button>
                    </div>
                </section>`;
        }).join('');

        zonaCandidatos.querySelectorAll('button[data-accion]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.dataset.id);
                const est = candidatos.find(e => Number(e.id) === id);
                if (!est) return;
                if (btn.dataset.accion === 'ver-perfil') {
                    mostrarPerfil(est);
                } else {
                    mostrarContacto(est);
                }
            });
        });
    }

    /* --------------------------------------------------- modal perfil */
    function mostrarPerfil(est) {
        const pais = est.pais || {};
        const contacto = est.contacto || {};
        Swal.fire({
            title: `${est.nombres} ${est.apellidos}`,
            width: 560,
            html: `
                <section style="text-align:left">
                    <table class="tabla-datos">
                        <tbody>
                            <tr><th>Nombres</th><td>${UI.escapar(est.nombres)}</td></tr>
                            <tr><th>Apellidos</th><td>${UI.escapar(est.apellidos)}</td></tr>
                            <tr><th>Correo</th><td>${UI.escapar(est.email)}</td></tr>
                            <tr><th>Nivel</th><td>${UI.escapar(est.nivel || '—')}</td></tr>
                            <tr><th>Nacionalidad</th><td>${pais.bandera || ''} ${UI.escapar(pais.nombre || '—')}</td></tr>
                            <tr><th>Ciudad</th><td>${UI.escapar(contacto.ciudad || '—')}</td></tr>
                            <tr><th>Objetivo</th><td>${UI.escapar(est.objetivo || '—')}</td></tr>
                            <tr><th>Certificados</th><td>${est.certs}</td></tr>
                        </tbody>
                    </table>
                    <h4 style="margin-top:14px;color:#1a73e8">Habilidades</h4>
                    <section style="display:flex;flex-wrap:wrap;gap:6px">
                        ${est.habilidades.length > 0
                            ? est.habilidades.map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')
                            : '<p class="texto-secundario">No ha registrado habilidades</p>'}
                    </section>
                </section>`,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb'
        });
    }

    /* --------------------------------------------------- modal contacto */
    function mostrarContacto(est) {
        const pais = est.pais || {};
        const tel = est.telefonoCompleto;
        const ciudad = (est.contacto || {}).ciudad || 'No registrada';

        Swal.fire({
            title: `Contactar a ${est.nombres}`,
            html: `
                <section style="text-align:left">
                    <p><strong>Correo:</strong> ${UI.escapar(est.email)}</p>
                    <p><strong>Teléfono:</strong> ${UI.escapar(tel)}</p>
                    <p><strong>Ciudad:</strong> ${UI.escapar(ciudad)}</p>
                    <p><strong>Nacionalidad:</strong> ${pais.bandera || ''} ${UI.escapar(pais.nombre || '—')}</p>
                    <hr style="margin:12px 0;border-color:#eee">
                    <p class="texto-secundario">Puedes contactar al candidato a través de su correo electrónico o teléfono registrado.</p>
                </section>`,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb'
        });
    }

    /* --------------------------------------------------- filtros */
    if (btnBuscar) {
        btnBuscar.addEventListener('click', async () => {
            const vacanteId = selectVacante ? selectVacante.value : '';
            const nivelFiltro = selectNivel ? selectNivel.value : '';

            let candidatos = calcularCandidatos(todosEstudiantes, buscarVacantesDeEmpresa(empresaUsuario, todasVacantes), matriculas);

            if (vacanteId) {
                const vacante = todasVacantes.find(v => Number(v.id) === Number(vacanteId));
                if (vacante) {
                    const req = (vacante.habilidades || []).map(h => h.toLowerCase());
                    candidatos = candidatos.map(c => {
                        const coincidencias = req.filter(h => c.habilidades.some(eh => eh.includes(h) || h.includes(h)));
                        return { ...c, match: req.length > 0 ? Math.round((coincidencias.length / req.length) * 100) : 0 };
                    }).filter(c => c.match > 0).sort((a, b) => b.match - a.match);
                }
            }
            if (nivelFiltro) {
                candidatos = candidatos.filter(c => c.nivel && c.nivel.toLowerCase() === nivelFiltro.toLowerCase());
            }

            pintarCandidatos(candidatos, buscarVacantesDeEmpresa(empresaUsuario, todasVacantes));
            UI.toast(`${candidatos.length} candidatos encontrados.`, 'info');
        });
    }

    await cargar();
});
