/* ============================================================================
   admin.js — Panel exclusivo del administrador

   Esta pagina esta protegida por rol: cualquier usuario que no sea admin es
   devuelto a su propio panel, incluso si escribe la URL directamente.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const administrador = Auth.proteger(['admin']);
    if (!administrador) return;

    UI.pintarPerfilLateral(administrador);

    const cuerpoTabla = document.getElementById('tabla-usuarios');
    const buscador = document.getElementById('buscar-usuario');
    const filtroRol = document.getElementById('filtro-rol');
    const filtroEstado = document.getElementById('filtro-estado');
    const ordenUsuarios = document.getElementById('orden-usuarios');
    const contador = document.getElementById('contador-usuarios');
    const indicadores = document.getElementById('indicadores-admin');
    const botonRestablecer = document.getElementById('btn-restablecer-admin');

    const botonResumenIA = document.createElement('button');
    botonResumenIA.type = 'button';
    botonResumenIA.className = 'btn btn-grok btn-sm';
    botonResumenIA.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Resumen IA del sistema';
    botonRestablecer.parentNode.insertBefore(botonResumenIA, botonRestablecer);

    botonResumenIA.addEventListener('click', async () => {
        botonResumenIA.disabled = true;
        botonResumenIA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando…';
        Swal.fire({
            title: 'Generando resumen con IA…',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => Swal.showLoading()
        });
        const porRol = rol => usuarios.filter(u => u.rol === rol).length;
        const stats = [
            `Usuarios totales: ${usuarios.length}`,
            `Estudiantes: ${porRol('estudiante')}, Instructores: ${porRol('instructor')}, Empresas: ${porRol('empresa')}`,
            `Cuentas activas: ${usuarios.filter(u => u.activo !== false).length}`,
            `Cursos: ${cursos.length} (disponibles: ${cursos.filter(c => c.estado === 'disponible').length})`,
            `Vacantes: ${vacantes.length} (abiertas: ${vacantes.filter(v => v.estado === 'abierta').length})`,
            `Matriculas: ${matriculas.length}`
        ].join('\n');
        const respuesta = await Api.resumenSistema(stats);
        Swal.close();
        botonResumenIA.disabled = false;
        botonResumenIA.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Resumen IA del sistema';
        if (respuesta) {
            Swal.fire({
                title: 'Resumen del sistema',
                text: respuesta,
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#2563eb'
            });
        } else {
            UI.toast('No se pudo generar el resumen.', 'error');
        }
    });

    let usuarios = [];
    let cursos = [];
    let vacantes = [];
    let matriculas = [];
    let grafico = null;

    async function cargar() {
        // El aviso de carga va dentro del propio tbody: escribirlo en la tabla
        // completa eliminaria el tbody y las filas se perderian.
        cuerpoTabla.innerHTML =
            '<tr><td colspan="7">Cargando la información del sistema…</td></tr>';
        try {
            const datos = await Datos.obtenerVarias('usuarios', 'cursos', 'vacantes', 'matriculas', 'empresas');
            usuarios = datos.usuarios;
            cursos = datos.cursos;
            vacantes = datos.vacantes;
            matriculas = datos.matriculas;
            aplicarVista();
        } catch (error) {
            cuerpoTabla.innerHTML =
                `<tr><td colspan="7" class="estado-error">${UI.escapar(error.message)}</td></tr>`;
            UI.toast('No se pudo cargar la información del sistema.', 'error');
        }
    }

    function filtrar() {
        const texto = buscador.value.trim().toLowerCase();
        const rol = filtroRol.value;
        const estado = filtroEstado.value;

        return usuarios.filter(usuario => {
            const pais = (usuario.nacionalidad || {}).nombre || '';
            const coincide = texto === '' ||
                `${usuario.nombres} ${usuario.apellidos} ${usuario.email} ${pais}`
                    .toLowerCase().includes(texto);
            const pasaRol = rol === '' || usuario.rol === rol;
            const activo = usuario.activo !== false;
            const pasaEstado = estado === '' || (estado === 'activo' ? activo : !activo);
            return coincide && pasaRol && pasaEstado;
        });
    }

    function ordenar(lista) {
        const copia = [...lista];
        switch (ordenUsuarios.value) {
            case 'nombre-asc': return copia.sort((a, b) => a.nombres.localeCompare(b.nombres));
            case 'nombre-desc': return copia.sort((a, b) => b.nombres.localeCompare(a.nombres));
            case 'fecha-desc': return copia.sort((a, b) => (b.fechaRegistro || '').localeCompare(a.fechaRegistro || ''));
            case 'fecha-asc': return copia.sort((a, b) => (a.fechaRegistro || '').localeCompare(b.fechaRegistro || ''));
            default: return copia;
        }
    }

    function aplicarVista() {
        const visibles = ordenar(filtrar());

        if (visibles.length === 0) {
            cuerpoTabla.innerHTML =
                '<tr><td colspan="7">Ningún usuario coincide con la búsqueda o los filtros.</td></tr>';
        } else {
            cuerpoTabla.innerHTML = visibles.map(usuario => {
                const config = Auth.ROLES[usuario.rol] || {};
                const pais = usuario.nacionalidad || {};
                const activo = usuario.activo !== false;
                const edad = usuario.fechaNacimiento
                    ? Validaciones.calcularEdad(usuario.fechaNacimiento)
                    : '—';
                const esYo = Number(usuario.id) === Number(administrador.id);

                return `
                <tr data-id="${usuario.id}">
                    <td>
                        <img src="${UI.fotoUsuario(usuario)}" alt="" class="avatar-nav">
                        ${UI.escapar(usuario.nombres + ' ' + usuario.apellidos)}
                    </td>
                    <td>${UI.escapar(usuario.email)}</td>
                    <td>${config.icono || ''} ${UI.escapar(config.etiqueta || usuario.rol)}</td>
                    <td>${pais.bandera || ''} ${UI.escapar(pais.nombre || '—')}</td>
                    <td>${edad}</td>
                    <td><span class="chip ${activo ? 'chip-disponible' : 'chip-agotado'}">
                        ${activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td>
                        <button type="button" class="btn btn-azul btn-xs" data-accion="detalle">Ver</button>
                        <button type="button" class="btn btn-gris btn-xs" data-accion="estado"
                            ${esYo ? 'disabled title="No puedes desactivar tu propia cuenta"' : ''}>
                            ${activo ? 'Desactivar' : 'Activar'}</button>
                        <button type="button" class="btn btn-rojo btn-xs" data-accion="eliminar"
                            ${esYo ? 'disabled title="No puedes eliminar tu propia cuenta"' : ''}>
                            Eliminar</button>
                    </td>
                </tr>`;
            }).join('');
        }

        contador.textContent = `Mostrando ${visibles.length} de ${usuarios.length} usuarios registrados.`;
        pintarIndicadores();
        pintarGrafico();
    }

    function pintarIndicadores() {
        const porRol = rol => usuarios.filter(u => u.rol === rol).length;
        const nacionalidades = new Set(
            usuarios.map(u => (u.nacionalidad || {}).nombre).filter(Boolean)
        ).size;

        const tarjetas = [
            ['Usuarios totales', usuarios.length, '#2563eb'],
            ['Estudiantes', porRol('estudiante'), '#3b82f6'],
            ['Instructores', porRol('instructor'), '#10b981'],
            ['Empresas', porRol('empresa'), '#8b5cf6'],
            ['Cuentas activas', usuarios.filter(u => u.activo !== false).length, '#16a34a'],
            ['Nacionalidades', nacionalidades, '#f59e0b'],
            ['Cursos publicados', cursos.length, '#0ea5e9'],
            ['Vacantes abiertas', vacantes.filter(v => v.estado === 'abierta').length, '#ef4444'],
            ['Matrículas', matriculas.length, '#7c3aed']
        ];

        indicadores.innerHTML = tarjetas.map(([etiqueta, valor, color]) => `
            <section class="indicador" style="border-left-color:${color}">
                <p class="valor">${valor}</p>
                <p class="etiqueta">${etiqueta}</p>
            </section>`).join('');
    }

    function pintarGrafico() {
        const lienzo = document.getElementById('grafico-roles');
        if (!lienzo || typeof Chart === 'undefined') return;

        const roles = Object.keys(Auth.ROLES);
        const valores = roles.map(rol => usuarios.filter(u => u.rol === rol).length);

        if (grafico) grafico.destroy();
        grafico = new Chart(lienzo, {
            type: 'doughnut',
            data: {
                labels: roles.map(rol => Auth.ROLES[rol].etiqueta),
                datasets: [{
                    data: valores,
                    backgroundColor: roles.map(rol => Auth.ROLES[rol].color)
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    /* --------------------------------------------------------- acciones */
    async function verDetalle(usuario) {
        const config = Auth.ROLES[usuario.rol] || {};
        const contacto = usuario.contacto || {};
        const pais = usuario.nacionalidad || {};
        const suyas = matriculas.filter(m => Number(m.usuarioId) === Number(usuario.id));

        await UI.detalle(`${usuario.nombres} ${usuario.apellidos}`, `
            <img src="${UI.fotoUsuario(usuario)}" alt=""
                 style="width:96px;height:96px;border-radius:50%;object-fit:cover;margin-bottom:12px">
            <table class="tabla-datos">
                <tbody>
                    <tr><th>Correo</th><td>${UI.escapar(usuario.email)}</td></tr>
                    <tr><th>Rol</th><td>${config.icono || ''} ${UI.escapar(config.etiqueta || '')}</td></tr>
                    <tr><th>Nacionalidad</th><td>${pais.bandera || ''} ${UI.escapar(pais.nombre || '—')}</td></tr>
                    <tr><th>Nacimiento</th><td>${UI.fecha(usuario.fechaNacimiento)}</td></tr>
                    <tr><th>Teléfono</th><td>${UI.escapar(contacto.telefono || '—')}</td></tr>
                    <tr><th>Ciudad</th><td>${UI.escapar(contacto.ciudad || '—')}</td></tr>
                    <tr><th>Matrículas</th><td>${suyas.length}</td></tr>
                    <tr><th>Estado</th><td>${usuario.activo === false ? 'Desactivado' : 'Activo'}</td></tr>
                    <tr><th>Registro</th><td>${UI.fecha(usuario.fechaRegistro)}</td></tr>
                </tbody>
            </table>`);
    }

    async function cambiarEstado(usuario) {
        const activo = usuario.activo !== false;
        const confirmado = await UI.confirmar(
            activo ? '¿Desactivar la cuenta?' : '¿Activar la cuenta?',
            activo
                ? `${usuario.nombres} no podrá iniciar sesión hasta que se reactive su cuenta.`
                : `${usuario.nombres} volverá a tener acceso a la plataforma.`,
            activo ? 'Sí, desactivar' : 'Sí, activar'
        );
        if (!confirmado) return;

        Datos.actualizar('usuarios', usuario.id, { activo: !activo });
        usuarios = Datos.cache('usuarios');
        aplicarVista();
        UI.toast(activo ? 'Cuenta desactivada.' : 'Cuenta activada.', 'info');
    }

    async function eliminar(usuario) {
        const confirmado = await UI.confirmar(
            '¿Eliminar el usuario?',
            `Se eliminará la cuenta de ${usuario.nombres} ${usuario.apellidos} y sus matrículas. ` +
            `Esta acción no se puede deshacer.`,
            'Sí, eliminar'
        );
        if (!confirmado) return;

        // Se eliminan tambien los registros relacionados para no dejar huerfanos.
        const restantes = Datos.cache('matriculas')
            .filter(m => Number(m.usuarioId) !== Number(usuario.id));
        Datos.guardar('matriculas', restantes);
        Datos.eliminar('usuarios', usuario.id);

        usuarios = Datos.cache('usuarios');
        matriculas = Datos.cache('matriculas');
        aplicarVista();
        UI.toast('Usuario eliminado del sistema.', 'info');
    }

    /* ----------------------------------------------------------- eventos */
    buscador.addEventListener('input', aplicarVista);
    filtroRol.addEventListener('change', aplicarVista);
    filtroEstado.addEventListener('change', aplicarVista);
    ordenUsuarios.addEventListener('change', aplicarVista);

    cuerpoTabla.addEventListener('click', async evento => {
        const boton = evento.target.closest('button[data-accion]');
        if (!boton) return;

        const fila = boton.closest('tr');
        const usuario = usuarios.find(u => Number(u.id) === Number(fila.dataset.id));
        if (!usuario) {
            UI.error('Registro no encontrado', 'El usuario ya no existe en el sistema.');
            return;
        }

        switch (boton.dataset.accion) {
            case 'detalle': await verDetalle(usuario); break;
            case 'estado': await cambiarEstado(usuario); break;
            case 'eliminar': await eliminar(usuario); break;
        }
    });

    botonRestablecer.addEventListener('click', async () => {
        const confirmado = await UI.confirmar(
            'Restablecer todo el sistema',
            'Se descartarán todos los cambios y se recargarán los archivos JSON originales. ' +
            'Tu sesión se cerrará por seguridad. ¿Continuar?',
            'Sí, restablecer'
        );
        if (!confirmado) return;

        try {
            const total = await Datos.restablecer();
            UI.toast(`${total} registros restablecidos.`, 'exito');
            Auth.cerrarSesion();
            setTimeout(() => { window.location.href = '../login/login.html'; }, 900);
        } catch (error) {
            UI.error('No se pudieron restablecer los datos', error.message);
        }
    });

    await cargar();
});
