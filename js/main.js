/* ============================================================================
   main.js — Pagina de inicio

   Las cifras y los cursos destacados dejan de estar escritos en el HTML: se
   calculan sobre los archivos JSON con map(), filter(), reduce() y sort().
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const zonaStats = document.getElementById('stats-inicio');
    const zonaCursos = document.getElementById('cursos-destacados');
    if (!zonaStats || !zonaCursos) return;

    UI.cargando(zonaCursos, 'Cargando los cursos destacados…');

    try {
        const datos = await Datos.obtenerVarias(
            'cursos', 'categorias', 'instructores', 'usuarios', 'empresas', 'vacantes'
        );

        /* ------------------------------------------------------- cifras */
        const estudiantes = datos.usuarios.filter(u => u.rol === 'estudiante').length;
        const instructoresVerificados = datos.instructores.filter(i => i.verificado).length;
        const vacantesAbiertas = datos.vacantes.filter(v => v.estado === 'abierta').length;

        const cifras = [
            ['fa-users', estudiantes, 'Estudiantes registrados'],
            ['fa-chalkboard-user', instructoresVerificados, 'Instructores verificados'],
            ['fa-building', datos.empresas.length, 'Empresas registradas'],
            ['fa-briefcase', vacantesAbiertas, 'Vacantes abiertas'],
            ['fa-book', datos.cursos.length, 'Cursos publicados']
        ];

        zonaStats.innerHTML = cifras.map(([icono, valor, texto]) => `
            <section class="stat-inicio">
                <i class="fa-solid ${icono} icono-estadistica" aria-hidden="true"></i>
                <p class="num">${valor}</p>
                <p class="txt">${texto}</p>
            </section>`).join('');

        /* --------------------------------------------- cursos destacados */
        // Los seis cursos mejor valorados que siguen disponibles.
        const destacados = datos.cursos
            .filter(curso => curso.estado === 'disponible')
            .sort((a, b) => b.valoracion - a.valoracion)
            .slice(0, 6);

        if (destacados.length === 0) {
            UI.vacio(zonaCursos, 'Todavía no hay cursos publicados.', '📚');
            return;
        }

        zonaCursos.innerHTML = destacados.map(curso => {
            // La categoria se resuelve por identificador desde categorias.json.
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
                        <a href="pages/cursos/cursos.html" class="btn btn-azul btn-xs">Ver en el catálogo</a>
                    </section>
                </section>
            </article>`;
        }).join('');

        zonaCursos.querySelectorAll('img[data-respaldo]').forEach(img =>
            UI.imagenConRespaldo(img, img.dataset.respaldo));

    } catch (error) {
        // La pagina de inicio sigue siendo legible aunque falle la carga.
        UI.fallo(zonaCursos, error.message, () => window.location.reload());
        zonaStats.innerHTML =
            '<p class="estado-error">No se pudieron calcular las estadísticas del sistema.</p>';
    }
});
