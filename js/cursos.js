/* ============================================================================
   cursos.js — Catalogo de cursos

   Reune las funcionalidades obligatorias del tercer parcial:
   carga con fetch, renderizado dinamico, busqueda en tiempo real, dos filtros,
   ordenamiento, detalle, alta, edicion, baja, restablecimiento, indicadores,
   grafico con Chart.js y consumo de una API de clima.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    /* --------------------------------------------------- control de acceso */
    // El catalogo es privado: solo entra quien tiene sesion iniciada.
    const usuario = Auth.proteger(['estudiante', 'instructor', 'empresa', 'admin']);
    if (!usuario) return;

    UI.pintarPerfilLateral(usuario);
    document.getElementById('enlace-inicio').href = Auth.panelDe(usuario.rol);

    // Solo instructores y administradores gestionan el catalogo.
    const puedeGestionar = ['instructor', 'admin'].includes(usuario.rol);

    /* ---------------------------------------------------------- elementos */
    const grid = document.getElementById('grid-cursos');
    const buscador = document.getElementById('buscador');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroNivel = document.getElementById('filtro-nivel');
    const selectOrden = document.getElementById('orden');
    const botonLimpiar = document.getElementById('btn-limpiar');
    const botonNuevo = document.getElementById('btn-nuevo');
    const botonRestablecer = document.getElementById('btn-restablecer');
    const contador = document.getElementById('contador-resultados');
    const panelIndicadores = document.getElementById('panel-indicadores');
    const selectorCiudades = document.getElementById('selector-ciudades');
    const panelClima = document.getElementById('panel-clima');
    const encabezado = document.querySelector('.encabezado-seccion');

    if (!puedeGestionar) botonNuevo.classList.add('oculto');

    let botonRecomendar = null;
    if (usuario.rol === 'estudiante' && encabezado) {
        botonRecomendar = document.createElement('button');
        botonRecomendar.type = 'button';
        botonRecomendar.className = 'btn btn-grok btn-sm';
        botonRecomendar.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Recomendar para mí';
        encabezado.appendChild(botonRecomendar);
    }

    let cursos = [];
    let categorias = [];
    let instructores = [];
    let grafico = null;

    /* ------------------------------------------------------ carga inicial */
    async function cargar() {
        UI.cargando(grid, 'Cargando el catálogo de cursos…');
        try {
            const datos = await Datos.obtenerVarias('cursos', 'categorias', 'instructores');
            cursos = datos.cursos;
            categorias = datos.categorias;
            instructores = datos.instructores;

            pintarOpcionesCategoria();
            aplicarVista();
            UI.toast(`${cursos.length} cursos cargados.`, 'exito');
        } catch (error) {
            UI.fallo(grid, error.message, cargar);
            contador.textContent = '';
            UI.toast('No se pudo cargar el catálogo.', 'error');
        }
    }

    function pintarOpcionesCategoria() {
        filtroCategoria.innerHTML = '<option value="">Todas</option>' +
            categorias.map(c => `<option value="${c.id}">${c.icono} ${UI.escapar(c.nombre)}</option>`).join('');
    }

    /* -------------------------------------------- busqueda, filtro y orden */
    /** Devuelve los cursos que cumplen la busqueda y los filtros activos. */
    function filtrar() {
        const texto = buscador.value.trim().toLowerCase();
        const idCategoria = filtroCategoria.value;
        const nivel = filtroNivel.value;

        return cursos.filter(curso => {
            const categoria = categorias.find(c => c.id === curso.categoriaId);
            const instructor = instructores.find(i => i.id === curso.instructorId);

            // La busqueda recorre varios campos, incluidos los relacionados.
            const coincide = texto === '' || [
                curso.nombre,
                curso.descripcion,
                curso.nivel,
                curso.modalidad,
                categoria ? categoria.nombre : '',
                instructor ? `${instructor.nombres} ${instructor.apellidos}` : ''
            ].join(' ').toLowerCase().includes(texto);

            const pasaCategoria = idCategoria === '' || Number(curso.categoriaId) === Number(idCategoria);
            const pasaNivel = nivel === '' || curso.nivel === nivel;

            return coincide && pasaCategoria && pasaNivel;
        });
    }

    /** Ordena una lista segun el criterio elegido. */
    function ordenar(lista) {
        const copia = [...lista];
        switch (selectOrden.value) {
            case 'nombre-asc': return copia.sort((a, b) => a.nombre.localeCompare(b.nombre));
            case 'nombre-desc': return copia.sort((a, b) => b.nombre.localeCompare(a.nombre));
            case 'precio-asc': return copia.sort((a, b) => a.precio - b.precio);
            case 'precio-desc': return copia.sort((a, b) => b.precio - a.precio);
            case 'valoracion-desc': return copia.sort((a, b) => b.valoracion - a.valoracion);
            case 'fecha-desc': return copia.sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
            case 'fecha-asc': return copia.sort((a, b) => a.fechaRegistro.localeCompare(b.fechaRegistro));
            default: return copia;
        }
    }

    /* ----------------------------------------------------------- render */
    function tarjetaCurso(curso) {
        const categoria = categorias.find(c => c.id === curso.categoriaId);
        const instructor = instructores.find(i => i.id === curso.instructorId);
        const agotado = curso.estado === 'agotado';
        const esRecomendado = idsRecomendados.includes(Number(curso.id));

        return `
        <article class="tarjeta-item${esRecomendado ? ' tarjeta-recomendada' : ''}" data-id="${curso.id}">
            ${esRecomendado ? '<span class="badge-grok"><i class="fa-solid fa-star"></i> Recomendado</span>' : ''}
            <img src="${Datos.recurso(curso.imagen)}" alt="Imagen del curso ${UI.escapar(curso.nombre)}"
                 loading="lazy" data-respaldo="${curso.icono}">
            <div class="tarjeta-cuerpo">
                <span class="chip ${agotado ? 'chip-agotado' : 'chip-disponible'}">
                    ${agotado ? 'Agotado' : 'Disponible'}
                </span>
                <h3 class="tarjeta-titulo">${UI.escapar(curso.nombre)}</h3>
                <p class="tarjeta-desc">${UI.escapar(curso.descripcion)}</p>
                <div class="tarjeta-meta">
                    <span>${categoria ? categoria.icono + ' ' + UI.escapar(categoria.nombre) : 'Sin categoría'}</span>
                    <span>👨‍🏫 ${instructor ? UI.escapar(instructor.nombres + ' ' + instructor.apellidos) : 'Por asignar'}</span>
                    <span>⭐ ${curso.valoracion}</span>
                    <span>⏱️ ${curso.duracionHoras} h</span>
                    <span>📶 ${UI.escapar(curso.nivel)}</span>
                </div>
                <p class="etiqueta-precio">${UI.precio(curso.precio)}</p>
                <div class="tarjeta-acciones">
                    <button type="button" class="btn btn-azul btn-xs" data-accion="detalle">Ver detalles</button>
                    ${usuario.rol === 'estudiante'
                        ? `<button type="button" class="btn btn-verde btn-xs" data-accion="inscribir"
                             ${agotado ? 'disabled' : ''}>Inscribirme</button>`
                        : ''}
                    ${puedeGestionar
                        ? `<button type="button" class="btn btn-gris btn-xs" data-accion="editar">Editar</button>
                           <button type="button" class="btn btn-rojo btn-xs" data-accion="eliminar">Eliminar</button>`
                        : ''}
                </div>
            </div>
        </article>`;
    }

    /** Recalcula la vista completa: tarjetas, contador, indicadores y grafico. */
    function aplicarVista() {
        const visibles = ordenar(filtrar());

        if (visibles.length === 0) {
            UI.vacio(grid, 'Ningún curso coincide con tu búsqueda o tus filtros.');
        } else {
            grid.innerHTML = visibles.map(tarjetaCurso).join('');
            // Ninguna imagen queda rota: se sustituye por un marcador generado.
            grid.querySelectorAll('img[data-respaldo]').forEach(img =>
                UI.imagenConRespaldo(img, img.dataset.respaldo));
        }

        contador.textContent =
            `Mostrando ${visibles.length} de ${cursos.length} cursos registrados.`;

        pintarIndicadores(visibles);
        pintarGrafico();
    }

    /* ------------------------------------------------------ indicadores */
    function pintarIndicadores(visibles) {
        const gratuitos = cursos.filter(c => c.precio === 0).length;
        const disponibles = cursos.filter(c => c.estado === 'disponible').length;
        const promedio = cursos.length
            ? cursos.reduce((suma, c) => suma + c.precio, 0) / cursos.length
            : 0;
        const masCaro = cursos.reduce((mayor, c) => (!mayor || c.precio > mayor.precio ? c : mayor), null);
        const mejorValorado = cursos.reduce((mejor, c) => (!mejor || c.valoracion > mejor.valoracion ? c : mejor), null);

        const tarjetas = [
            ['Cursos totales', cursos.length, '#2563eb'],
            ['Resultados filtrados', visibles.length, '#0ea5e9'],
            ['Categorías', categorias.length, '#8b5cf6'],
            ['Disponibles', disponibles, '#16a34a'],
            ['Gratuitos', gratuitos, '#f59e0b'],
            ['Precio promedio', `$${promedio.toFixed(2)}`, '#ef4444'],
            ['Curso más costoso', masCaro ? UI.precio(masCaro.precio) : '—', '#7c3aed'],
            ['Mejor valorado', mejorValorado ? `⭐ ${mejorValorado.valoracion}` : '—', '#0f766e']
        ];

        panelIndicadores.innerHTML = tarjetas.map(([etiqueta, valor, color]) => `
            <div class="indicador" style="border-left-color:${color}">
                <p class="valor">${valor}</p>
                <p class="etiqueta">${etiqueta}</p>
            </div>`).join('');
    }

    /* ---------------------------------------------------------- grafico */
    function pintarGrafico() {
        const lienzo = document.getElementById('grafico-categorias');
        if (!lienzo || typeof Chart === 'undefined') return;

        const etiquetas = categorias.map(c => c.nombre);
        const valores = categorias.map(c => cursos.filter(curso => curso.categoriaId === c.id).length);
        const colores = categorias.map(c => c.color);

        // El grafico se reconstruye tras cada alta, edicion o baja.
        if (grafico) grafico.destroy();
        grafico = new Chart(lienzo, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Cursos publicados',
                    data: valores,
                    backgroundColor: colores,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    /* ------------------------------------------------------ formulario */
    /** Formulario dentro de SweetAlert2, usado tanto para crear como para editar. */
    async function formularioCurso(curso = null) {
        const esEdicion = curso !== null;
        const opcionesCategoria = categorias.map(c =>
            `<option value="${c.id}" ${curso && curso.categoriaId === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('');
        const opcionesInstructor = instructores.map(i =>
            `<option value="${i.id}" ${curso && curso.instructorId === i.id ? 'selected' : ''}>${i.nombres} ${i.apellidos}</option>`).join('');
        const opcionesNivel = ['Basico', 'Intermedio', 'Avanzado'].map(n =>
            `<option value="${n}" ${curso && curso.nivel === n ? 'selected' : ''}>${n}</option>`).join('');

        const resultado = await Swal.fire({
            title: esEdicion ? 'Editar curso' : 'Registrar nuevo curso',
            width: 620,
            html: `
                <section class="form-swal">
                    <label for="f-nombre">Nombre del curso</label>
                    <input id="f-nombre" class="swal2-input" value="${curso ? UI.escapar(curso.nombre) : ''}">

                    <label for="f-descripcion">Descripción</label>
                    <textarea id="f-descripcion" class="swal2-textarea">${curso ? UI.escapar(curso.descripcion) : ''}</textarea>
                    <button type="button" class="btn btn-grok btn-xxs" id="btn-grok-descripcion"
                        style="margin-bottom:12px">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Generar con IA
                    </button>

                    <label for="f-categoria">Categoría</label>
                    <select id="f-categoria" class="swal2-select">${opcionesCategoria}</select>

                    <label for="f-instructor">Instructor</label>
                    <select id="f-instructor" class="swal2-select">${opcionesInstructor}</select>

                    <label for="f-nivel">Nivel</label>
                    <select id="f-nivel" class="swal2-select">${opcionesNivel}</select>

                    <label for="f-precio">Precio (USD, 0 = gratis)</label>
                    <input id="f-precio" type="number" min="0" max="5000" class="swal2-input"
                           value="${curso ? curso.precio : 0}">

                    <label for="f-duracion">Duración (horas)</label>
                    <input id="f-duracion" type="number" min="1" max="500" class="swal2-input"
                           value="${curso ? curso.duracionHoras : 10}">
                </section>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: esEdicion ? 'Guardar cambios' : 'Registrar curso',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            didOpen: () => {
                const btnGrok = document.getElementById('btn-grok-descripcion');
                if (btnGrok) {
                    btnGrok.addEventListener('click', async () => {
                        const titulo = document.getElementById('f-nombre').value.trim();
                        const catId = document.getElementById('f-categoria').value;
                        const cat = categorias.find(c => Number(c.id) === Number(catId));
                        if (!titulo || titulo.length < 5) {
                            UI.toast('Escribe primero el nombre del curso.', 'aviso');
                            return;
                        }
                        btnGrok.disabled = true;
                        btnGrok.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando…';
                        const desc = await Api.generarDescripcionCurso(titulo, cat ? cat.nombre : 'General');
                        if (desc) {
                            document.getElementById('f-descripcion').value = desc;
                            UI.toast('Descripción generada por IA.', 'exito');
                        } else {
                            UI.toast('No se pudo generar la descripción.', 'error');
                        }
                        btnGrok.disabled = false;
                        btnGrok.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generar con IA';
                    });
                }
            },
            // La validacion se ejecuta antes de cerrar el modal.
            preConfirm: () => {
                const nombre = document.getElementById('f-nombre').value.trim();
                const descripcion = document.getElementById('f-descripcion').value.trim();
                const precio = document.getElementById('f-precio').value;
                const duracion = document.getElementById('f-duracion').value;

                if (nombre.length < 5) {
                    Swal.showValidationMessage('El nombre debe tener al menos 5 caracteres.');
                    return false;
                }
                // Evita registrar dos cursos con el mismo nombre.
                const repetido = cursos.some(c =>
                    c.nombre.toLowerCase() === nombre.toLowerCase() && (!curso || c.id !== curso.id));
                if (repetido) {
                    Swal.showValidationMessage('Ya existe un curso registrado con ese nombre.');
                    return false;
                }
                if (descripcion.length < 10) {
                    Swal.showValidationMessage('La descripción debe tener al menos 10 caracteres.');
                    return false;
                }
                const validoPrecio = Validaciones.validarNumero(precio, 'El precio', 0, 5000);
                if (!validoPrecio.valido) { Swal.showValidationMessage(validoPrecio.mensaje); return false; }
                const validaDuracion = Validaciones.validarNumero(duracion, 'La duración', 1, 500);
                if (!validaDuracion.valido) { Swal.showValidationMessage(validaDuracion.mensaje); return false; }

                return {
                    nombre,
                    descripcion,
                    categoriaId: Number(document.getElementById('f-categoria').value),
                    instructorId: Number(document.getElementById('f-instructor').value),
                    nivel: document.getElementById('f-nivel').value,
                    precio: Number(precio),
                    duracionHoras: Number(duracion)
                };
            }
        });

        return resultado.isConfirmed ? resultado.value : null;
    }

    /* --------------------------------------------------------- acciones */
    async function verDetalle(curso) {
        const categoria = categorias.find(c => c.id === curso.categoriaId);
        const instructor = instructores.find(i => i.id === curso.instructorId);

        await UI.detalle(UI.escapar(curso.nombre), `
            <img src="${Datos.recurso(curso.imagen)}" alt="${UI.escapar(curso.nombre)}"
                 style="width:100%;max-height:210px;object-fit:cover;border-radius:10px;margin-bottom:14px">
            <p style="text-align:left">${UI.escapar(curso.descripcion)}</p>
            <table class="tabla-datos" style="margin-top:12px">
                <tbody>
                    <tr><th>Categoría</th><td>${categoria ? categoria.icono + ' ' + UI.escapar(categoria.nombre) : '—'}</td></tr>
                    <tr><th>Instructor</th><td>${instructor ? UI.escapar(instructor.nombres + ' ' + instructor.apellidos) : '—'}</td></tr>
                    <tr><th>Especialidad</th><td>${instructor ? UI.escapar(instructor.especialidad) : '—'}</td></tr>
                    <tr><th>Nivel</th><td>${UI.escapar(curso.nivel)}</td></tr>
                    <tr><th>Modalidad</th><td>${UI.escapar(curso.modalidad)}</td></tr>
                    <tr><th>Duración</th><td>${curso.duracionHoras} horas</td></tr>
                    <tr><th>Valoración</th><td>⭐ ${curso.valoracion}</td></tr>
                    <tr><th>Cupos</th><td>${curso.cupos}</td></tr>
                    <tr><th>Precio</th><td>${UI.precio(curso.precio)}</td></tr>
                    <tr><th>Publicado</th><td>${UI.fecha(curso.fechaRegistro)}</td></tr>
                </tbody>
            </table>`);
    }

    async function inscribir(curso) {
        await Datos.obtener('matriculas');
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
            await Datos.obtener('instructores', 'notificaciones');
            const instructores = Datos.cache('instructores');
            const instructor = instructores.find(i => i.id === curso.instructorId);
            if (instructor) {
                Datos.agregar('notificaciones', {
                    id: Date.now(),
                    rol: 'instructor',
                    tipo: 'info',
                    icono: '👤',
                    titulo: 'Nuevo estudiante inscrito',
                    descripcion: `${usuario.nombres} ${usuario.apellidos} se inscribio en tu curso "${curso.nombre}".`,
                    leida: false,
                    fecha: new Date().toISOString(),
                    fuente: 'Sistema de Inscripcion'
                });
            }
        } catch (e) { /* notificaciones opcionales */ }

        const resultado = await Swal.fire({
            title: 'Inscripción exitosa',
            text: `Te inscribiste en "${curso.nombre}".`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Comenzar curso',
            cancelButtonText: 'Seguir explorando',
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280'
        });

        if (resultado.isConfirmed) {
            await Datos.obtener('matriculas');
            const mat = Datos.cache('matriculas').find(m =>
                Number(m.usuarioId) === Number(usuario.id) && Number(m.cursoId) === Number(curso.id));
            if (mat) {
                const nuevoProgreso = Math.min(mat.progreso + 15, 100);
                const nuevoEstado = nuevoProgreso >= 100 ? 'completado' : nuevoProgreso > 0 ? 'en progreso' : 'inscrito';
                Datos.actualizar('matriculas', mat.id, { progreso: nuevoProgreso, estado: nuevoEstado });
            }
            UI.toast(`¡Bienvenido a "${curso.nombre}"! Progreso actualizado.`, 'exito');
        }
    }

    async function crear() {
        const datos = await formularioCurso();
        if (!datos) return;

        const categoria = categorias.find(c => c.id === datos.categoriaId);
        Datos.agregar('cursos', {
            ...datos,
            modalidad: 'Virtual',
            valoracion: 0,
            cupos: 20,
            estado: 'disponible',
            icono: categoria ? categoria.icono : '📘',
            // Los cursos nuevos no tienen archivo propio: usan el respaldo generado.
            imagen: '',
            certificado: true,
            fechaRegistro: new Date().toISOString().slice(0, 10)
        });

        cursos = Datos.cache('cursos');
        aplicarVista();
        UI.toast('Curso registrado correctamente.', 'exito');
    }

    async function editar(curso) {
        const datos = await formularioCurso(curso);
        if (!datos) return;

        Datos.actualizar('cursos', curso.id, datos);
        cursos = Datos.cache('cursos');
        aplicarVista();
        UI.toast('Curso actualizado.', 'exito');
    }

    async function eliminar(curso) {
        const confirmado = await UI.confirmar(
            '¿Eliminar el curso?',
            `Se eliminará "${curso.nombre}" del catálogo. Esta acción no se puede deshacer.`,
            'Sí, eliminar'
        );
        if (!confirmado) return;

        Datos.eliminar('cursos', curso.id);
        cursos = Datos.cache('cursos');
        aplicarVista();
        UI.toast('Curso eliminado del catálogo.', 'info');
    }

    async function restablecer() {
        const confirmado = await UI.confirmar(
            'Restablecer los datos originales',
            'Se descartarán todos los cambios guardados y se volverán a cargar los archivos JSON. ¿Continuar?',
            'Sí, restablecer'
        );
        if (!confirmado) return;

        try {
            const total = await Datos.restablecer();
            cursos = Datos.cache('cursos');
            categorias = Datos.cache('categorias');
            instructores = Datos.cache('instructores');
            pintarOpcionesCategoria();
            aplicarVista();
            UI.toast(`${total} registros restablecidos desde los archivos JSON.`, 'exito');
        } catch (error) {
            UI.error('No se pudieron restablecer los datos', error.message);
        }
    }

    /* ----------------------------------------------------------- eventos */
    // Busqueda en tiempo real.
    buscador.addEventListener('input', aplicarVista);
    filtroCategoria.addEventListener('change', aplicarVista);
    filtroNivel.addEventListener('change', aplicarVista);
    selectOrden.addEventListener('change', aplicarVista);

    botonLimpiar.addEventListener('click', () => {
        buscador.value = '';
        filtroCategoria.value = '';
        filtroNivel.value = '';
        selectOrden.value = 'nombre-asc';
        aplicarVista();
        UI.toast('Filtros restablecidos.', 'info');
    });

    botonNuevo.addEventListener('click', crear);
    botonRestablecer.addEventListener('click', restablecer);

    /* ------------------------------------------------------- recomendar */
    let idsRecomendados = [];

    if (botonRecomendar) {
        botonRecomendar.addEventListener('click', async () => {
            botonRecomendar.disabled = true;
            botonRecomendar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando…';
            const resultado = await Api.recomendarCursos();
            idsRecomendados = resultado;
            botonRecomendar.disabled = false;
            botonRecomendar.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Recomendar para mí';
            if (idsRecomendados.length === 0) {
                UI.toast('No se pudieron generar recomendaciones.', 'aviso');
            } else {
                UI.toast(`${idsRecomendados.length} cursos recomendados para ti.`, 'exito');
            }
            aplicarVista();
        });
    }

    // Evento delegado: las tarjetas se crean despues de cargar la pagina.
    grid.addEventListener('click', async evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) return;

        const tarjeta = boton.closest('.tarjeta-item');
        const curso = cursos.find(c => Number(c.id) === Number(tarjeta.dataset.id));
        if (!curso) {
            UI.error('Registro no encontrado', 'El curso ya no existe en el catálogo.');
            return;
        }

        switch (boton.dataset.accion) {
            case 'detalle': await verDetalle(curso); break;
            case 'inscribir': await inscribir(curso); break;
            case 'editar': await editar(curso); break;
            case 'eliminar': await eliminar(curso); break;
        }
    });

    /* ------------------------------------------------------------- clima */
    function pintarSelectorCiudades() {
        selectorCiudades.innerHTML = Api.CIUDADES.map((ciudad, i) =>
            `<button type="button" class="btn-ciudad ${i === 0 ? 'activa' : ''}"
                     data-ciudad="${ciudad.nombre}">${ciudad.nombre}</button>`).join('');
    }

    async function mostrarClima(nombreCiudad) {
        UI.cargando(panelClima, `Consultando el clima en ${nombreCiudad}…`);
        try {
            const clima = await Api.obtenerClima(nombreCiudad);
            panelClima.innerHTML = `
                <section class="panel-clima">
                    <p class="clima-icono" aria-hidden="true">${clima.icono}</p>
                    <section>
                        <p class="clima-temperatura">${clima.temperatura} °C</p>
                        <p>${UI.escapar(clima.descripcion)} en ${UI.escapar(clima.ciudad)}</p>
                        <section class="clima-detalles">
                            <span>💧 Humedad: ${clima.humedad}%</span>
                            <span>💨 Viento: ${clima.viento} km/h</span>
                            <span>🕒 Actualizado: ${clima.hora.replace('T', ' ')}</span>
                        </section>
                    </section>
                </section>`;
        } catch (error) {
            UI.fallo(panelClima, error.message, () => mostrarClima(nombreCiudad));
        }
    }

    selectorCiudades.addEventListener('click', evento => {
        const boton = evento.target.closest('.btn-ciudad');
        if (!boton) return;
        selectorCiudades.querySelectorAll('.btn-ciudad').forEach(b => b.classList.remove('activa'));
        boton.classList.add('activa');
        mostrarClima(boton.dataset.ciudad);
    });

    /* -------------------------------------------------------------- inicio */
    await cargar();
    pintarSelectorCiudades();
    mostrarClima(Api.CIUDADES[0].nombre);
});
