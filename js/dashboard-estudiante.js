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
    const zonaSugerenciasIA = document.getElementById('sugerencias-ia');
    const zonaMeta = document.getElementById('meta-profesional');
    const zonaCursosRecomendados = document.getElementById('cursos-recomendados');
    const zonaCertificados = document.getElementById('certificados-estudiante');

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
            pintarCertificados(certs);
            pintarSugerenciasIA(usuario);
            pintarMeta(usuario);
            pintarCursosRecomendados(usuario);
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

    /* --------------------------------------------------- certificados */
    function pintarCertificados(certificados) {
        if (certificados.length === 0) {
            UI.vacio(zonaCertificados, 'Aun no tienes certificados. Completa un curso para obtener uno.', '📜');
            return;
        }
        const cursos = Datos.cache('cursos');
        zonaCertificados.innerHTML = certificados.map(m => {
            const curso = cursos.find(c => c.id === m.cursoId);
            const nombreCurso = curso ? curso.nombre : 'Curso';
            return `
                <section class="match-card" style="border-left: 4px solid #16a34a;">
                    <section class="info-empresa">
                        <section class="nombre-empresa">📜 ${UI.escapar(nombreCurso)}</section>
                        <section class="cargo">Completado el ${UI.fecha(m.fechaInscripcion)}</section>
                        <section class="detalle-candidato">Calificacion: ${m.calificacion || 'Aprobado'}</section>
                    </section>
                    <section>
                        <button type="button" class="btn btn-verde btn-sm btn-ver-certificado"
                            data-nombre="${UI.escapar(nombreCurso)}"
                            data-estudiante="${UI.escapar(usuario.nombres + ' ' + usuario.apellidos)}"
                            data-fecha="${UI.fecha(m.fechaInscripcion)}"
                            data-calificacion="${m.calificacion || 'Aprobado'}">Ver certificado</button>
                    </section>
                </section>`;
        }).join('');

        zonaCertificados.querySelectorAll('.btn-ver-certificado').forEach(boton => {
            boton.addEventListener('click', () => {
                mostrarCertificado(boton.dataset.nombre, boton.dataset.estudiante, boton.dataset.fecha, boton.dataset.calificacion);
            });
        });
    }

    function mostrarCertificado(nombreCurso, nombreEstudiante, fecha, calificacion) {
        Swal.fire({
            title: '📜 Certificado de Finalización',
            html: `
                <section style="text-align:center; padding: 20px; border: 3px solid #16a34a; border-radius: 12px; background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
                    <p style="font-size: 14px; color: #16a34a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px;">PuenteLaboral360</p>
                    <h2 style="font-size: 20px; color: #15803d; margin: 10px 0;">Certificado de Finalización</h2>
                    <p style="font-size: 14px; color: #333;">Se certifica que</p>
                    <p style="font-size: 22px; font-weight: bold; color: #1a73e8; margin: 8px 0;">${nombreEstudiante}</p>
                    <p style="font-size: 14px; color: #333;">ha completado satisfactoriamente el curso</p>
                    <p style="font-size: 18px; font-weight: bold; color: #333; margin: 8px 0;">${nombreCurso}</p>
                    <p style="font-size: 13px; color: #666;">Calificación: <strong>${calificacion}</strong></p>
                    <p style="font-size: 13px; color: #666;">Fecha: ${fecha}</p>
                    <hr style="border: 1px solid #16a34a; margin: 15px 0;">
                    <p style="font-size: 12px; color: #888;">Este certificado es válido para fines de postulación laboral.</p>
                </section>`,
            width: 600,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#16a34a'
        });
    }

    /* --------------------------------------------------- sugerencias IA */
    async function pintarSugerenciasIA(estudiante) {
        UI.cargando(zonaSugerenciasIA, 'La IA esta analizando tu perfil para sugerirte empleos…');
        try {
            const sugerencias = await Api.sugerirTrabajos();
            if (!sugerencias || sugerencias.length === 0) {
                UI.vacio(zonaSugerenciasIA, 'No se pudieron generar sugerencias en este momento. Intenta mas tarde.', '🤖');
                return;
            }
            zonaSugerenciasIA.innerHTML = sugerencias.map(s => `
                <section class="match-card" data-cargo="${UI.escapar(s.cargo)}" data-empresa="${UI.escapar(s.empresa)}">
                    <section class="info-empresa">
                        <section class="cargo">${UI.escapar(s.cargo)}</section>
                        <section class="nombre-empresa">🏢 ${UI.escapar(s.empresa)}</section>
                        <p class="descripcion-vacante">${UI.escapar(s.descripcion)}</p>
                        <section class="habilidades-match">
                            ${(s.habilidadesRequeridas || []).map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')}
                        </section>
                    </section>
                    <section>
                        <button class="btn btn-azul btn-aplicar" type="button">Aplicar</button>
                    </section>
                </section>`).join('');

            zonaSugerenciasIA.querySelectorAll('.btn-aplicar').forEach(boton => {
                boton.addEventListener('click', async () => {
                    const card = boton.closest('.match-card');
                    const cargo = card.dataset.cargo;
                    const empresa = card.dataset.empresa;
                    await aplicarTrabajo(estudiante, cargo, empresa, boton);
                });
            });
        } catch (error) {
            UI.fallo(zonaSugerenciasIA, 'Error al obtener sugerencias de IA.', () => pintarSugerenciasIA(estudiante));
        }
    }

    /* --------------------------------------------------- aplicar trabajo */
    async function aplicarTrabajo(estudiante, cargo, empresa, boton) {
        const confirmado = await UI.confirmar(
            '¿Aplicar a este empleo?',
            `¿Deseas aplicar al puesto de "${cargo}" en ${empresa}?`,
            'Si, aplicar'
        );
        if (!confirmado) return;

        boton.disabled = true;
        boton.textContent = 'Enviando…';

        try {
            await Datos.obtener('notificaciones');

            const nombreEstudiante = `${estudiante.nombres} ${estudiante.apellidos}`;
            const ahora = new Date().toISOString();

            Datos.agregar('notificaciones', {
                id: Date.now(),
                rol: 'estudiante',
                tipo: 'info',
                icono: '📨',
                titulo: `Aplicaste a ${cargo}`,
                descripcion: `Tu perfil ha sido enviado a la empresa ${empresa} para revisión.`,
                leida: false,
                fecha: ahora,
                fuente: 'Sistema de Empleo'
            });

            Datos.agregar('notificaciones', {
                id: Date.now() + 1,
                rol: 'empresa',
                tipo: 'info',
                icono: '👤',
                titulo: `Nuevo postulante: ${nombreEstudiante}`,
                descripcion: `${nombreEstudiante} aplicó al puesto de ${cargo}. Revisa su perfil.`,
                leida: false,
                fecha: ahora,
                fuente: 'Sistema de Empleo'
            });

            boton.textContent = '✓ Enviado';
            UI.toast('Aplicación enviada correctamente');
        } catch (error) {
            boton.disabled = false;
            boton.textContent = 'Aplicar';
            UI.toast('Error al enviar la aplicación', 'error');
        }
    }

    /* --------------------------------------------------- meta profesional */
    async function pintarMeta(estudiante) {
        if (!estudiante.objetivo) {
            zonaMeta.innerHTML = `
                <section class="estado-vacio">
                    <p class="estado-icono" aria-hidden="true">🎯</p>
                    <p>Aun no has definido tu meta profesional.</p>
                    <a href="../perfil/perfil.html" class="btn btn-azul btn-sm" style="margin-top:12px">Definir mi objetivo</a>
                </section>`;
            return;
        }

        zonaMeta.innerHTML = `<p><strong>Mi objetivo:</strong> ${UI.escapar(estudiante.objetivo)}</p>`;
        UI.cargando(zonaMeta, 'La IA esta analizando tu objetivo para sugerirte habilidades…');
        try {
            const habilidades = await Api.sugerirHabilidades();
            if (habilidades && habilidades.length > 0) {
                zonaMeta.innerHTML = `
                    <p><strong>Mi objetivo:</strong> ${UI.escapar(estudiante.objetivo)}</p>
                    <p style="margin-top:10px"><strong>Habilidades sugeridas por IA para alcanzarlo:</strong></p>
                    <section class="habilidades" style="margin-top:8px">
                        ${habilidades.map(h => `<span class="habilidad-tag">${UI.escapar(h)}</span>`).join('')}
                    </section>`;
            } else {
                zonaMeta.innerHTML = `<p><strong>Mi objetivo:</strong> ${UI.escapar(estudiante.objetivo)}</p>`;
            }
        } catch (error) {
            zonaMeta.innerHTML = `<p><strong>Mi objetivo:</strong> ${UI.escapar(estudiante.objetivo)}</p>`;
        }
    }

    /* --------------------------------------------------- cursos recomendados */
    function pintarCursosRecomendados(estudiante) {
        const cursos = (Datos.cache('cursos') || []).filter(c => c.estado === 'disponible');
        const categorias = Datos.cache('categorias') || [];
        const habilidades = (estudiante.habilidades || []).map(h => h.toLowerCase());
        const objetivo = (estudiante.objetivo || '').toLowerCase();
        const misMatriculas = Datos.matriculasDe(estudiante.id).map(m => m.cursoId);

        const cursosFiltrados = cursos
            .filter(c => !misMatriculas.includes(c.id))
            .map(c => {
                const cat = categorias.find(ca => ca.id === c.categoriaId);
                const nombreCat = cat ? cat.nombre.toLowerCase() : '';
                const nombreCurso = c.nombre.toLowerCase();
                let relevancia = 0;

                habilidades.forEach(h => {
                    if (nombreCurso.includes(h) || nombreCat.includes(h)) relevancia += 30;
                });

                if (objetivo) {
                    const palabras = objetivo.split(/\s+/).filter(w => w.length > 3);
                    palabras.forEach(p => {
                        if (nombreCurso.includes(p) || nombreCat.includes(p)) relevancia += 20;
                    });
                }

                if (c.nivel === estudiante.nivel) relevancia += 10;

                return { ...c, cat: cat ? cat.nombre : 'General', relevancia };
            })
            .filter(c => c.relevancia > 0)
            .sort((a, b) => b.relevancia - a.relevancia)
            .slice(0, 5);

        if (cursosFiltrados.length === 0) {
            UI.vacio(zonaCursosRecomendados, 'No se encontraron cursos recomendados para tu perfil actual.', '📚');
            return;
        }

        zonaCursosRecomendados.innerHTML = cursosFiltrados.map(c => `
            <section class="match-card">
                <section class="info-empresa">
                    <section class="cargo">${UI.escapar(c.nombre)}</section>
                    <section class="nombre-empresa">📂 ${UI.escapar(c.cat)}</section>
                    <section>
                        <span class="habilidad-tag">${UI.escapar(c.nivel)}</span>
                        <span class="habilidad-tag">${c.valoracion ? '⭐ ' + c.valoracion : ''}</span>
                    </section>
                </section>
                <section>
                    <a href="../cursos/cursos.html" class="btn btn-azul btn-sm">Ver curso</a>
                </section>
            </section>`).join('');
    }

    await cargar();
});
