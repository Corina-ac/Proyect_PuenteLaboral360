/* ============================================================================
   main.js — Pagina de inicio

   Los cursos destacados se calculan sobre los archivos JSON.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const zonaCursos = document.getElementById('cursos-destacados');
    if (!zonaCursos) return;

    UI.cargando(zonaCursos, 'Cargando los cursos destacados…');

    try {
        const datos = await Datos.obtenerVarias(
            'cursos', 'categorias', 'instructores'
        );

        /* --------------------------------------------- cursos destacados */
        const destacados = datos.cursos
            .filter(curso => curso.estado === 'disponible')
            .sort((a, b) => b.valoracion - a.valoracion)
            .slice(0, 4);

        if (destacados.length === 0) {
            UI.vacio(zonaCursos, 'Todavia no hay cursos publicados.', '📚');
            return;
        }

        zonaCursos.innerHTML = destacados.map(curso => {
            const categoria = datos.categorias.find(c => c.id === curso.categoriaId);
            const instructor = datos.instructores.find(i => i.id === curso.instructorId);

            return `
            <article class="tarjeta-item">
                <img src="${Datos.recurso(curso.imagen)}" alt="Imagen del curso ${UI.escapar(curso.nombre)}"
                     loading="lazy" data-respaldo="${curso.icono}">
                <section class="tarjeta-cuerpo">
                    <h3 class="tarjeta-titulo">${UI.escapar(curso.nombre)}</h3>
                    <p class="tarjeta-desc">${UI.escapar(curso.descripcion)}</p>
                    <section class="tarjeta-meta">
                        <span>${categoria ? categoria.icono + ' ' + UI.escapar(categoria.nombre) : ''}</span>
                        <span>⭐ ${curso.valoracion}</span>
                        <span>👨‍🏫 ${instructor ? UI.escapar(instructor.nombres) : ''}</span>
                    </section>
                    <p class="etiqueta-precio">${UI.precio(curso.precio)}</p>
                    <section class="tarjeta-acciones">
                        <a href="pages/cursos/cursos.html" class="btn btn-azul btn-xs">Ver en el catalogo</a>
                    </section>
                </section>
            </article>`;
        }).join('');

        zonaCursos.querySelectorAll('img[data-respaldo]').forEach(img =>
            UI.imagenConRespaldo(img, img.dataset.respaldo));

    } catch (error) {
        UI.fallo(zonaCursos, error.message, () => window.location.reload());
    }
});
