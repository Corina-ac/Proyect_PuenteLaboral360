/* ============================================================================
   auth.js — Sesion, roles y proteccion de paginas

   Roles del sistema:
     estudiante  — accede a cursos, su perfil y su panel.
     instructor  — gestiona sus cursos y sus matriculados.
     empresa     — publica vacantes y busca talento.
     admin       — administra todo; exige un codigo de acceso adicional.

   El rol NO se elige al iniciar sesion: se toma del registro guardado del
   usuario. Si el correo no esta registrado, el sistema envia al formulario
   de registro.
   ========================================================================== */

const Auth = (() => {

    const CLAVE_SESION = 'sesion';

    /** Configuracion de cada rol: panel de inicio, etiqueta y color. */
    const ROLES = {
        estudiante: {
            etiqueta: 'Estudiante',
            icono: '🎓',
            panel: 'pages/dashboard-estudiante/dashboard-estudiante.html',
            color: '#3b82f6'
        },
        instructor: {
            etiqueta: 'Instructor',
            icono: '👨‍🏫',
            panel: 'pages/dashboard-instructor/dashboard-instructor.html',
            color: '#10b981'
        },
        empresa: {
            etiqueta: 'Empresa / Reclutador',
            icono: '🏢',
            panel: 'pages/dashboard-empresa/dashboard-empresa.html',
            color: '#8b5cf6'
        },
        admin: {
            etiqueta: 'Administrador',
            icono: '🛡️',
            panel: 'pages/admin/admin.html',
            color: '#ef4444'
        }
    };

    /* --------------------------------------------------------- sesion */
    /** Devuelve el usuario en sesion o null. */
    function usuarioActual() {
        return Storage.leer(CLAVE_SESION, null);
    }

    function haySesion() {
        return usuarioActual() !== null;
    }

    function rolActual() {
        const usuario = usuarioActual();
        return usuario ? usuario.rol : null;
    }

    function tieneRol(...roles) {
        const rol = rolActual();
        return rol !== null && roles.includes(rol);
    }

    /** Guarda la sesion sin exponer el hash de la contrasena. */
    function abrirSesion(usuario) {
        const { passwordHash, codigoAccesoHash, ...seguro } = usuario;
        seguro.inicioSesion = new Date().toISOString();
        Storage.guardar(CLAVE_SESION, seguro);
        return seguro;
    }

    function cerrarSesion() {
        Storage.eliminar(CLAVE_SESION);
    }

    /** Ruta absoluta (dentro del proyecto) del panel que corresponde al rol. */
    function panelDe(rol) {
        const config = ROLES[rol] || ROLES.estudiante;
        return Datos.rutaBase() + config.panel;
    }

    function irAPanel(rol = rolActual()) {
        window.location.href = panelDe(rol);
    }

    function irALogin(mensaje) {
        if (mensaje) Storage.guardar('avisoLogin', mensaje);
        // Se recuerda a donde queria entrar para volver despues de autenticarse.
        Storage.guardar('destinoPendiente', window.location.href);
        window.location.href = Datos.rutaBase() + 'pages/login/login.html';
    }

    /* ---------------------------------------------------- autenticacion */
    /**
     * Verifica las credenciales contra los usuarios registrados.
     * Devuelve { ok, motivo, usuario }:
     *   motivo = 'no-registrado' | 'password' | 'codigo-admin' | 'inactivo'
     */
    async function iniciarSesion(email, password, codigoAdmin = '') {
        const usuarios = await Datos.obtener('usuarios');
        const correo = (email || '').trim().toLowerCase();

        const usuario = usuarios.find(u => u.email.toLowerCase() === correo);
        if (!usuario) {
            return { ok: false, motivo: 'no-registrado', usuario: null };
        }
        if (usuario.activo === false) {
            return { ok: false, motivo: 'inactivo', usuario: null };
        }
        if (usuario.passwordHash !== Validaciones.hashSimple(password)) {
            return { ok: false, motivo: 'password', usuario: null };
        }
        // Segundo factor exclusivo del administrador.
        if (usuario.rol === 'admin') {
            if (!codigoAdmin || usuario.codigoAccesoHash !== Validaciones.hashSimple(codigoAdmin.trim())) {
                return { ok: false, motivo: 'codigo-admin', usuario: null };
            }
        }

        return { ok: true, motivo: '', usuario: abrirSesion(usuario) };
    }

    /** Indica si un correo ya esta registrado (para el formulario de registro). */
    async function existeEmail(email) {
        const usuarios = await Datos.obtener('usuarios');
        return usuarios.some(u => u.email.toLowerCase() === (email || '').trim().toLowerCase());
    }

    /**
     * Registra un usuario nuevo, lo guarda en la coleccion y abre su sesion.
     * El rol admin no puede crearse desde el formulario publico.
     */
    async function registrar(datosUsuario) {
        await Datos.obtener('usuarios'); // asegura que la coleccion este en cache

        if (datosUsuario.rol === 'admin') {
            throw new Error('El rol de administrador no puede crearse desde el registro publico.');
        }
        if (await existeEmail(datosUsuario.email)) {
            throw new Error('Ese correo electronico ya esta registrado.');
        }

        const nuevo = Datos.agregar('usuarios', {
            nombres: datosUsuario.nombres.trim(),
            apellidos: datosUsuario.apellidos.trim(),
            email: datosUsuario.email.trim().toLowerCase(),
            passwordHash: Validaciones.hashSimple(datosUsuario.password),
            rol: datosUsuario.rol,
            fechaNacimiento: datosUsuario.fechaNacimiento,
            nacionalidad: datosUsuario.nacionalidad,
            iniciales: (datosUsuario.nombres[0] + datosUsuario.apellidos[0]).toUpperCase(),
            activo: true,
            codigoAccesoHash: null,
            avatar: datosUsuario.avatar || null,
            contacto: {
                telefono: datosUsuario.telefono || '',
                ciudad: datosUsuario.ciudad || '',
                direccion: ''
            },
            preferencias: {
                notificaciones: true,
                categoriaFavoritaId: datosUsuario.categoriaFavoritaId || 1,
                modalidad: 'Virtual'
            },
            habilidades: datosUsuario.habilidades || [],
            nivel: datosUsuario.nivel || 'Principiante',
            objetivo: datosUsuario.objetivo || '',
            fechaRegistro: new Date().toISOString().slice(0, 10)
        });

        return abrirSesion(nuevo);
    }

    /** Actualiza el usuario en sesion y en la coleccion (perfil, avatar, etc.). */
    function actualizarPerfil(cambios) {
        const actual = usuarioActual();
        if (!actual) return null;
        const actualizado = Datos.actualizar('usuarios', actual.id, cambios);
        if (!actualizado) return null;
        return abrirSesion(actualizado);
    }

    /* ------------------------------------------------------- proteccion */
    /**
     * Guardia de pagina. Debe llamarse al inicio de cada pagina privada.
     * Si no hay sesion envia al login; si el rol no coincide envia a su panel.
     * Devuelve el usuario cuando el acceso es valido.
     */
    function proteger(rolesPermitidos = []) {
        const usuario = usuarioActual();

        if (!usuario) {
            irALogin('Debes iniciar sesion para acceder a esta pagina.');
            return null;
        }
        if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
            Storage.guardar('avisoAcceso',
                `Tu cuenta de ${ROLES[usuario.rol].etiqueta} no tiene acceso a esa seccion.`);
            window.location.href = panelDe(usuario.rol);
            return null;
        }
        return usuario;
    }

    /** Redirige al panel si el usuario YA inicio sesion (login y registro). */
    function redirigirSiAutenticado() {
        const usuario = usuarioActual();
        if (usuario) {
            window.location.href = panelDe(usuario.rol);
            return true;
        }
        return false;
    }

    return {
        ROLES, CLAVE_SESION,
        usuarioActual, haySesion, rolActual, tieneRol,
        iniciarSesion, registrar, existeEmail, cerrarSesion,
        actualizarPerfil, abrirSesion,
        proteger, redirigirSiAutenticado, panelDe, irAPanel, irALogin
    };
})();
