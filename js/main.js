/* ============================================================================
   main.js — Pagina de inicio

   Los cursos destacados se calculan sobre los archivos JSON.
   Incluye filtros por categorias y tarjetas estilo Udemy.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const zonaCursos = document.getElementById('cursos-destacados');
    const zonaCategorias = document.getElementById('categorias-filtro');
    if (!zonaCursos) return;

    UI.cargando(zonaCursos, 'Cargando los cursos destacados…');

    let datos;
    try {
        datos = await Datos.obtenerVarias('cursos', 'categorias', 'instructores');
    } catch (error) {
        UI.fallo(zonaCursos, error.message, () => window.location.reload());
        return;
    }

    const todosCursos = datos.cursos.filter(c => c.estado === 'disponible');
    let cursosFiltrados = [...todosCursos];
    let categoriaActiva = '';

    /* ── Pintar categorias */
    if (zonaCategorias && datos.categorias.length > 0) {
        zonaCategorias.innerHTML =
            `<button type="button" class="btn-cat active" data-cat="">Todos</button>` +
            datos.categorias.map(cat =>
                `<button type="button" class="btn-cat" data-cat="${cat.id}">${cat.icono || ''} ${UI.escapar(cat.nombre)}</button>`
            ).join('');

        zonaCategorias.addEventListener('click', e => {
            const btn = e.target.closest('.btn-cat');
            if (!btn) return;
            zonaCategorias.querySelectorAll('.btn-cat').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            categoriaActiva = btn.dataset.cat;
            filtrarYRenderizar();
        });
    }

    function filtrarYRenderizar() {
        cursosFiltrados = categoriaActiva
            ? todosCursos.filter(c => Number(c.categoriaId) === Number(categoriaActiva))
            : [...todosCursos];

        renderizarCursos(cursosFiltrados.slice(0, 8));
    }

    /* ── Renderizar tarjetas estilo Udemy */
    function renderizarCursos(cursos) {
        if (cursos.length === 0) {
            UI.vacio(zonaCursos, 'No hay cursos en esta categoria.', '📚');
            return;
        }

        zonaCursos.innerHTML = cursos.map(curso => {
            const categoria = datos.categorias.find(c => c.id === curso.categoriaId);
            const instructor = datos.instructores.find(i => i.id === curso.instructorId);
            const nombreInst = instructor ? `${instructor.nombres} ${instructor.apellidos || ''}`.trim() : 'Instructor';
            const estrellas = renderizarEstrellas(curso.valoracion || 0);
            const totalReviews = Math.floor((curso.valoracion || 0) * 12 + Math.random() * 30);
            const esGratis = !curso.precio || curso.precio === 0;
            const duracion = curso.duracionHoras ? `${curso.duracionHoras}h` : '';

            return `
            <article class="tarjeta-item tarjeta-udemy">
                <section class="tarjeta-img-wrapper">
                    <img src="${Datos.recurso(curso.imagen)}" alt="${UI.escapar(curso.nombre)}"
                         loading="lazy" data-respaldo="${curso.icono}">
                    ${curso.certificado ? '<span class="badge-cert"><i class="fa-solid fa-certificate"></i> Certificado</span>' : ''}
                </section>
                <section class="tarjeta-cuerpo">
                    <h3 class="tarjeta-titulo">${UI.escapar(curso.nombre)}</h3>
                    <p class="tarjeta-instructor">${UI.escapar(nombreInst)}</p>
                    <section class="tarjeta-rating">
                        <span class="rating-numero">${(curso.valoracion || 0).toFixed(1)}</span>
                        <span class="estrellas">${estrellas}</span>
                        <span class="num-reviews">(${totalReviews})</span>
                    </section>
                    <section class="tarjeta-meta-udemy">
                        ${duracion ? `<span><i class="fa-regular fa-clock"></i> ${duracion}</span>` : ''}
                        ${curso.nivel ? `<span><i class="fa-solid fa-signal"></i> ${UI.escapar(curso.nivel)}</span>` : ''}
                    </section>
                    <section class="tarjeta-footer-udemy">
                        <span class="etiqueta-precio">${esGratis ? '<span class="precio-gratis">Gratis</span>' : UI.precio(curso.precio)}</span>
                        <a href="pages/detalle-curso/detalle-curso.html?id=${curso.id}" class="btn btn-azul btn-xs">Ver curso</a>
                    </section>
                </section>
            </article>`;
        }).join('');

        zonaCursos.querySelectorAll('img[data-respaldo]').forEach(img =>
            UI.imagenConRespaldo(img, img.dataset.respaldo));
    }

    function renderizarEstrellas(valor) {
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

    renderizarCursos(todosCursos.slice(0, 8));
});
