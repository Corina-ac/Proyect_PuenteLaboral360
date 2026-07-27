/* ============================================================================
   login.js — Inicio de sesion

   El formulario ya no pregunta el rol: lo deduce del usuario registrado.
   Si el correo no existe en usuarios.json ni en localStorage, se ofrece
   ir al formulario de registro.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    // Quien ya tiene la sesion abierta no vuelve a ver el formulario.
    if (Auth.redirigirSiAutenticado()) return;

    const formulario = document.getElementById('form-login');
    const inputEmail = document.getElementById('email');
    const inputPassword = document.getElementById('password');
    const campoAdmin = document.getElementById('campo-admin');
    const inputCodigo = document.getElementById('codigo-admin');
    const botonEntrar = document.getElementById('btn-entrar');
    const estado = document.getElementById('estado-login');
    const verPassword = document.getElementById('ver-password');
    const cuerpoDemo = document.getElementById('tabla-demo-cuerpo');

    /* ------------------------------- carga inicial de los usuarios ------- */
    let usuarios = [];
    try {
        usuarios = await Datos.obtener('usuarios');
        pintarCuentasDemo(usuarios);
    } catch (error) {
        estado.textContent = error.message;
        estado.classList.add('estado-negativo');
        UI.error('No se pudieron cargar los usuarios', error.message);
    }

    // Aviso guardado por una redireccion de seguridad ("inicia sesion para...").
    const aviso = Storage.leer('avisoLogin', null);
    if (aviso) {
        Storage.eliminar('avisoLogin');
        UI.toast(aviso, 'aviso');
    }

    /* ------------------------------------------- tabla de cuentas demo --- */
    function pintarCuentasDemo(lista) {
        // Una cuenta representativa por rol, generada desde el JSON.
        const ejemplos = { estudiante: 'Estudiante123.', instructor: 'Instructor123.', empresa: 'Empresa123.', admin: 'Admin1234.' };
        const filas = Object.keys(ejemplos)
            .map(rol => {
                const usuario = lista.find(u => u.rol === rol);
                if (!usuario) return '';
                const config = Auth.ROLES[rol];
                return `<tr>
                    <td>${config.icono} ${config.etiqueta}</td>
                    <td><button type="button" class="btn-usar-demo" data-email="${usuario.email}"
                        data-password="${ejemplos[rol]}">${UI.escapar(usuario.email)}</button></td>
                    <td><code>${ejemplos[rol]}</code></td>
                </tr>`;
            })
            .join('');
        cuerpoDemo.innerHTML = filas || '<tr><td colspan="3">Sin cuentas registradas.</td></tr>';
    }

    // Evento delegado: los botones se crean dinamicamente.
    cuerpoDemo.addEventListener('click', evento => {
        const boton = evento.target.closest('.btn-usar-demo');
        if (!boton) return;
        inputEmail.value = boton.dataset.email;
        inputPassword.value = boton.dataset.password;
        inputEmail.dispatchEvent(new Event('input'));
        UI.toast('Credenciales copiadas al formulario.', 'info');
    });

    /* --------------------- deteccion del rol mientras se escribe --------- */
    // Al reconocer el correo se muestra el rol; si es admin aparece el
    // segundo campo de seguridad.
    inputEmail.addEventListener('input', () => {
        Validaciones.limpiarError(inputEmail);
        Validaciones.limpiarOk(inputEmail);
        const correo = inputEmail.value.trim().toLowerCase();
        const usuario = usuarios.find(u => u.email.toLowerCase() === correo);

        if (!usuario) {
            campoAdmin.classList.add('oculto');
            inputCodigo.value = '';
            estado.textContent = '';
            estado.className = 'estado-login';
            // Aun sin cuenta reconocida, se avisa si el formato es incorrecto.
            if (correo) {
                const formato = Validaciones.validarEmail(correo);
                if (!formato.valido) {
                    estado.textContent = formato.mensaje;
                    estado.className = 'estado-login estado-negativo';
                } else {
                    estado.textContent = 'Formato correcto, pero no hay cuenta con ese correo.';
                    estado.className = 'estado-login';
                }
            }
            return;
        }

        const config = Auth.ROLES[usuario.rol];
        estado.textContent = `Cuenta reconocida: ${config.icono} ${config.etiqueta}`;
        estado.className = 'estado-login estado-positivo';
        Validaciones.mostrarOk(inputEmail, 'Correo reconocido ✔');
        campoAdmin.classList.toggle('oculto', usuario.rol !== 'admin');
    });

    // El campo de contrasena limpia su error en cuanto se vuelve a escribir.
    inputPassword.addEventListener('input', () => {
        Validaciones.limpiarError(inputPassword);
        Validaciones.limpiarOk(inputPassword);
    });

    verPassword.addEventListener('click', () => {
        const visible = inputPassword.type === 'text';
        inputPassword.type = visible ? 'password' : 'text';
        verPassword.textContent = visible ? '👁️' : '🙈';
    });

    /* ------------------------------------------------------ envio ------- */
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();

        const email = inputEmail.value.trim();
        const password = inputPassword.value;

        // Validacion de formato antes de consultar los datos.
        const okEmail = Validaciones.aplicar(inputEmail, Validaciones.validarEmail(email));
        const okPassword = Validaciones.aplicar(
            inputPassword,
            password ? { valido: true, mensaje: '' } : { valido: false, mensaje: 'Ingresa tu contrasena.' }
        );
        if (!okEmail || !okPassword) {
            UI.toast('Revisa los campos marcados en rojo.', 'error');
            return;
        }

        botonEntrar.disabled = true;
        botonEntrar.textContent = 'Verificando…';

        try {
            const resultado = await Auth.iniciarSesion(email, password, inputCodigo.value);

            if (resultado.ok) {
                const config = Auth.ROLES[resultado.usuario.rol];
                UI.toast(`Bienvenido/a, ${resultado.usuario.nombres}.`, 'exito');
                await UI.alerta(
                    `${config.icono} Acceso concedido`,
                    `Ingresaste como ${config.etiqueta}. Te llevamos a tu panel.`,
                    'success'
                );

                // Si la sesion se pidio al intentar entrar a una pagina privada,
                // se regresa a esa pagina; si no, al panel del rol.
                const destino = Storage.leer('destinoPendiente', null);
                Storage.eliminar('destinoPendiente');
                window.location.href = destino && !destino.includes('login') && !destino.includes('registro')
                    ? destino
                    : Auth.panelDe(resultado.usuario.rol);
                return;
            }

            /* ------------------------------ manejo de cada motivo de fallo */
            if (resultado.motivo === 'no-registrado') {
                const registrarse = await UI.confirmar(
                    'Cuenta no encontrada',
                    `El correo ${email} no está registrado en la plataforma. ¿Deseas crear una cuenta ahora?`,
                    'Sí, registrarme'
                );
                if (registrarse) {
                    Storage.guardar('emailPrellenado', email);
                    window.location.href = '../registro/registro.html';
                }
            } else if (resultado.motivo === 'password') {
                Validaciones.mostrarError(inputPassword, 'La contrasena no coincide con la cuenta.');
                UI.error('Contraseña incorrecta', 'Verifica tu contraseña e inténtalo nuevamente.');
            } else if (resultado.motivo === 'codigo-admin') {
                campoAdmin.classList.remove('oculto');
                Validaciones.mostrarError(inputCodigo, 'Codigo de administrador incorrecto o vacio.');
                UI.error('Acceso administrativo denegado',
                    'La cuenta de administrador requiere un código de seguridad válido.');
            } else if (resultado.motivo === 'inactivo') {
                UI.error('Cuenta desactivada',
                    'Esta cuenta fue desactivada. Comunícate con el administrador de la plataforma.');
            }
        } catch (error) {
            UI.error('No se pudo iniciar sesión', error.message);
        } finally {
            botonEntrar.disabled = false;
            botonEntrar.textContent = 'Iniciar Sesión';
        }
    });

    // Un correo prellenado desde el registro agiliza la prueba.
    const prellenado = Storage.leer('emailPrellenado', null);
    if (prellenado) {
        Storage.eliminar('emailPrellenado');
        inputEmail.value = prellenado;
        inputEmail.dispatchEvent(new Event('input'));
    }
});
