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
    const enlaceInicio = document.getElementById('enlace-inicio');
    if (enlaceInicio) enlaceInicio.href = Auth.panelDe(usuario.rol);

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
    const btnIACompletar = document.getElementById('btn-ia-completar');

    // Sin claves configuradas, las funciones de IA no pueden responder: se
    // ocultan en lugar de dejar botones que fallarian al pulsarlos.
    if (!Api.hayIA()) {
        [btnIAHabilidades, btnIACompletar].forEach(b => b && b.classList.add('oculto'));
    }

    /* --------------------------------------------- analisis de empleabilidad */
    /**
     * Sustituye al antiguo "completar perfil con IA", que proponia inventar
     * datos que solo el propio usuario conoce (su ciudad, su telefono).
     *
     * Aqui la IA responde una pregunta que el estudiante si se hace y que no
     * puede contestar solo: cuantas de las vacantes abiertas cubre hoy, que
     * habilidades le faltan para el resto y que cursos se las darian.
     */
    if (btnIACompletar) {
        btnIACompletar.addEventListener('click', async () => {
            btnIACompletar.disabled = true;
            btnIACompletar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando…';
            Swal.fire({
                title: 'Analizando tu empleabilidad…',
                text: 'Comparando tu perfil con las vacantes abiertas.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            // El analisis necesita las vacantes y las empresas en cache.
            await Datos.obtenerVarias('vacantes', 'empresas', 'cursos', 'usuarios');
            const analisis = await Api.analizarEmpleabilidad();

            Swal.close();
            btnIACompletar.disabled = false;
            btnIACompletar.innerHTML = '<i class="fa-solid fa-chart-line"></i> Analizar mi empleabilidad';

            if (!analisis) {
                UI.error('No se pudo completar el análisis',
                    'No hay vacantes abiertas con las que comparar tu perfil en este momento.');
                return;
            }

            const porcentaje = analisis.totalVacantes
                ? Math.round((analisis.califican / analisis.totalVacantes) * 100)
                : 0;
            const color = porcentaje >= 50 ? '#16a34a' : porcentaje >= 20 ? '#f59e0b' : '#ef4444';

            const mejoresHtml = analisis.mejores.map(v => `
                <div style="text-align:left;padding:10px 12px;background:#f8fafc;border-radius:8px;
                            margin-bottom:8px;border-left:4px solid ${v.porcentaje >= 70 ? '#16a34a' : '#f59e0b'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                        <strong style="font-size:14px">${UI.escapar(v.titulo)}</strong>
                        <span style="font-weight:700;color:${v.porcentaje >= 70 ? '#16a34a' : '#f59e0b'}">${v.porcentaje}%</span>
                    </div>
                    <p style="margin:2px 0 0;font-size:12px;color:#64748b">
                        ${UI.escapar(v.empresa)}${v.ciudad ? ' · ' + UI.escapar(v.ciudad) : ''}${v.salario ? ' · $' + v.salario : ''}
                    </p>
                </div>`).join('');

            const brechasHtml = analisis.brechas.length === 0
                ? '<p style="font-size:13px;color:#16a34a;text-align:left">Cubres todas las habilidades solicitadas.</p>'
                : analisis.brechas.map(b => `
                    <div style="text-align:left;padding:8px 12px;background:#fffbeb;border-radius:8px;
                                margin-bottom:6px;border-left:4px solid #f59e0b">
                        <strong style="font-size:13px">${UI.escapar(b.habilidad)}</strong>
                        <span style="font-size:12px;color:#64748b"> · la piden ${b.vacantes} vacante${b.vacantes !== 1 ? 's' : ''}</span>
                        ${b.curso ? `<p style="margin:2px 0 0;font-size:12px;color:#2563eb">📚 Curso: ${UI.escapar(b.curso)}</p>` : ''}
                    </div>`).join('');

            await Swal.fire({
                title: 'Tu empleabilidad hoy',
                width: 580,
                html: `
                    <div style="text-align:center;margin-bottom:16px">
                        <p style="font-size:40px;font-weight:700;color:${color};margin:0">
                            ${analisis.califican}<span style="font-size:22px;color:#94a3b8">/${analisis.totalVacantes}</span>
                        </p>
                        <p style="font-size:13px;color:#64748b;margin:0">
                            vacantes abiertas para las que ya calificas
                            ${analisis.salarioMedio ? ` · salario medio $${analisis.salarioMedio}` : ''}
                        </p>
                    </div>

                    ${analisis.consejo
                        ? `<p style="text-align:left;font-size:13px;color:#334155;background:#eff6ff;
                                     border-left:4px solid #2563eb;border-radius:8px;padding:12px;margin-bottom:16px">
                             ${UI.escapar(analisis.consejo)}
                           </p>`
                        : ''}

                    <p style="text-align:left;font-weight:700;font-size:14px;margin:0 0 8px">Vacantes que más se ajustan</p>
                    ${mejoresHtml}

                    <p style="text-align:left;font-weight:700;font-size:14px;margin:16px 0 8px">Lo que te falta</p>
                    ${brechasHtml}`,
                confirmButtonText: 'Ver catálogo de cursos',
                showCancelButton: true,
                cancelButtonText: 'Cerrar',
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#6b7280',
                reverseButtons: true
            }).then(r => {
                if (r.isConfirmed) window.location.href = '../cursos/cursos.html';
            });
        });
    }

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
                // Se distingue la falta de configuracion de un fallo del servicio:
                // antes ambos casos mostraban el mismo aviso y no habia forma de
                // saber por que no aparecia nada.
                if (!Api.hayIA()) {
                    UI.error('Asistente no disponible',
                        'Las funciones de inteligencia artificial no están configuradas en esta instalación.');
                } else {
                    UI.error('No se pudieron generar sugerencias',
                        'El asistente no respondió. Vuelve a intentarlo en unos segundos.');
                }
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

    /* ------------------------------------------------------- cabecera */
    function pintarCabecera() {
        const config = Auth.ROLES[usuario.rol];
        fotoPerfil.src = UI.fotoUsuario(usuario);
        fotoPerfil.alt = `Foto de perfil de ${usuario.nombres} ${usuario.apellidos}`;
        document.getElementById('nombre-completo').textContent = `${usuario.nombres} ${usuario.apellidos}`;
        document.getElementById('rol-perfil').textContent = `${config.icono} ${config.etiqueta}`;
        document.getElementById('email-perfil').textContent = usuario.email;

        const pais = usuario.nacionalidad || {};
        const flagHtml = pais.banderaSmall
            ? `<img class="nacionalidad-bandera-img" src="${pais.banderaSmall}" width="24" height="18" alt="${UI.escapar(pais.nombre || '')}" onerror="this.style.display='none'">`
            : (pais.bandera || '🏳️');
        document.getElementById('nacionalidad-perfil').innerHTML =
            pais.nombre ? `${flagHtml} ${UI.escapar(pais.nombre)}` : 'Nacionalidad no registrada';

        UI.pintarPerfilLateral(usuario);
    }

    /* -------------------------------------------------- datos personales */
    function pintarDatos() {
        const edad = usuario.fechaNacimiento
            ? `${Validaciones.calcularEdad(usuario.fechaNacimiento)} anios`
            : '—';
        const contacto = usuario.contacto || {};
        const pais = usuario.nacionalidad || {};
        const flagHtml = pais.banderaSmall
            ? `<img class="nacionalidad-bandera-img" src="${pais.banderaSmall}" width="24" height="18" alt="${UI.escapar(pais.nombre || '')}" onerror="this.style.display='none'">`
            : (pais.bandera || '');

        const filas = [
            ['Nombres', usuario.nombres],
            ['Apellidos', usuario.apellidos],
            ['Correo electrónico', usuario.email],
            ['Rol', Auth.ROLES[usuario.rol].etiqueta],
            ['Fecha de nacimiento', UI.fecha(usuario.fechaNacimiento)],
            ['Edad', edad],
            ['Nacionalidad', pais.nombre ? `${flagHtml} ${UI.escapar(pais.nombre)}` : '—'],
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
                    const botonCurso = matricula.estado === 'completado'
                        ? `<span class="badge badge-verde">Completado</span>`
                        : matricula.progreso > 0
                        ? `<button type="button" class="btn btn-azul btn-sm btn-continuar-curso" data-matricula-id="${matricula.id}">Continuar curso</button>`
                        : `<button type="button" class="btn btn-verde btn-sm btn-comenzar-curso" data-matricula-id="${matricula.id}">Comenzar curso</button>`;
                    return `
                    <article class="tarjeta-item">
                        <img src="${Datos.recurso(curso.imagen)}" alt="${UI.escapar(curso.nombre)}"
                             loading="lazy" data-respaldo="${curso.icono}">
                        <div class="tarjeta-cuerpo">
                            <span class="chip">${UI.escapar(matricula.estado)}</span>
                            <h3 class="tarjeta-titulo">${UI.escapar(curso.nombre)}</h3>
                            <p class="tarjeta-desc">${categoria ? UI.escapar(categoria.nombre) : ''}</p>
                            <progress value="${matricula.progreso}" max="100"
                                      title="${matricula.progreso}%"></progress>
                            <p class="tarjeta-meta">${matricula.progreso}% completado
                                ${matricula.certificadoEmitido ? '· 🏅 Certificado emitido' : ''}</p>
                            ${botonCurso}
                        </div>
                    </article>`;
                }).join('');

                zonaCursos.querySelectorAll('img[data-respaldo]').forEach(img =>
                    UI.imagenConRespaldo(img, img.dataset.respaldo));

                zonaCursos.querySelectorAll('.btn-comenzar-curso, .btn-continuar-curso').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const matriculaId = Number(btn.dataset.matriculaId);
                        await Datos.obtener('matriculas');
                        const mat = Datos.cache('matriculas').find(m => m.id === matriculaId);
                        if (!mat) return;
                        const incremento = Math.floor(Math.random() * 25) + 10;
                        const nuevoProgreso = Math.min(mat.progreso + incremento, 100);
                        const nuevoEstado = nuevoProgreso >= 100 ? 'completado' : 'en progreso';
                        Datos.actualizar('matriculas', matriculaId, { progreso: nuevoProgreso, estado: nuevoEstado });
                        await pintarCursos();
                        UI.toast(`Progreso actualizado: ${nuevoProgreso}%`, 'exito');
                    });
                });
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
            <div class="indicador" style="border-left-color:${color}">
                <p class="valor">${valor}</p>
                <p class="etiqueta">${etiqueta}</p>
            </div>`).join('');
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

    /* ---------------------------------------------------------- sidebar toggle */
    const btnAbrir = document.getElementById('btn-abrir-sidebar');
    const btnCerrar = document.getElementById('btn-cerrar-sidebar');
    const sidebar = document.getElementById('sidebar-perfil');
    if (btnAbrir && sidebar) {
        btnAbrir.addEventListener('click', () => sidebar.classList.add('abierto'));
    }
    if (btnCerrar && sidebar) {
        btnCerrar.addEventListener('click', () => sidebar.classList.remove('abierto'));
    }

    /* ---------------------------------------------------------- inicio */
    pintarCabecera();
    pintarDatos();
    pintarHabilidades();
    await pintarCursos();
});
