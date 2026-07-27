/* ============================================================================
   buscar-talento.js — Busqueda dinamica de talento para empresas/admin

   Filtra estudiantes por habilidad, nivel, certificados y vacante.
   Calcula match contra vacantes de la empresa. Permite ver perfil
   y contactar con telefono + codigo de pais.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const usuario = Auth.proteger(['empresa', 'admin']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);

    const zonaResultados = document.getElementById('resultados-candidatos');
    const contador = document.getElementById('contador-candidatos');
    const selectHabilidad = document.getElementById('filtro-habilidad');
    const selectNivel = document.getElementById('filtro-nivel-exp');
    const selectCertificados = document.getElementById('filtro-certificados');
    const selectVacante = document.getElementById('filtro-vacante-asociada');
    const btnBuscar = document.getElementById('btn-buscar-talento');

    let todosEstudiantes = [];
    let todasVacantes = [];
    let todasMatriculas = [];

    async function cargar() {
        UI.cargando(zonaResultados, 'Cargando candidatos…');
        try {
            await Datos.obtenerVarias('usuarios', 'vacantes', 'matriculas', 'cursos', 'categorias', 'empresas');

            todosEstudiantes = Datos.cache('usuarios').filter(u => u.rol === 'estudiante');
            todasVacantes = Datos.cache('vacantes');
            todasMatriculas = Datos.cache('matriculas');

            poblarFiltros();
            mostrarResultados(todosEstudiantes);
        } catch (error) {
            UI.fallo(zonaResultados, error.message, cargar);
        }
    }

    /* --------------------------------------------------- filtros */
    function poblarFiltros() {
        const categorias = Datos.cache('categorias');
        if (selectHabilidad) {
            selectHabilidad.innerHTML = '<option value="">Todas</option>' +
                categorias.map(c => `<option value="${UI.escapar(c.nombre)}">${c.icono} ${UI.escapar(c.nombre)}</option>`).join('');
        }
        if (selectVacante) {
            selectVacante.innerHTML = '<option value="">Sin filtrar</option>' +
                todasVacantes.filter(v => v.estado === 'abierta').map(v =>
                    `<option value="${v.id}">${UI.escapar(v.titulo)}</option>`
                ).join('');
        }
    }

    /* --------------------------------------------------- calcular candidatos */
    function prepararCandidatos(estudiantes) {
        const cursos = Datos.cache('cursos');
        return estudiantes.map(est => {
            const mats = todasMatriculas.filter(m => Number(m.usuarioId) === Number(est.id));
            const certs = mats.filter(m => m.certificadoEmitido).length;
            const habilidades = (est.habilidades || []).map(h => h.toLowerCase());
            const nivel = (est.nivel || 'Principiante').toLowerCase();

            let mejorMatch = 0;
            let vacanteMejor = null;
            todasVacantes.forEach(v => {
                const req = (v.habilidades || []).map(h => h.toLowerCase());
                const coincidencias = req.filter(h => habilidades.some(eh => eh.includes(h) || h.includes(eh)));
                const match = req.length > 0 ? Math.round((coincidencias.length / req.length) * 100) : 0;
                if (match > mejorMatch) {
                    mejorMatch = match;
                    vacanteMejor = v;
                }
            });

            const pais = est.nacionalidad || {};
            const contacto = est.contacto || {};
            const codigos = { EC: '593', CO: '57', PE: '51', MX: '52', AR: '54', CL: '56', VE: '58', ES: '34', US: '1', BR: '55' };

            return {
                ...est, certs, nivel, habilidades, match: mejorMatch,
                vacanteAsociada: vacanteMejor, pais,
                telefonoCompleto: pais.codigo && contacto.telefono
                    ? `+${codigos[pais.codigo] || '0'} ${contacto.telefono}`
                    : contacto.telefono || '—'
            };
        }).sort((a, b) => b.match - a.match);
    }

    /* --------------------------------------------------- mostrar resultados */
    function mostrarResultados(estudiantes) {
        const candidatos = prepararCandidatos(estudiantes);

        if (contador) {
            contador.textContent = `${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} encontrado${candidatos.length !== 1 ? 's' : ''} · Ordenados por compatibilidad`;
        }

        if (candidatos.length === 0) {
            UI.vacio(zonaResultados, 'Ningún candidato coincide con los filtros seleccionados.', '🔍');
            return;
        }

        zonaResultados.innerHTML = candidatos.map(est => {
            const clase = est.match >= 70 ? 'match-alto' : est.match >= 40 ? 'match-medio' : 'match-bajo';
            const nivelClase = est.nivel === 'senior' ? 'badge-verde' : est.nivel === 'semi-senior' ? 'badge-azul' : 'badge-gris';

            return `
                <section class="candidato-card">
                    <section class="info-candidato">
                        <section class="nombre-candidato">${est.match >= 80 ? '⭐ ' : ''}${UI.escapar(est.nombres)} ${UI.escapar(est.apellidos)}</section>
                        <section class="detalle-candidato">
                            <span class="badge ${nivelClase}">${UI.escapar(est.nivel)}</span>
                            · ${est.certs} certificado${est.certs !== 1 ? 's' : ''}
                            · ${est.habilidades.length > 0 ? est.habilidades.slice(0, 4).join(', ') : 'Sin habilidades'}
                        </section>
                        <section>
                            ${est.habilidades.slice(0, 5).map(h =>
                                `<span class="habilidad-tag">${UI.escapar(h)}</span>`
                            ).join('')}
                        </section>
                    </section>
                    <section class="acciones-candidato">
                        <section class="match-grande ${clase}">
                            ${est.match}%<span class="etiqueta-match">de match</span>
                        </section>
                        <button type="button" class="btn btn-azul btn-xs" data-accion="ver-perfil" data-id="${est.id}">Ver perfil</button>
                        <button type="button" class="btn btn-verde btn-xs" data-accion="contactar" data-id="${est.id}">Contactar</button>
                    </section>
                </section>`;
        }).join('');

        zonaResultados.querySelectorAll('button[data-accion]').forEach(btn => {
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
                            <tr><th>Nivel</th><td>${UI.escapar(est.nivel)}</td></tr>
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
        Swal.fire({
            title: `Contactar a ${est.nombres}`,
            html: `
                <section style="text-align:left">
                    <p><strong>Correo:</strong> ${UI.escapar(est.email)}</p>
                    <p><strong>Teléfono:</strong> ${UI.escapar(est.telefonoCompleto)}</p>
                    <p><strong>Ciudad:</strong> ${UI.escapar((est.contacto || {}).ciudad || 'No registrada')}</p>
                    <p><strong>Nacionalidad:</strong> ${pais.bandera || ''} ${UI.escapar(pais.nombre || '—')}</p>
                </section>`,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb'
        });
    }

    /* --------------------------------------------------- filtros */
    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            let filtrados = [...todosEstudiantes];

            if (selectHabilidad && selectHabilidad.value) {
                const hab = selectHabilidad.value.toLowerCase();
                filtrados = filtrados.filter(e =>
                    (e.habilidades || []).some(h => h.toLowerCase().includes(hab))
                );
            }
            if (selectNivel && selectNivel.value) {
                filtrados = filtrados.filter(e =>
                    (e.nivel || '').toLowerCase() === selectNivel.value.toLowerCase()
                );
            }
            if (selectCertificados && selectCertificados.value) {
                const minCerts = Number(selectCertificados.value);
                filtrados = filtrados.filter(e => {
                    const certs = todasMatriculas.filter(m =>
                        Number(m.usuarioId) === Number(e.id) && m.certificadoEmitido
                    ).length;
                    return certs >= minCerts;
                });
            }
            if (selectVacante && selectVacante.value) {
                const vacante = todasVacantes.find(v => Number(v.id) === Number(selectVacante.value));
                if (vacante) {
                    const req = (vacante.habilidades || []).map(h => h.toLowerCase());
                    filtrados = filtrados.filter(e => {
                        const hab = (e.habilidades || []).map(h => h.toLowerCase());
                        return req.some(r => hab.some(h => h.includes(r) || r.includes(h)));
                    });
                }
            }

            mostrarResultados(filtrados);
        });
    }

    await cargar();
});
