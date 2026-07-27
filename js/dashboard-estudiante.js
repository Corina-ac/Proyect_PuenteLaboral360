/* ============================================================================
   dashboard-estudiante.js — Panel dinamico del estudiante

   Muestra cursos inscritos con progreso real, certificados, habilidades,
   oportunidades laborales que coinciden con sus categorias y perfil.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const usuario = Auth.proteger(['estudiante']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);
    document.getElementById('enlace-inicio').href = Auth.panelDe(usuario.rol);

    const zonaBienvenida = document.getElementById('bienvenida-estudiante');
    const zonaStats = document.getElementById('stats-estudiante');
    const zonaCursos = document.getElementById('cursos-progreso');
    const zonaMatch = document.getElementById('oportunidades-match');
    const zonaHabilidades = document.getElementById('habilidades-estudiante');

    async function cargar() {
        UI.cargando(zonaStats, 'Cargando tu panel…');
        try {
            await Datos.obtenerVarias('cursos', 'matriculas', 'categorias', 'instructores', 'vacantes', 'empresas');

            const misMatriculas = Datos.matriculasDe(usuario.id);
            const enProgreso = misMatriculas.filter(m => m.estado === 'inscrito' || m.estado === 'en progreso');
            const completados = misMatriculas.filter(m => m.estado === 'completado');
            const certs = misMatriculas.filter(m => m.certificadoEmitido);
            const habilidades = usuario.habilidades || [];
            const perfilCompleto = calcularPerfil(usuario);

            pintarBienvenida(enProgreso.length, completados.length);
            pintarEstadisticas(enProgreso, completados, certs, perfilCompleto);
            pintarCursos(enProgreso);
            pintarMatch(usuario, misMatriculas);
            pintarHabilidades(habilidades, completados);
        } catch (error) {
            UI.fallo(zonaStats, error.message, cargar);
        }
    }

    function calcularPerfil(u) {
        let puntos = 0;
        if (u.nombres) puntos += 15;
        if (u.apellidos) puntos += 10;
        if (u.fechaNacimiento) puntos += 10;
        if (u.nacionalidad && u.nacionalidad.nombre) puntos += 10;
        if (u.contacto && u.contacto.telefono) puntos += 10;
        if (u.contacto && u.contacto.ciudad) puntos += 10;
        if (u.habilidades && u.habilidades.length > 0) puntos += 15;
        if (u.nivel) puntos += 10;
        if (u.objetivo) puntos += 10;
        return Math.min(puntos, 100);
    }

    /* --------------------------------------------------- bienvenida */
    function pintarBienvenida(enProgreso, completados) {
        zonaBienvenida.innerHTML = `
            <h1>¡Hola, ${UI.escapar(usuario.nombres)}! 👋</h1>
            <p>Tienes ${enProgreso} curso${enProgreso !== 1 ? 's' : ''} en progreso
               ${completados > 0 ? ` y ${completados} completado${completados !== 1 ? 's' : ''}` : ''}</p>`;
    }

    /* --------------------------------------------------- estadisticas */
    function pintarEstadisticas(enProgreso, completados, certs, perfil) {
        const habilidadesCount = (usuario.habilidades || []).length;
        zonaStats.innerHTML = [
            ['fa-spinner', enProgreso.length, 'Cursos en progreso', '#1a73e8'],
            ['fa-award', certs.length, 'Certificados obtenidos', '#16a34a'],
            ['fa-user-check', perfil + '%', 'Perfil completado', '#f59e0b'],
            ['fa-star', habilidadesCount, 'Habilidades', '#8b5cf6']
        ].map(([icono, valor, texto, color]) => `
            <div class="stat-box" style="border-top-color:${color}">
                <div class="icono-stat" style="color:${color}"><i class="fas ${icono}"></i></div>
                <div class="numero" style="color:${color}">${valor}</div>
                <div class="etiqueta">${texto}</div>
            </div>`).join('');
    }

    /* --------------------------------------------------- cursos en progreso */
    function pintarCursos(matriculas) {
        if (matriculas.length === 0) {
            UI.vacio(zonaCursos, 'No tienes cursos en progreso. ¡Inscríbete en el catálogo!', '📚');
            return;
        }

        const instructores = Datos.cache('instructores');
        const zona = document.querySelector('#cursos-progreso .cursos-grid') || zonaCursos;

        zona.innerHTML = matriculas.map(m => {
            const curso = m.curso;
            const instructor = instructores.find(i => i.id === curso.instructorId);
            const nombreInst = instructor ? `${instructor.nombres} ${instructor.apellidos}` : 'Por asignar';
            const clase = m.progreso >= 80 ? 'progress-verde' : m.progreso >= 40 ? 'progress-amarillo' : '';
            const badge = m.progreso >= 90
                ? '<span class="badge badge-verde">¡Casi terminas!</span>'
                : m.progreso === 0
                ? '<span class="badge badge-amarillo">Nuevo</span>'
                : '';

            return `
                <section class="curso-card">
                    <section class="titulo-curso">${UI.escapar(curso.nombre)}</section>
                    <section class="instructor">👨‍🏫 ${UI.escapar(nombreInst)}</section>
                    <section class="progreso-texto">
                        <span>Progreso</span><span>${m.progreso}%</span>
                    </section>
                    <progress title="Progreso: ${m.progreso}%" value="${m.progreso}" max="100" class="${clase}"></progress>
                    <br>${badge}
                </section>`;
        }).join('');

        if (zona !== zonaCursos) zonaCursos.innerHTML = zona.outerHTML;
    }

    /* --------------------------------------------------- oportunidades match */
    function pintarMatch(estudiante, matriculas) {
        const vacantes = Datos.cache('vacantes').filter(v => v.estado === 'abierta');
        const empresas = Datos.cache('empresas');
        const cursosInscritos = matriculas.map(m => m.curso).filter(Boolean);
        const categoriasEstudiante = new Set(cursosInscritos.map(c => c.categoriaId));
        const habilidades = (estudiante.habilidades || []).map(h => h.toLowerCase());

        const vacantesConMatch = vacantes.map(v => {
            const req = (v.habilidades || []).map(h => h.toLowerCase());
            const coincidencias = req.filter(h => habilidades.some(eh => eh.includes(h) || h.includes(eh)));
            const match = req.length > 0 ? Math.round((coincidencias.length / req.length) * 100) : 0;
            const empresa = empresas.find(e => e.id === v.empresaId);
            return { ...v, match, empresa, habilidadesRequeridas: req };
        }).filter(v => v.match > 0).sort((a, b) => b.match - a.match).slice(0, 5);

        if (vacantesConMatch.length === 0) {
            UI.vacio(zonaMatch, 'Aún no hay vacantes que coincidan con tu perfil.', '🎯');
            return;
        }

        zonaMatch.innerHTML = vacantesConMatch.map(v => {
            const clase = v.match >= 70 ? 'match-alto' : v.match >= 40 ? 'match-medio' : 'match-bajo';
            return `
                <section class="match-card">
                    <section class="info-empresa">
                        <section class="nombre-empresa">🏢 ${UI.escapar(v.empresa ? v.empresa.nombre : 'Empresa')}</section>
                        <section class="cargo">${UI.escapar(v.titulo)}</section>
                        <section class="habilidades-match">
                            ${v.habilidadesRequeridas.map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')}
                        </section>
                    </section>
                    <section>
                        <section class="match-porcentaje ${clase}">${v.match}%<section class="texto-match">de match</section></section>
                    </section>
                </section>`;
        }).join('');
    }

    /* --------------------------------------------------- habilidades */
    function pintarHabilidades(habilidades, completados) {
        if (habilidades.length === 0) {
            zonaHabilidades.innerHTML = '<p class="nota-seguridad">Aún no has registrado habilidades. <a href="../perfil/perfil.html">Agregar</a></p>';
            return;
        }
        const verificadas = completados.length > 0;
        zonaHabilidades.innerHTML = habilidades.map(h =>
            `<span class="habilidad-tag ${verificadas ? 'habilidad-verificada' : ''}">${UI.escapar(h)} ${verificadas ? '✓' : ''}</span>`
        ).join('') + `<br><br><a href="../perfil/perfil.html" class="btn btn-azul btn-sm">Ver mi perfil completo</a>`;
    }

    await cargar();
});
