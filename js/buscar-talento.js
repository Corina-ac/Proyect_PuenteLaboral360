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
    const selectOrden = document.getElementById('orden-candidatos');
    const buscador = document.getElementById('buscar-candidato');
    const btnBuscar = document.getElementById('btn-buscar-talento');
    const btnLimpiar = document.getElementById('btn-limpiar-talento');

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
        const candidatos = ordenar(prepararCandidatos(estudiantes));

        if (contador) {
            const total = todosEstudiantes.length;
            contador.textContent =
                `Mostrando ${candidatos.length} de ${total} candidato${total !== 1 ? 's' : ''} · ` +
                `Orden: ${etiquetaOrden()}`;
        }

        if (candidatos.length === 0) {
            UI.vacio(zonaResultados,
                'Ningún candidato coincide con la búsqueda o los filtros seleccionados.', '🔍');
            return;
        }

        zonaResultados.innerHTML = candidatos.map(est => {
            const clase = est.match >= 70 ? 'match-alto' : est.match >= 40 ? 'match-medio' : 'match-bajo';
            const nivelClase = est.nivel === 'senior' ? 'badge-verde' : est.nivel === 'semi-senior' ? 'badge-azul' : 'badge-gris';

            return `
                <section class="candidato-card">
                    <div class="info-candidato">
                        <div class="nombre-candidato">${est.match >= 80 ? '⭐ ' : ''}${UI.escapar(est.nombres)} ${UI.escapar(est.apellidos)}</div>
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

    /* --------------------------------------------------- busqueda y filtros */

    /**
     * Aplica, en un solo paso, el texto del buscador y todos los filtros.
     * Se llama tanto al escribir como al cambiar cualquier select, de modo que
     * la busqueda y los filtros siempre actuan combinados y no se anulan.
     */
    function aplicarVista() {
        let filtrados = [...todosEstudiantes];

        // 1. Busqueda en tiempo real sobre varios campos a la vez.
        const texto = buscador ? buscador.value.trim().toLowerCase() : '';
        if (texto !== '') {
            filtrados = filtrados.filter(e => {
                const contacto = e.contacto || {};
                const pais = e.nacionalidad || {};
                const campos = [
                    e.nombres, e.apellidos, e.email, e.nivel, e.objetivo,
                    contacto.ciudad, pais.nombre,
                    (e.habilidades || []).join(' ')
                ].join(' ').toLowerCase();
                return campos.includes(texto);
            });
        }

        // 2. Filtro por habilidad.
        if (selectHabilidad && selectHabilidad.value) {
            const hab = selectHabilidad.value.toLowerCase();
            filtrados = filtrados.filter(e =>
                (e.habilidades || []).some(h => h.toLowerCase().includes(hab))
            );
        }

        // 3. Filtro por nivel de experiencia.
        if (selectNivel && selectNivel.value) {
            filtrados = filtrados.filter(e =>
                (e.nivel || '').toLowerCase() === selectNivel.value.toLowerCase()
            );
        }

        // 4. Filtro por cantidad minima de certificados.
        if (selectCertificados && selectCertificados.value) {
            const minCerts = Number(selectCertificados.value);
            filtrados = filtrados.filter(e => {
                const certs = todasMatriculas.filter(m =>
                    Number(m.usuarioId) === Number(e.id) && m.certificadoEmitido
                ).length;
                return certs >= minCerts;
            });
        }

        // 5. Filtro por vacante: solo quienes cubren alguna habilidad pedida.
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
    }

    /** Ordena los candidatos ya calculados segun el criterio elegido. */
    function ordenar(candidatos) {
        const criterio = selectOrden ? selectOrden.value : 'match-desc';
        const copia = [...candidatos];

        switch (criterio) {
            case 'match-asc':
                return copia.sort((a, b) => a.match - b.match);
            case 'certs-desc':
                return copia.sort((a, b) => b.certs - a.certs || b.match - a.match);
            case 'nombre-asc':
                return copia.sort((a, b) => a.nombres.localeCompare(b.nombres));
            case 'nombre-desc':
                return copia.sort((a, b) => b.nombres.localeCompare(a.nombres));
            case 'fecha-desc':
                return copia.sort((a, b) =>
                    (b.fechaRegistro || '').localeCompare(a.fechaRegistro || ''));
            case 'match-desc':
            default:
                return copia.sort((a, b) => b.match - a.match);
        }
    }

    /** Texto legible del criterio activo, para el contador de resultados. */
    function etiquetaOrden() {
        const opcion = selectOrden && selectOrden.selectedOptions[0];
        return opcion ? opcion.textContent : 'Mayor coincidencia';
    }

    /* ----------------------------------------------------------- eventos */
    // Busqueda mientras se escribe.
    if (buscador) buscador.addEventListener('input', aplicarVista);

    // Cada filtro y el orden reaccionan al instante.
    [selectHabilidad, selectNivel, selectCertificados, selectVacante, selectOrden]
        .forEach(control => {
            if (control) control.addEventListener('change', aplicarVista);
        });

    // El boton se conserva porque resulta natural en un formulario de busqueda.
    if (btnBuscar) btnBuscar.addEventListener('click', aplicarVista);

    // Devuelve la vista a su estado inicial.
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if (buscador) buscador.value = '';
            [selectHabilidad, selectNivel, selectCertificados, selectVacante]
                .forEach(control => { if (control) control.value = ''; });
            if (selectOrden) selectOrden.value = 'match-desc';
            aplicarVista();
            UI.toast('Filtros restablecidos.', 'info');
        });
    }

    await cargar();
});
