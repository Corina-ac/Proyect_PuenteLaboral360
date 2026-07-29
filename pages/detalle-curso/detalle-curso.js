document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const cursoId = Number(params.get('id'));
    if (!cursoId) {
        document.querySelector('.detalle-container').innerHTML = '<p class="estado-vacio">Curso no encontrado.</p>';
        return;
    }

    UI.cargando(document.getElementById('detalle-hero'), 'Cargando curso…');

    let datos;
    try {
        datos = await Datos.obtenerVarias('cursos', 'categorias', 'instructores', 'matriculas');
    } catch (e) {
        UI.fallo(document.getElementById('detalle-hero'), e.message, () => window.location.reload());
        return;
    }

    const curso = datos.cursos.find(c => Number(c.id) === cursoId);
    if (!curso) {
        document.querySelector('.detalle-container').innerHTML = '<p class="estado-vacio">Curso no encontrado.</p>';
        return;
    }

    const categoria = datos.categorias.find(c => c.id === curso.categoriaId) || null;
    const instructor = datos.instructores.find(i => i.id === curso.instructorId) || null;
    const usuario = Auth.usuarioActual();
    const matricula = usuario ? datos.matriculas.find(m =>
        Number(m.usuarioId) === Number(usuario.id) && Number(m.cursoId) === cursoId) : null;

    document.getElementById('detalle-hero').innerHTML = '';

    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `
        <a href="${Datos.rutaBase()}index.html">Inicio</a>
        <span class="sep">›</span>
        <a href="${Datos.rutaBase()}index.html#cursos">Cursos</a>
        <span class="sep">›</span>
        <span>${UI.escapar(curso.nombre)}</span>`;

    document.getElementById('curso-titulo').textContent = curso.nombre;
    document.getElementById('curso-desc-corta').textContent = curso.descripcion;

    const ratingLine = document.getElementById('detalle-rating');
    ratingLine.innerHTML = `<span class="estrellas">${renderEstrellas(curso.valoracion || 0)}</span>
        <span class="rating-numero">${(curso.valoracion || 0).toFixed(1)}</span>
        <span class="rating-count">(${Math.floor((curso.valoracion || 0) * 12 + Math.random() * 30)} calificaciones)</span>`;

    const metaHero = document.getElementById('detalle-meta-hero');
    const nombreInst = instructor ? `${instructor.nombres} ${instructor.apellidos}` : 'Instructor';
    metaHero.innerHTML = `
        <span class="meta-item"><i class="fa-solid fa-chalkboard-user"></i> ${UI.escapar(nombreInst)}</span>
        <span class="meta-item"><i class="fa-regular fa-clock"></i> ${curso.duracionHoras}h</span>
        <span class="meta-item"><i class="fa-solid fa-signal"></i> ${UI.escapar(curso.nivel)}</span>
        ${categoria ? `<span class="meta-item"><span class="badge-categoria" style="background:${categoria.color || '#64748b'}">${categoria.icono} ${UI.escapar(categoria.nombre)}</span></span>` : ''}`;

    const learningPoints = generarPuntosAprendizaje(curso);
    const gridAprender = document.getElementById('grid-aprender');
    gridAprender.innerHTML = learningPoints.map(p =>
        `<span class="aprender-item"><i class="fa-solid fa-check"></i> ${UI.escapar(p)}</span>`
    ).join('');

    const modulos = generarModulos(curso);
    document.getElementById('info-modulos').textContent = `${modulos.length} módulos • ${curso.duracionHoras}h total`;
    const acordeon = document.getElementById('acordeon-curso');
    acordeon.innerHTML = modulos.map((mod, i) =>
        `<details class="acordeon-item" ${i === 0 ? 'open' : ''}>
            <summary class="acordeon-titulo">
                <span>${UI.escapar(mod.titulo)}</span>
                <span class="acordeon-duracion">${mod.duracion}min</span>
            </summary>
            <ul class="acordeon-contenido">
                ${mod.clases.map(clase => `<li><i class="fa-regular fa-circle-play"></i> ${UI.escapar(clase)}</li>`).join('')}
            </ul>
        </details>`
    ).join('');

    const requisitos = generarRequisitos(curso);
    document.getElementById('lista-requisitos').innerHTML = requisitos.map(r =>
        `<li><i class="fa-solid fa-check-circle"></i> ${UI.escapar(r)}</li>`
    ).join('');

    renderOpiniones(curso);

    const preview = document.getElementById('card-preview');
    preview.innerHTML = `<img src="${Datos.recurso(curso.imagen)}" alt="${UI.escapar(curso.nombre)}" class="sidebar-img" loading="lazy" data-respaldo="${curso.icono}">`;
    UI.imagenConRespaldo(preview.querySelector('img'), curso.icono);

    const precioSection = document.getElementById('card-precio');
    const esGratis = !curso.precio || curso.precio === 0;
    precioSection.innerHTML = esGratis
        ? '<span class="precio-gratis precio-grande">Gratis</span>'
        : `<span class="precio-valor">$${Number(curso.precio).toFixed(2)}</span>`;

    const btn = document.getElementById('btn-inscribirse');
    if (matricula) {
        const textoBtn = matricula.progreso === 0 ? 'Comenzar curso' : 'Continuar curso';
        btn.innerHTML = `<i class="fa-solid fa-play"></i> ${textoBtn}`;
        btn.className = 'btn btn-verde btn-lg btn-full';
        btn.addEventListener('click', () => avanzarProgreso(matricula.id));
    } else if (curso.estado === 'agotado') {
        btn.textContent = 'Curso agotado';
        btn.disabled = true;
        btn.className = 'btn btn-gris btn-lg btn-full';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-shopping-cart"></i> Inscribirse ahora';
        btn.addEventListener('click', () => inscribir(curso));
    }

    document.getElementById('card-detalles').innerHTML = `
        <ul class="sidebar-detalles-lista">
            <li><i class="fa-regular fa-clock"></i> Duración: ${curso.duracionHoras}h</li>
            <li><i class="fa-solid fa-signal"></i> Nivel: ${UI.escapar(curso.nivel)}</li>
            <li><i class="fa-solid fa-laptop"></i> Modalidad: ${UI.escapar(curso.modalidad)}</li>
            ${categoria ? `<li><i class="fa-solid fa-tag"></i> Categoría: ${UI.escapar(categoria.nombre)}</li>` : ''}
            <li><i class="fa-solid fa-users"></i> Cupos: ${curso.cupos || '—'}</li>
        </ul>`;

    document.getElementById('card-cert').innerHTML = curso.certificado
        ? '<p><i class="fa-solid fa-certificate" style="color:#f59e0b"></i> Certificado al completar</p>'
        : '';

    function renderEstrellas(valor) {
        const completa = Math.floor(valor);
        const media = valor % 1 >= 0.3;
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i < completa) html += '<i class="fa-solid fa-star"></i>';
            else if (i === completa && media) html += '<i class="fa-solid fa-star-half-stroke"></i>';
            else html += '<i class="fa-regular fa-star"></i>';
        }
        return html;
    }

    function generarPuntosAprendizaje(curso) {
        const domTexto = curso.categoriaId === 1 ? 'desarrollo frontend'
            : curso.categoriaId === 2 ? 'programación backend'
            : curso.categoriaId === 3 ? 'gestión de bases de datos'
            : curso.categoriaId === 4 ? 'DevOps y automatización'
            : curso.categoriaId === 5 ? 'análisis de datos'
            : curso.categoriaId === 6 ? 'diseño de experiencia de usuario'
            : curso.categoriaId === 7 ? 'comunicación profesional'
            : 'ciberseguridad';
        const base = [
            `Comprender los fundamentos de ${curso.nombre}`,
            `Aplicar técnicas prácticas en proyectos reales`,
            `Desarrollar habilidades en ${domTexto}`,
            `Resolver problemas del mundo real con ${curso.nombre}`,
            `Dominar las herramientas y conceptos clave`,
            `Construir proyectos desde cero`,
        ];
        if (curso.nivel === 'Avanzado') {
            base.push('Optimizar el rendimiento y la escalabilidad');
        }
        return base;
    }

    function generarModulos(curso) {
        const numModulos = Math.max(3, Math.min(6, Math.floor(curso.duracionHoras / 6)));
        const temas = [
            ['Introducción y conceptos básicos', 'Configuración del entorno de trabajo', 'Primeros pasos prácticos'],
            ['Fundamentos esenciales', 'Conceptos clave y mejores prácticas', 'Ejercicios guiados'],
            ['Desarrollo de habilidades prácticas', 'Proyecto integrador - Parte 1', 'Técnicas avanzadas'],
            ['Aplicaciones del mundo real', 'Proyecto integrador - Parte 2', 'Optimización y buenas prácticas'],
            ['Evaluación y certificación', 'Repaso general', 'Evaluación final del curso'],
        ];
        const mods = [];
        for (let i = 0; i < numModulos; i++) {
            const idx = i % temas.length;
            mods.push({
                titulo: `Módulo ${i + 1}: ${temas[idx][0]}`,
                duracion: Math.floor(curso.duracionHoras * 60 / numModulos),
                clases: [temas[idx][1], temas[idx][2], `${curso.nombre} en acción`, `Ejercicio práctico ${i + 1}`]
            });
        }
        return mods;
    }

    function generarRequisitos(curso) {
        const reqs = ['Conexión a internet estable', 'Ganas de aprender y practicar'];
        if (curso.nivel === 'Basico') {
            reqs.push('No se requieren conocimientos previos');
            reqs.push('Computadora con navegador web moderno');
        } else if (curso.nivel === 'Intermedio') {
            reqs.push('Conocimientos básicos del área');
            reqs.push('Experiencia previa con herramientas similares');
        } else {
            reqs.push('Experiencia comprobable en el área');
            reqs.push('Conocimientos sólidos de fundamentos');
            reqs.push('Capacidad para trabajar en proyectos complejos');
        }
        return reqs;
    }

    function renderOpiniones(curso) {
        const valoracion = curso.valoracion || 0;
        const totalReviews = Math.floor(valoracion * 12 + Math.random() * 30) || 1;
        const dist = [
            Math.round(totalReviews * 0.6),
            Math.round(totalReviews * 0.25),
            Math.round(totalReviews * 0.1),
            Math.round(totalReviews * 0.03),
            Math.round(totalReviews * 0.02)
        ];

        const resumen = document.getElementById('resumen-opiniones');
        resumen.innerHTML = `
            <div class="resumen-score">
                <span class="score-num">${valoracion.toFixed(1)}</span>
                <span class="estrellas-grandes">${renderEstrellas(valoracion)}</span>
                <span class="score-total">${totalReviews} opiniones</span>
            </div>
            <div class="resumen-barras">
                ${[5, 4, 3, 2, 1].map((est, i) => `
                    <div class="barra-estrellas-row">
                        <span class="barra-label">${est} <i class="fa-solid fa-star"></i></span>
                        <div class="barra-fondo"><div class="barra-lleno" style="width:${(dist[i] / totalReviews) * 100}%"></div></div>
                        <span class="barra-num">${dist[i]}</span>
                    </div>`).join('')}
            </div>`;

        const nombres = ['Carlos M.', 'Ana G.', 'Luis R.', 'María F.', 'Pedro S.', 'Diana L.', 'Jorge P.', 'Sofía A.'];
        const comentarios = [
            'Excelente curso, muy bien explicado. Lo recomendaría a cualquiera que quiera aprender.',
            'Buen contenido, aunque algunos temas podrían profundizarse más.',
            'Me encantó la forma de enseñar. Muy práctico y directo al grano.',
            'Los ejercicios son muy útiles para afianzar los conocimientos.',
            'Gran relación calidad-precio. Aprendí muchísimo en poco tiempo.',
        ];
        const lista = document.getElementById('lista-opiniones');
        const numOpiniones = Math.min(4, totalReviews);
        lista.innerHTML = Array.from({ length: numOpiniones }, () => {
            const nom = nombres[Math.floor(Math.random() * nombres.length)];
            const com = comentarios[Math.floor(Math.random() * comentarios.length)];
            const est = (3 + Math.random() * 2).toFixed(1);
            return `
                <div class="opinion-item">
                    <div class="opinion-header">
                        <div class="opinion-avatar">${nom[0]}</div>
                        <div>
                            <strong>${UI.escapar(nom)}</strong>
                            <span class="opinion-estrellas">${renderEstrellas(Number(est))} ${est}</span>
                        </div>
                    </div>
                    <p>${UI.escapar(com)}</p>
                </div>`;
        }).join('');
    }

    async function inscribir(curso) {
        if (!usuario) {
            Auth.irALogin('Debes iniciar sesión para inscribirte.');
            return;
        }
        if (usuario.rol !== 'estudiante') {
            UI.toast('Solo los estudiantes pueden inscribirse en cursos.', 'error');
            return;
        }
        const yaInscrito = Datos.cache('matriculas').some(m =>
            Number(m.usuarioId) === Number(usuario.id) && Number(m.cursoId) === Number(curso.id));
        if (yaInscrito) {
            UI.toast('Ya estás inscrito en este curso.', 'aviso');
            return;
        }
        const confirmar = await UI.confirmar('Confirmar inscripción',
            `¿Deseas inscribirte en "${curso.nombre}" por ${UI.precio(curso.precio)}?`, 'Sí, inscribirme');
        if (!confirmar) return;

        Datos.agregar('matriculas', {
            usuarioId: usuario.id,
            cursoId: curso.id,
            progreso: 0,
            estado: 'inscrito',
            calificacion: null,
            certificadoEmitido: false,
            fechaInscripcion: new Date().toISOString().slice(0, 10)
        });

        try {
            const instructor = Datos.cache('instructores').find(i => i.id === curso.instructorId);
            if (instructor) {
                Datos.agregar('notificaciones', {
                    rol: 'instructor', tipo: 'info', icono: '👤',
                    titulo: 'Nuevo estudiante inscrito',
                    descripcion: `${usuario.nombres} ${usuario.apellidos} se inscribió en tu curso "${curso.nombre}".`,
                    leida: false, fecha: new Date().toISOString().slice(0, 10),
                    fuente: 'Sistema de Inscripción'
                });
            }
        } catch (e) { /* opcional */ }

        UI.toast('Inscripción exitosa. ¡Bienvenido al curso!', 'exito');
        setTimeout(() => window.location.reload(), 1000);
    }

    async function avanzarProgreso(matriculaId) {
        await Datos.obtener('matriculas');
        const mat = Datos.cache('matriculas').find(m => m.id === matriculaId);
        if (!mat) return;
        const incremento = Math.floor(Math.random() * 25) + 10;
        const nuevoProgreso = Math.min(mat.progreso + incremento, 100);
        const nuevoEstado = nuevoProgreso >= 100 ? 'completado' : 'en progreso';
        Datos.actualizar('matriculas', matriculaId, { progreso: nuevoProgreso, estado: nuevoEstado });
        if (nuevoProgreso >= 100) {
            UI.toast('¡Felicidades! Completaste el curso.', 'exito');
        } else {
            UI.toast(`Progreso actualizado: ${nuevoProgreso}%`, 'exito');
        }
        setTimeout(() => window.location.reload(), 1000);
    }
});
