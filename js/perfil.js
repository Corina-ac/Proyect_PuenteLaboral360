/* ============================================================================
   perfil.js — Perfil del usuario en sesion

   La pagina es privada: sin sesion no se muestra ningun dato y se redirige
   al inicio de sesion. La foto proviene de la cuenta registrada; si el
   usuario no subio una, se genera un avatar con sus iniciales.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    let usuario = Auth.proteger();     // cualquier rol autenticado
    if (!usuario) return;

    // La coleccion de usuarios debe estar cargada antes de poder editar el
    // perfil: de lo contrario la actualizacion no encontraria el registro.
    try {
        await Datos.obtener('usuarios');
    } catch (error) {
        UI.toast('No se pudieron cargar los datos de la cuenta.', 'error');
    }

    UI.pintarPerfilLateral(usuario);
    document.getElementById('enlace-inicio').href = Auth.panelDe(usuario.rol);

    const fotoPerfil = document.getElementById('foto-perfil');
    const inputFoto = document.getElementById('cambiar-foto');
    const botonEditar = document.getElementById('btn-editar-perfil');
    const tablaDatos = document.getElementById('tabla-datos-personales');
    const zonaHabilidades = document.getElementById('habilidades-perfil');
    const zonaCursos = document.getElementById('mis-cursos');
    const indicadores = document.getElementById('indicadores-perfil');
    const inputHabilidad = document.getElementById('input-habilidad');
    const btnAgregarHabilidad = document.getElementById('btn-agregar-habilidad');
    const btnIAHabilidades = document.getElementById('btn-ia-habilidades');

    /* ------------------------------------------------------- habilidades */
    function pintarHabilidades() {
        const habilidades = usuario.habilidades || [];
        if (habilidades.length === 0) {
            zonaHabilidades.innerHTML = '<p class="nota-seguridad">Aún no has registrado habilidades. Escribe una arriba o usa "Sugerir con IA".</p>';
            return;
        }
        zonaHabilidades.innerHTML = habilidades.map(h =>
            `<span class="chip" style="display:inline-flex;align-items:center;gap:6px">
                ${UI.escapar(h)}
                <button type="button" class="btn-remove-habilidad" data-habilidad="${UI.escapar(h)}"
                        title="Eliminar" style="background:none;border:none;cursor:pointer;color:#dc3545;font-size:14px;padding:0">&times;</button>
            </span>`
        ).join(' ');
        zonaHabilidades.querySelectorAll('.btn-remove-habilidad').forEach(btn => {
            btn.addEventListener('click', () => eliminarHabilidad(btn.dataset.habilidad));
        });
    }

    function agregarHabilidad(nombre) {
        const limpio = (nombre || '').trim();
        if (!limpio) { UI.toast('Escribe el nombre de la habilidad.', 'aviso'); return; }
        if (limpio.length < 2) { UI.toast('La habilidad debe tener al menos 2 caracteres.', 'aviso'); return; }
        const habilidades = usuario.habilidades || [];
        if (habilidades.some(h => h.toLowerCase() === limpio.toLowerCase())) {
            UI.toast('Ya tienes esa habilidad registrada.', 'aviso'); return;
        }
        habilidades.push(limpio);
        const actualizado = Auth.actualizarPerfil({ habilidades });
        if (!actualizado) { UI.toast('No se pudo guardar.', 'error'); return; }
        usuario = actualizado;
        pintarHabilidades();
        inputHabilidad.value = '';
        UI.toast(`Habilidad "${limpio}" agregada.`, 'exito');
    }

    function eliminarHabilidad(nombre) {
        const habilidades = (usuario.habilidades || []).filter(h => h !== nombre);
        const actualizado = Auth.actualizarPerfil({ habilidades });
        if (!actualizado) { UI.toast('No se pudo eliminar.', 'error'); return; }
        usuario = actualizado;
        pintarHabilidades();
        UI.toast(`Habilidad "${nombre}" eliminada.`, 'info');
    }

    if (btnAgregarHabilidad) {
        btnAgregarHabilidad.addEventListener('click', () => agregarHabilidad(inputHabilidad.value));
    }
    if (inputHabilidad) {
        inputHabilidad.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); agregarHabilidad(inputHabilidad.value); }
        });
    }

    /* ------------------------------------------------- IA sugerir habilidades */
    if (btnIAHabilidades) {
        btnIAHabilidades.addEventListener('click', async () => {
            btnIAHabilidades.disabled = true;
            btnIAHabilidades.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando…';
            Swal.fire({ title: 'La IA está analizando tu perfil…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const sugeridas = await Api.sugerirHabilidades();
            Swal.close();
            btnIAHabilidades.disabled = false;
            btnIAHabilidades.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Sugerir con IA';

            if (!sugeridas || sugeridas.length === 0) {
                UI.toast('No se pudieron generar sugerencias.', 'aviso');
                return;
            }

            const existentes = (usuario.habilidades || []).map(h => h.toLowerCase());
            const nuevas = sugeridas.filter(s => !existentes.some(e => e === s.toLowerCase()));

            if (nuevas.length === 0) {
                Swal.fire({ title: 'Ya tienes todas las habilidades sugeridas', text: 'Tu perfil ya incluye las habilidades que la IA recomendaría.', confirmButtonColor: '#2563eb' });
                return;
            }

            const checksHtml = nuevas.map((h, i) =>
                `<label style="display:flex;align-items:center;gap:8px;padding:8px;background:#f8f9fa;border-radius:6px;margin-bottom:6px;cursor:pointer">
                    <input type="checkbox" class="chk-habilidad-ia" value="${UI.escapar(h)}" checked style="width:18px;height:18px">
                    <span style="font-size:14px">${UI.escapar(h)}</span>
                </label>`
            ).join('');

            const resultado = await Swal.fire({
                title: 'Habilidades sugeridas por IA',
                html: `<p style="text-align:left;font-size:13px;color:#666;margin-bottom:10px">Selecciona las que quieras agregar a tu perfil:</p>${checksHtml}`,
                width: 480,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-check"></i> Agregar seleccionadas',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#8b5cf6',
                preConfirm: () => {
                    const seleccionadas = [...document.querySelectorAll('.chk-habilidad-ia:checked')].map(cb => cb.value);
                    if (seleccionadas.length === 0) { Swal.showValidationMessage('Selecciona al menos una habilidad'); return false; }
                    return seleccionadas;
                }
            });

            if (!resultado.isConfirmed) return;

            const habilidadesActuales = usuario.habilidades || [];
            const combinadas = [...habilidadesActuales, ...resultado.value];
            const actualizado = Auth.actualizarPerfil({ habilidades: combinadas });
            if (!actualizado) { UI.toast('No se pudieron guardar las habilidades.', 'error'); return; }
            usuario = actualizado;
            pintarHabilidades();
            UI.toast(`${resultado.value.length} habilidad(es) agregada(s) a tu perfil.`, 'exito');
        });
    }

    /* ------------------------------------------------------- IA mejorar perfil (botón existente) */
    const botonMejorarIA = document.createElement('button');
    botonMejorarIA.type = 'button';
    botonMejorarIA.className = 'btn btn-grok btn-sm';
    botonMejorarIA.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mejorar mi perfil con IA';
    const esEmpresa = usuario.rol === 'empresa';
    if (!esEmpresa) {
        const wrapperEditar = document.querySelector('.acciones-perfil');
        if (wrapperEditar) {
            wrapperEditar.appendChild(botonMejorarIA);
        }
    }

    botonMejorarIA.addEventListener('click', async () => {
        botonMejorarIA.disabled = true;
        botonMejorarIA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando tu perfil…';
        Swal.fire({
            title: 'Analizando tu perfil…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });
        const sugerencias = await Api.mejorarPerfil();
        Swal.close();
        botonMejorarIA.disabled = false;
        botonMejorarIA.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mejorar mi perfil con IA';
        if (!sugerencias || sugerencias.length === 0) {
            UI.toast('No se pudieron generar sugerencias.', 'aviso');
            return;
        }
        const html = sugerencias.map((s, i) => `
            <section style="text-align:left;margin-bottom:12px;padding:10px;background:#f8f9fa;border-radius:8px;border-left:4px solid #8b5cf6">
                <p style="margin:0 0 4px"><strong>${i + 1}. ${UI.escapar(s.campo)}</strong></p>
                <p style="margin:0;color:#555">${UI.escapar(s.consejo)}</p>
            </section>`).join('');
        Swal.fire({
            title: 'Sugerencias para tu perfil',
            html,
            width: 560,
            confirmButtonText: '¡Gracias!',
            confirmButtonColor: '#2563eb'
        });
    });

    /* ------------------------------------------------------- cabecera */
    function pintarCabecera() {
        const config = Auth.ROLES[usuario.rol];
        fotoPerfil.src = UI.fotoUsuario(usuario);
        fotoPerfil.alt = `Foto de perfil de ${usuario.nombres} ${usuario.apellidos}`;
        document.getElementById('nombre-completo').textContent = `${usuario.nombres} ${usuario.apellidos}`;
        document.getElementById('rol-perfil').textContent = `${config.icono} ${config.etiqueta}`;
        document.getElementById('email-perfil').textContent = usuario.email;

        const pais = usuario.nacionalidad || {};
        document.getElementById('nacionalidad-perfil').textContent =
            pais.nombre ? `${pais.bandera || '🏳️'} ${pais.nombre}` : 'Nacionalidad no registrada';

        UI.pintarPerfilLateral(usuario);
    }

    /* -------------------------------------------------- datos personales */
    function pintarDatos() {
        const edad = usuario.fechaNacimiento
            ? `${Validaciones.calcularEdad(usuario.fechaNacimiento)} anios`
            : '—';
        const contacto = usuario.contacto || {};
        const pais = usuario.nacionalidad || {};

        const filas = [
            ['Nombres', usuario.nombres],
            ['Apellidos', usuario.apellidos],
            ['Correo electrónico', usuario.email],
            ['Rol', Auth.ROLES[usuario.rol].etiqueta],
            ['Fecha de nacimiento', UI.fecha(usuario.fechaNacimiento)],
            ['Edad', edad],
            ['Nacionalidad', pais.nombre ? `${pais.bandera || ''} ${pais.nombre}` : '—'],
            ['Teléfono', contacto.telefono || '—'],
            ['Ciudad', contacto.ciudad || '—'],
            ['Nivel declarado', usuario.nivel || '—'],
            ['Objetivo', usuario.objetivo || '—'],
            ['Miembro desde', UI.fecha(usuario.fechaRegistro)]
        ];

        tablaDatos.innerHTML = filas.map(([etiqueta, valor]) =>
            `<tr><th scope="row">${etiqueta}</th><td>${UI.escapar(valor)}</td></tr>`).join('');
    }

    /* ----------------------------------------------------- mis cursos */
    async function pintarCursos() {
        UI.cargando(zonaCursos, 'Cargando tus cursos…');
        try {
            await Datos.obtenerVarias('cursos', 'matriculas', 'categorias', 'instructores');
            const matriculas = Datos.matriculasDe(usuario.id);

            if (matriculas.length === 0) {
                UI.vacio(zonaCursos,
                    'Todavía no estás matriculado en ningún curso. Visita el catálogo para inscribirte.', '📚');
            } else {
                zonaCursos.innerHTML = matriculas.map(matricula => {
                    const curso = matricula.curso;
                    const categoria = Datos.categoriaDe(curso);
                    return `
                    <article class="tarjeta-item">
                        <img src="${Datos.recurso(curso.imagen)}" alt="${UI.escapar(curso.nombre)}"
                             loading="lazy" data-respaldo="${curso.icono}">
                        <section class="tarjeta-cuerpo">
                            <span class="chip">${UI.escapar(matricula.estado)}</span>
                            <h3 class="tarjeta-titulo">${UI.escapar(curso.nombre)}</h3>
                            <p class="tarjeta-desc">${categoria ? UI.escapar(categoria.nombre) : ''}</p>
                            <progress value="${matricula.progreso}" max="100"
                                      title="${matricula.progreso}%"></progress>
                            <p class="tarjeta-meta">${matricula.progreso}% completado
                                ${matricula.certificadoEmitido ? '· 🏅 Certificado emitido' : ''}</p>
                        </section>
                    </article>`;
                }).join('');

                zonaCursos.querySelectorAll('img[data-respaldo]').forEach(img =>
                    UI.imagenConRespaldo(img, img.dataset.respaldo));
            }

            pintarIndicadores(matriculas);
        } catch (error) {
            UI.fallo(zonaCursos, error.message, pintarCursos);
        }
    }

    function pintarIndicadores(matriculas) {
        const completados = matriculas.filter(m => m.estado === 'completado');
        const enProgreso = matriculas.filter(m => m.estado === 'en progreso');
        const promedio = completados.length
            ? completados.reduce((suma, m) => suma + (m.calificacion || 0), 0) / completados.length
            : 0;
        const horas = matriculas.reduce((suma, m) => suma + (m.curso.duracionHoras || 0), 0);

        const tarjetas = [
            ['Cursos matriculados', matriculas.length, '#2563eb'],
            ['Completados', completados.length, '#16a34a'],
            ['En progreso', enProgreso.length, '#f59e0b'],
            ['Certificados', matriculas.filter(m => m.certificadoEmitido).length, '#8b5cf6'],
            ['Promedio', promedio ? promedio.toFixed(1) : '—', '#0ea5e9'],
            ['Horas de formación', horas, '#ef4444']
        ];

        indicadores.innerHTML = tarjetas.map(([etiqueta, valor, color]) => `
            <section class="indicador" style="border-left-color:${color}">
                <p class="valor">${valor}</p>
                <p class="etiqueta">${etiqueta}</p>
            </section>`).join('');
    }

    /* ------------------------------------------------------- acciones */
    inputFoto.addEventListener('change', () => {
        const archivo = inputFoto.files[0];
        if (!archivo) return;
        if (!archivo.type.startsWith('image/')) {
            UI.toast('El archivo seleccionado no es una imagen.', 'error');
            return;
        }
        if (archivo.size > 400 * 1024) {
            UI.toast('La imagen supera los 400 KB. Elige una más liviana.', 'error');
            return;
        }
        const lector = new FileReader();
        lector.onload = () => {
            const actualizado = Auth.actualizarPerfil({ avatar: lector.result });
            if (!actualizado) {
                UI.error('No se pudo guardar', 'Tu cuenta no se encontró en los registros.');
                return;
            }
            usuario = actualizado;
            pintarCabecera();
            UI.toast('Foto de perfil actualizada.', 'exito');
        };
        lector.onerror = () => UI.toast('No se pudo leer la imagen.', 'error');
        lector.readAsDataURL(archivo);
    });

    botonEditar.addEventListener('click', async () => {
        const contacto = usuario.contacto || {};
        const resultado = await Swal.fire({
            title: 'Editar mis datos',
            width: 560,
            html: `
                <label for="e-nombres">Nombres</label>
                <input id="e-nombres" class="swal2-input" value="${UI.escapar(usuario.nombres)}">
                <label for="e-apellidos">Apellidos</label>
                <input id="e-apellidos" class="swal2-input" value="${UI.escapar(usuario.apellidos)}">
                <label for="e-telefono">Teléfono</label>
                <input id="e-telefono" class="swal2-input" value="${UI.escapar(contacto.telefono || '')}">
                <label for="e-ciudad">Ciudad</label>
                <input id="e-ciudad" class="swal2-input" value="${UI.escapar(contacto.ciudad || '')}">`,
            showCancelButton: true,
            confirmButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            preConfirm: () => {
                const nombres = document.getElementById('e-nombres').value.trim();
                const apellidos = document.getElementById('e-apellidos').value.trim();
                const telefono = document.getElementById('e-telefono').value.trim();

                const vNombres = Validaciones.validarTexto(nombres, 'El nombre');
                if (!vNombres.valido) { Swal.showValidationMessage(vNombres.mensaje); return false; }
                const vApellidos = Validaciones.validarTexto(apellidos, 'El apellido');
                if (!vApellidos.valido) { Swal.showValidationMessage(vApellidos.mensaje); return false; }
                const vTelefono = Validaciones.validarTelefono(telefono);
                if (!vTelefono.valido) { Swal.showValidationMessage(vTelefono.mensaje); return false; }

                return {
                    nombres, apellidos,
                    contacto: { ...contacto, telefono, ciudad: document.getElementById('e-ciudad').value.trim() }
                };
            }
        });

        if (!resultado.isConfirmed) return;

        const actualizado = Auth.actualizarPerfil({
            ...resultado.value,
            iniciales: (resultado.value.nombres[0] + resultado.value.apellidos[0]).toUpperCase()
        });
        if (!actualizado) {
            UI.error('No se pudo guardar', 'Tu cuenta no se encontró en los registros.');
            return;
        }
        usuario = actualizado;
        pintarCabecera();
        pintarDatos();
        UI.toast('Datos actualizados correctamente.', 'exito');
    });

    /* ---------------------------------------------------------- inicio */
    pintarCabecera();
    pintarDatos();
    pintarHabilidades();
    await pintarCursos();
});
