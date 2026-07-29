/* ============================================================================
   admin.js — Panel exclusivo del administrador

   Esta pagina esta protegida por rol: cualquier usuario que no sea admin es
   devuelto a su propio panel, incluso si escribe la URL directamente.
   Incluye: banner de bienvenida, contadores animados, feed de actividad,
   graficos Chart.js y gestion completa de usuarios.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    const administrador = Auth.proteger(['admin']);
    if (!administrador) return;

    UI.pintarPerfilLateral(administrador);

    /* ────────────────────────────────────── banner bienvenida */
    const bannerSaludo = document.getElementById('banner-saludo');
    const bannerFecha = document.getElementById('banner-fecha');

    function actualizarBanner() {
        const hora = new Date().getHours();
        let saludo = 'Buenos días';
        if (hora >= 12 && hora < 19) saludo = 'Buenas tardes';
        else if (hora >= 19) saludo = 'Buenas noches';
        bannerSaludo.textContent = `${saludo}, ${administrador.nombres}`;
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        bannerFecha.textContent = new Date().toLocaleDateString('es-EC', opciones);
    }
    actualizarBanner();
    setInterval(actualizarBanner, 30000);

    /* ────────────────────────────────────── DOM refs */
    const cuerpoTabla = document.getElementById('tabla-usuarios');
    const buscador = document.getElementById('buscar-usuario');
    const filtroRol = document.getElementById('filtro-rol');
    const filtroEstado = document.getElementById('filtro-estado');
    const ordenUsuarios = document.getElementById('orden-usuarios');
    const contador = document.getElementById('contador-usuarios');
    const indicadores = document.getElementById('indicadores-admin');
    const botonRestablecer = document.getElementById('btn-restablecer-admin');
    const feedActividad = document.getElementById('feed-actividad');

    /* ────────────────────────────────────── boton IA */
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

    /* ────────────────────────────────────── state */
    let usuarios = [];
    let cursos = [];
    let vacantes = [];
    let matriculas = [];
    let graficoRoles = null;
    let graficoCursos = null;

    /* ────────────────────────────────────── cargar datos */
    async function cargar() {
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

    /* ────────────────────────────────────── filtrar / ordenar */
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

    /* ────────────────────────────────────── vista: tabla */
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
                    <td>${renderizarBandera(pais)} ${UI.escapar(pais.nombre || '—')}</td>
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
        pintarGraficos();
        pintarFeedActividad();
    }

    /* ────────────────────────────────────── contadores animados */
    function animarContador(elemento, destino, duracion = 800) {
        const inicio = performance.now();
        const paso = timestamp => {
            const progreso = Math.min((timestamp - inicio) / duracion, 1);
            const eased = 1 - Math.pow(1 - progreso, 3);
            elemento.textContent = Math.round(eased * destino);
            if (progreso < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
    }

    /* ────────────────────────────────────── indicadores KPI */
    function pintarIndicadores() {
        const porRol = rol => usuarios.filter(u => u.rol === rol).length;
        const nacionalidades = new Set(
            usuarios.map(u => (u.nacionalidad || {}).nombre).filter(Boolean)
        ).size;
        const activos = usuarios.filter(u => u.activo !== false).length;
        const desactivados = usuarios.length - activos;

        const tarjetas = [
            ['👥', 'Usuarios totales', usuarios.length, '#2563eb'],
            ['🎓', 'Estudiantes', porRol('estudiante'), '#3b82f6'],
            ['👨‍🏫', 'Instructores', porRol('instructor'), '#10b981'],
            ['🏢', 'Empresas', porRol('empresa'), '#8b5cf6'],
            ['✅', 'Activos', activos, '#16a34a'],
            ['⛔', 'Desactivados', desactivados, '#ef4444'],
            ['🌍', 'Nacionalidades', nacionalidades, '#f59e0b'],
            ['📚', 'Cursos publicados', cursos.length, '#0ea5e9'],
            ['📌', 'Vacantes abiertas', vacantes.filter(v => v.estado === 'abierta').length, '#ef4444'],
            ['📝', 'Matrículas', matriculas.length, '#7c3aed']
        ];

        indicadores.innerHTML = tarjetas.map(([icono, etiqueta, valor, color]) => `
            <section class="indicador" style="border-left-color:${color}">
                <p class="valor" style="display:flex;align-items:center;gap:6px;justify-content:center">
                    <span style="font-size:18px">${icono}</span> <span class="counter" data-valor="${valor}">0</span>
                </p>
                <p class="etiqueta">${etiqueta}</p>
            </section>`).join('');

        indicadores.querySelectorAll('.counter').forEach(el => {
            animarContador(el, parseInt(el.dataset.valor, 10));
        });
    }

    /* ────────────────────────────────────── graficos */
    function pintarGraficos() {
        pintarGraficoRoles();
        pintarGraficoCursos();
    }

    function pintarGraficoRoles() {
        const lienzo = document.getElementById('grafico-roles');
        if (!lienzo || typeof Chart === 'undefined') return;

        const roles = Object.keys(Auth.ROLES);
        const valores = roles.map(rol => usuarios.filter(u => u.rol === rol).length);

        if (graficoRoles) graficoRoles.destroy();
        graficoRoles = new Chart(lienzo, {
            type: 'doughnut',
            data: {
                labels: roles.map(rol => Auth.ROLES[rol].etiqueta),
                datasets: [{
                    data: valores,
                    backgroundColor: roles.map(rol => Auth.ROLES[rol].color),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
                }
            }
        });
    }

    function pintarGraficoCursos() {
        const lienzo = document.getElementById('grafico-cursos');
        if (!lienzo || typeof Chart === 'undefined') return;

        const estados = {};
        cursos.forEach(c => {
            const e = c.estado || 'sin estado';
            estados[e] = (estados[e] || 0) + 1;
        });

        const etiquetas = Object.keys(estados);
        const valores = Object.values(estados);
        const colores = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

        if (graficoCursos) graficoCursos.destroy();
        graficoCursos = new Chart(lienzo, {
            type: 'bar',
            data: {
                labels: etiquetas.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
                datasets: [{
                    label: 'Cursos',
                    data: valores,
                    backgroundColor: colores.slice(0, etiquetas.length),
                    borderRadius: 6,
                    maxBarThickness: 50
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    /* ────────────────────────────────────── feed de actividad */
    function pintarFeedActividad() {
        const eventos = [];

        usuarios.slice().sort((a, b) => (b.fechaRegistro || '').localeCompare(a.fechaRegistro || '')).slice(0, 5).forEach(u => {
            const config = Auth.ROLES[u.rol] || {};
            eventos.push({
                icono: config.icono || '👤',
                color: config.color || '#64748b',
                texto: `<strong>${UI.escapar(u.nombres)} ${UI.escapar(u.apellidos)}</strong> se registró como <strong>${UI.escapar(config.etiqueta || u.rol)}</strong>`,
                fecha: u.fechaRegistro
            });
        });

        matriculas.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 3).forEach(m => {
            const u = usuarios.find(us => Number(us.id) === Number(m.usuarioId));
            const c = cursos.find(cs => Number(cs.id) === Number(m.cursoId));
            if (u && c) {
                eventos.push({
                    icono: '📝',
                    color: '#7c3aed',
                    texto: `<strong>${UI.escapar(u.nombres)}</strong> se matriculó en <strong>${UI.escapar(c.nombre)}</strong>`,
                    fecha: m.fecha
                });
            }
        });

        eventos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        if (eventos.length === 0) {
            feedActividad.innerHTML = '<li class="feed-item"><span class="feed-texto">No hay actividad reciente.</span></li>';
            return;
        }

        feedActividad.innerHTML = eventos.slice(0, 8).map(ev => `
            <li class="feed-item">
                <span class="feed-icono" style="background:${ev.color}20;color:${ev.color}">${ev.icono}</span>
                <span class="feed-texto">${ev.texto}</span>
                <span class="feed-hora">${UI.fecha(ev.fecha)}</span>
            </li>`).join('');
    }

    /* ────────────────────────────────────── acciones tabla */
    function renderizarBandera(pais) {
        if (pais.banderaSmall) {
            return `<img src="${pais.banderaSmall}" width="24" height="18" style="vertical-align:middle;border-radius:2px;border:1px solid #e2e8f0;margin-right:4px" onerror="this.onerror=null;this.src='https://flagcdn.com/24x18/${(pais.codigo||'').toLowerCase()}.png';this.onerror=function(){this.style.display='none'}">`;
        }
        if (pais.codigo) {
            const codigo = pais.codigo.toLowerCase();
            return `<img src="https://flagcdn.com/24x18/${codigo}.png" width="24" height="18" style="vertical-align:middle;border-radius:2px;border:1px solid #e2e8f0;margin-right:4px" onerror="this.style.display='none'">`;
        }
        return pais.bandera || '';
    }

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
                    <tr><th>Nacionalidad</th><td>${renderizarBandera(pais)} ${UI.escapar(pais.nombre || '—')}</td></tr>
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

        const restantes = Datos.cache('matriculas')
            .filter(m => Number(m.usuarioId) !== Number(usuario.id));
        Datos.guardar('matriculas', restantes);
        Datos.eliminar('usuarios', usuario.id);

        usuarios = Datos.cache('usuarios');
        matriculas = Datos.cache('matriculas');
        aplicarVista();
        UI.toast('Usuario eliminado del sistema.', 'info');
    }

    /* ────────────────────────────────────── eventos */
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
