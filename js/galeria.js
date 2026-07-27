/* ============================================================================
   galeria.js — Mosaico de la galeria generado desde json/galeria.json

   Antes las imagenes estaban escritas en el HTML y varias apuntaban a un
   servidor externo que dejo de servirlas. Ahora las rutas viven en el JSON,
   apuntan a archivos del propio repositorio y cuentan con un respaldo visual
   si alguna no llegara a cargar.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const mosaico = document.getElementById('galeria-mosaico');
    const contenedorFiltros = document.getElementById('filtros-galeria-inner');
    const buscador = document.getElementById('buscar-galeria');
    const contador = document.getElementById('contador-galeria');

    // Iconos de Font Awesome por categoria del JSON.
    const ICONOS = {
        comunidad: 'fa-graduation-cap',
        aprendizaje: 'fa-book-open',
        empresas: 'fa-building',
        eventos: 'fa-calendar-days',
        certificados: 'fa-medal',
        instructores: 'fa-chalkboard-user'
    };

    // Clases del mosaico: el primero es grande, y algunos ocupan mas espacio.
    const TAMANOS = ['galeria-item-grande', '', '', 'galeria-item-ancho', '', 'galeria-item-alto', '', ''];

    let imagenes = [];
    let categoriaActiva = 'todos';

    async function cargar() {
        UI.cargando(mosaico, 'Cargando la galería…');
        try {
            imagenes = await Datos.obtener('galeria');
            pintarFiltros();
            pintar();
        } catch (error) {
            UI.fallo(mosaico, error.message, cargar);
            contenedorFiltros.innerHTML = '';
        }
    }

    /** Genera los botones de filtro con el conteo real de cada categoria. */
    function pintarFiltros() {
        const categorias = [...new Set(imagenes.map(i => i.categoria))];
        const botones = [
            `<a href="#" class="btn-filtro-galeria activo" data-categoria="todos">
                <i class="fa-solid fa-border-all"></i> Todos
                <span class="count">${imagenes.length}</span></a>`
        ].concat(categorias.map(categoria => {
            const total = imagenes.filter(i => i.categoria === categoria).length;
            const nombre = categoria.charAt(0).toUpperCase() + categoria.slice(1);
            return `<a href="#" class="btn-filtro-galeria" data-categoria="${categoria}">
                        <i class="fa-solid ${ICONOS[categoria] || 'fa-image'}"></i> ${nombre}
                        <span class="count">${total}</span></a>`;
        }));

        contenedorFiltros.innerHTML = botones.join('');
    }

    /** Aplica el filtro de categoria junto con la busqueda en tiempo real. */
    function filtrar() {
        const texto = buscador.value.trim().toLowerCase();
        return imagenes.filter(imagen => {
            const pasaCategoria = categoriaActiva === 'todos' || imagen.categoria === categoriaActiva;
            const pasaTexto = texto === '' ||
                `${imagen.titulo} ${imagen.descripcion} ${imagen.categoria}`.toLowerCase().includes(texto);
            return pasaCategoria && pasaTexto;
        });
    }

    function pintar() {
        const visibles = filtrar();

        if (visibles.length === 0) {
            UI.vacio(mosaico, 'No hay imágenes que coincidan con tu búsqueda.', '🖼️');
            contador.textContent = 'Sin resultados.';
            return;
        }

        mosaico.innerHTML = visibles.map((imagen, i) => `
            <article class="galeria-item ${TAMANOS[i % TAMANOS.length]}" data-id="${imagen.id}">
                <img src="${Datos.recurso(imagen.imagen)}" alt="${UI.escapar(imagen.alt)}"
                     loading="lazy" data-respaldo="${imagen.icono}">
                <section class="galeria-overlay">
                    <span class="categoria-tag">
                        <i class="fa-solid ${ICONOS[imagen.categoria] || 'fa-image'}"></i>
                        ${UI.escapar(imagen.categoria)}
                    </span>
                    <h3>${UI.escapar(imagen.titulo)}</h3>
                    <p>${UI.escapar(imagen.descripcion)}</p>
                </section>
            </article>`).join('');

        // Respaldo para cualquier archivo que no cargue.
        mosaico.querySelectorAll('img[data-respaldo]').forEach(img =>
            UI.imagenConRespaldo(img, img.dataset.respaldo, '#334155'));

        contador.textContent = `Mostrando ${visibles.length} de ${imagenes.length} imágenes.`;
    }

    /* --------------------------------------------------------- eventos */
    // Evento delegado sobre los filtros generados dinamicamente.
    contenedorFiltros.addEventListener('click', evento => {
        const boton = evento.target.closest('.btn-filtro-galeria');
        if (!boton) return;
        evento.preventDefault();

        contenedorFiltros.querySelectorAll('.btn-filtro-galeria')
            .forEach(b => b.classList.remove('activo'));
        boton.classList.add('activo');
        categoriaActiva = boton.dataset.categoria;
        pintar();
    });

    buscador.addEventListener('input', pintar);

    // Detalle de la imagen al hacer clic sobre ella.
    mosaico.addEventListener('click', evento => {
        const item = evento.target.closest('.galeria-item');
        if (!item) return;
        const imagen = imagenes.find(i => Number(i.id) === Number(item.dataset.id));
        if (!imagen) return;

        UI.detalle(UI.escapar(imagen.titulo), `
            <img src="${Datos.recurso(imagen.imagen)}" alt="${UI.escapar(imagen.alt)}"
                 style="width:100%;max-height:320px;object-fit:cover;border-radius:10px;margin-bottom:12px">
            <p>${UI.escapar(imagen.descripcion)}</p>
            <p style="color:#64748b;font-size:13px">
                Categoría: ${UI.escapar(imagen.categoria)} · ${UI.fecha(imagen.fecha)}
            </p>`);
    });

    await cargar();
});
