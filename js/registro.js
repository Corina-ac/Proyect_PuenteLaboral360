/* ============================================================================
   registro.js — Alta de usuarios

   Incluye:
     - Validacion de edad entre 16 y 60 anios (plataforma laboral).
     - Selector de nacionalidad alimentado por la API countries.dev.
     - Rol fijado cuando se llega desde un plan concreto (?rol=estudiante).
     - Foto de perfil opcional guardada como data URI en localStorage.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    if (Auth.redirigirSiAutenticado()) return;

    const formulario = document.getElementById('form-registro');
    const selectRol = document.getElementById('rol');
    const notaRol = document.getElementById('nota-rol');
    const textoContexto = document.getElementById('texto-contexto');
    const inputNombres = document.getElementById('nombres');
    const inputApellidos = document.getElementById('apellidos');
    const inputEmail = document.getElementById('email');
    const inputPassword = document.getElementById('password');
    const inputPassword2 = document.getElementById('password2');
    const inputFecha = document.getElementById('fecha-nacimiento');
    const notaEdad = document.getElementById('nota-edad');
    const inputTelefono = document.getElementById('telefono');
    const inputCiudad = document.getElementById('ciudad');
    const inputTerminos = document.getElementById('terminos');
    const inputAvatar = document.getElementById('avatar');
    const previaAvatar = document.getElementById('previa-avatar');
    const bloqueEstudiante = document.getElementById('bloque-estudiante');
    const listaHabilidades = document.getElementById('lista-habilidades');
    const botonRegistrar = document.getElementById('btn-registrar');

    // Selector de pais
    const inputBuscarPais = document.getElementById('buscar-pais');
    const listaPaises = document.getElementById('lista-paises');
    const paisElegido = document.getElementById('pais-elegido');
    const paisNombre = document.getElementById('pais-nombre');
    const paisCodigo = document.getElementById('pais-codigo');
    const paisBandera = document.getElementById('pais-bandera');
    const paisBanderaSmall = document.getElementById('pais-bandera-small');

    let avatarDataUri = null;

    /* ------------------------------------------------- rol preseleccionado */
    // Los planes de la pagina de servicios enlazan con ?rol=estudiante, de modo
    // que el usuario ya no puede elegir un rol distinto al del plan comprado.
    const parametros = new URLSearchParams(window.location.search);
    const rolFijo = parametros.get('rol');
    const plan = parametros.get('plan');

    if (rolFijo && Auth.ROLES[rolFijo] && rolFijo !== 'admin') {
        selectRol.value = rolFijo;
        selectRol.disabled = true;
        // Un select deshabilitado no se envia, pero aqui se lee por JavaScript.
        const config = Auth.ROLES[rolFijo];
        notaRol.textContent = `Registro exclusivo para el rol ${config.etiqueta}.`;
        if (plan) {
            textoContexto.textContent =
                `Estás creando tu cuenta de ${config.etiqueta} para el plan ${plan}.`;
        }
    }

    /* -------------------------------------------------- rango de fechas */
    const rango = Validaciones.rangoFechasPermitido();
    inputFecha.min = rango.min;
    inputFecha.max = rango.max;
    notaEdad.textContent =
        `Registro habilitado para personas de ${Validaciones.EDAD_MINIMA} a ${Validaciones.EDAD_MAXIMA} anios.`;

    /* ------------------------------------------------------ habilidades */
    // Las opciones se generan desde las categorias del JSON, no desde el HTML.
    try {
        const categorias = await Datos.obtener('categorias');
        listaHabilidades.innerHTML = categorias.map(categoria => `
            <label class="check-habilidad">
                <input type="checkbox" name="habilidad" value="${UI.escapar(categoria.nombre)}">
                ${categoria.icono} ${UI.escapar(categoria.nombre)}
            </label>`).join('');
    } catch (error) {
        listaHabilidades.innerHTML =
            `<p class="mensaje-error">No se pudieron cargar las áreas: ${UI.escapar(error.message)}</p>`;
    }

    /** Muestra el bloque de habilidades solo para el rol estudiante. */
    function ajustarBloquesPorRol() {
        bloqueEstudiante.classList.toggle('oculto', selectRol.value !== 'estudiante');
    }
    selectRol.addEventListener('change', ajustarBloquesPorRol);
    ajustarBloquesPorRol();

    /* -------------------------------------------------- API de paises */
    let paises = [];
    inputBuscarPais.placeholder = 'Cargando países…';
    inputBuscarPais.disabled = true;

    try {
        paises = await Api.obtenerPaises();
        inputBuscarPais.placeholder = 'Escribe para buscar tu país…';
        inputBuscarPais.disabled = false;
        UI.toast(`${paises.length} países cargados desde la API.`, 'info');
    } catch (error) {
        inputBuscarPais.disabled = false;
        inputBuscarPais.placeholder = 'Escribe tu país manualmente';
        Validaciones.mostrarError(inputBuscarPais, error.message);
        UI.toast('No se pudo cargar la lista de países.', 'error');
    }

    /* -------------------------------------------------- API de ciudades */
    const buscarCiudad = document.getElementById('buscar-ciudad');
    const listaCiudades = document.getElementById('lista-ciudades');
    const ciudadElegida = document.getElementById('ciudada-elegida');
    const ciudadNombre = document.getElementById('ciudad-nombre');
    let ciudadesCargadas = [];

    async function cargarCiudadesPorPais(codigoPais) {
        if (!buscarCiudad || !listaCiudades) return;
        if (!codigoPais) {
            buscarCiudad.disabled = true;
            buscarCiudad.placeholder = 'Primero selecciona un país';
            return;
        }
        buscarCiudad.disabled = true;
        buscarCiudad.placeholder = 'Cargando ciudades…';
        try {
            ciudadesCargadas = await Api.obtenerCiudades(codigoPais);
            buscarCiudad.disabled = false;
            buscarCiudad.placeholder = ciudadesCargadas.length > 0
                ? `Escribe para buscar tu ciudad (${ciudadesCargadas.length} disponibles)…`
                : 'Escribe tu ciudad manualmente';
        } catch (e) {
            ciudadesCargadas = [];
            buscarCiudad.disabled = false;
            buscarCiudad.placeholder = 'Escribe tu ciudad manualmente';
        }
    }

    function pintarCiudades(filtro = '') {
        if (!listaCiudades) return;
        const texto = filtro.trim().toLowerCase();
        const encontrados = texto === ''
            ? ciudadesCargadas.slice(0, 20)
            : ciudadesCargadas.filter(c => c.toLowerCase().includes(texto)).slice(0, 20);

        if (encontrados.length === 0) {
            listaCiudades.innerHTML = '<li class="sin-resultado">No se encontraron ciudades con ese nombre.</li>';
            listaCiudades.classList.remove('oculto');
            return;
        }

        listaCiudades.innerHTML = encontrados.map(nombre => `
            <li role="option" class="item-ciudad" data-nombre="${UI.escapar(nombre)}">
                <span>📍 ${UI.escapar(nombre)}</span>
            </li>`).join('');
        listaCiudades.classList.remove('oculto');
    }

    if (buscarCiudad) {
        buscarCiudad.addEventListener('input', () => {
            ciudadNombre.value = '';
            if (ciudadElegida) ciudadElegida.classList.add('oculto');
            pintarCiudades(buscarCiudad.value);
        });
        buscarCiudad.addEventListener('focus', () => pintarCiudades(buscarCiudad.value));
    }

    if (listaCiudades) {
        listaCiudades.addEventListener('click', evento => {
            const item = evento.target.closest('.item-ciudad');
            if (!item) return;
            ciudadNombre.value = item.dataset.nombre;
            if (buscarCiudad) buscarCiudad.value = item.dataset.nombre;
            if (ciudadElegida) {
                ciudadElegida.innerHTML = `Ciudad seleccionada: <strong>${UI.escapar(item.dataset.nombre)}</strong>`;
                ciudadElegida.classList.remove('oculto');
            }
            listaCiudades.classList.add('oculto');
        });
    }

    document.addEventListener('click', evento => {
        if (!evento.target.closest('.selector-ciudad') && listaCiudades) {
            listaCiudades.classList.add('oculto');
        }
    });

    /** Dibuja la lista desplegable de paises filtrada. */
    function pintarPaises(filtro = '') {
        const texto = filtro.trim().toLowerCase();
        const encontrados = texto === ''
            ? paises.slice(0, 30)
            : paises.filter(pais => pais.nombre.toLowerCase().includes(texto)).slice(0, 40);

        if (encontrados.length === 0) {
            listaPaises.innerHTML = '<li class="sin-resultado">No se encontraron países con ese nombre.</li>';
            listaPaises.classList.remove('oculto');
            inputBuscarPais.setAttribute('aria-expanded', 'true');
            return;
        }

        listaPaises.innerHTML = encontrados.map(pais => `
            <li role="option" class="item-pais" data-nombre="${UI.escapar(pais.nombre)}"
                data-codigo="${UI.escapar(pais.codigo)}" data-bandera="${pais.bandera}"
                data-bandera-small="${pais.banderaSmall}">
                <img class="bandera-img" src="${pais.banderaSmall}" alt="${UI.escapar(pais.nombre)}" width="24" height="18" loading="lazy"
                     onerror="this.style.display='none'">
                <span>${UI.escapar(pais.nombre)}</span>
                <span class="region">${UI.escapar(pais.region)}</span>
            </li>`).join('');
        listaPaises.classList.remove('oculto');
        inputBuscarPais.setAttribute('aria-expanded', 'true');
    }

    inputBuscarPais.addEventListener('input', () => {
        Validaciones.limpiarError(inputBuscarPais);
        paisNombre.value = '';
        paisElegido.classList.add('oculto');
        pintarPaises(inputBuscarPais.value);
    });
    inputBuscarPais.addEventListener('focus', () => pintarPaises(inputBuscarPais.value));

    // Evento delegado sobre elementos creados dinamicamente.
    listaPaises.addEventListener('click', evento => {
        const item = evento.target.closest('.item-pais');
        if (!item) return;
        paisNombre.value = item.dataset.nombre;
        paisCodigo.value = item.dataset.codigo;
        paisBandera.value = item.dataset.bandera;
        if (paisBanderaSmall) paisBanderaSmall.value = item.dataset.banderaSmall;
        inputBuscarPais.value = item.dataset.nombre;
        paisElegido.innerHTML = `Nacionalidad seleccionada: <img class="bandera-img" src="${item.dataset.banderaSmall}" width="24" height="18" alt="" onerror="this.style.display='none'"> <strong>${UI.escapar(item.dataset.nombre)}</strong>`;
        paisElegido.classList.remove('oculto');
        listaPaises.classList.add('oculto');
        inputBuscarPais.setAttribute('aria-expanded', 'false');
        cargarCiudadesPorPais(item.dataset.codigo);
    });

    // Cerrar la lista al hacer clic fuera o con la tecla Escape.
    document.addEventListener('click', evento => {
        if (!evento.target.closest('.selector-pais')) {
            listaPaises.classList.add('oculto');
            inputBuscarPais.setAttribute('aria-expanded', 'false');
        }
    });
    inputBuscarPais.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') listaPaises.classList.add('oculto');
    });

    /* ------------------------------------------------------- avatar */
    previaAvatar.src = UI.avatarDataUri('PL');
    inputAvatar.addEventListener('change', () => {
        const archivo = inputAvatar.files[0];
        if (!archivo) return;
        if (!archivo.type.startsWith('image/')) {
            UI.toast('El archivo seleccionado no es una imagen.', 'error');
            inputAvatar.value = '';
            return;
        }
        // Limite conservador: localStorage almacena texto y las data URI crecen.
        if (archivo.size > 400 * 1024) {
            UI.toast('La imagen supera los 400 KB. Elige una más liviana.', 'error');
            inputAvatar.value = '';
            return;
        }
        const lector = new FileReader();
        lector.onload = () => {
            avatarDataUri = lector.result;
            previaAvatar.src = avatarDataUri;
            UI.toast('Foto de perfil cargada.', 'exito');
        };
        lector.onerror = () => UI.toast('No se pudo leer la imagen.', 'error');
        lector.readAsDataURL(archivo);
    });

    /* -------------------------- validacion en vivo de algunos campos */
    inputFecha.addEventListener('change', () => {
        const resultado = Validaciones.validarFechaNacimiento(inputFecha.value);
        Validaciones.aplicar(inputFecha, resultado);
        if (resultado.valido) notaEdad.textContent = `Edad registrada: ${resultado.edad} anios. ✔`;
    });
    // Evento 'input': el usuario ve el resultado mientras escribe, sin esperar
    // a pulsar "Finalizar Registro".
    Validaciones.enVivo(inputNombres, valor => Validaciones.validarTexto(valor, 'El nombre'), 'Nombre valido ✔');
    Validaciones.enVivo(inputApellidos, valor => Validaciones.validarTexto(valor, 'El apellido'), 'Apellido valido ✔');
    Validaciones.enVivo(inputEmail, Validaciones.validarEmail, 'Correo con formato correcto ✔');
    Validaciones.enVivo(inputTelefono, Validaciones.validarTelefono, 'Telefono valido ✔');
    Validaciones.enVivo(inputCiudad, valor => Validaciones.validarTexto(valor, 'La ciudad'), 'Ciudad valida ✔');

    // Contrasena: ademas del formato, se informa la fuerza estimada.
    inputPassword.addEventListener('input', () => {
        const valor = inputPassword.value;
        if (!valor) {
            Validaciones.limpiarError(inputPassword);
            Validaciones.limpiarOk(inputPassword);
        } else {
            const resultado = Validaciones.validarPassword(valor);
            if (resultado.valido) {
                Validaciones.limpiarError(inputPassword);
                Validaciones.mostrarOk(inputPassword, `Contrasena valida (${valor.length} caracteres) ✔`);
            } else {
                Validaciones.limpiarOk(inputPassword);
                Validaciones.mostrarError(inputPassword, resultado.mensaje);
            }
        }
        comprobarCoincidencia();
    });

    // La confirmacion se revisa contra la contrasena en cada tecla.
    function comprobarCoincidencia() {
        if (!inputPassword2.value) {
            Validaciones.limpiarError(inputPassword2);
            Validaciones.limpiarOk(inputPassword2);
            return;
        }
        if (inputPassword2.value === inputPassword.value) {
            Validaciones.limpiarError(inputPassword2);
            Validaciones.mostrarOk(inputPassword2, 'Las contrasenas coinciden ✔');
        } else {
            Validaciones.limpiarOk(inputPassword2);
            Validaciones.mostrarError(inputPassword2, 'Las contrasenas no coinciden.');
        }
    }
    inputPassword2.addEventListener('input', comprobarCoincidencia);

    /* --------------------------------------------------------- envio */
    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();

        const rol = selectRol.value;
        let valido = true;

        if (!rol) {
            Validaciones.mostrarError(selectRol, 'Selecciona un rol.');
            valido = false;
        } else {
            Validaciones.limpiarError(selectRol);
        }

        valido = Validaciones.aplicar(inputNombres, Validaciones.validarTexto(inputNombres.value, 'El nombre')) && valido;
        valido = Validaciones.aplicar(inputApellidos, Validaciones.validarTexto(inputApellidos.value, 'El apellido')) && valido;
        valido = Validaciones.aplicar(inputEmail, Validaciones.validarEmail(inputEmail.value)) && valido;
        valido = Validaciones.aplicar(inputPassword, Validaciones.validarPassword(inputPassword.value)) && valido;

        const igualdad = inputPassword.value === inputPassword2.value
            ? { valido: true, mensaje: '' }
            : { valido: false, mensaje: 'Las contrasenas no coinciden.' };
        valido = Validaciones.aplicar(inputPassword2, igualdad) && valido;

        const resultadoEdad = Validaciones.validarFechaNacimiento(inputFecha.value);
        valido = Validaciones.aplicar(inputFecha, resultadoEdad) && valido;

        valido = Validaciones.aplicar(inputTelefono, Validaciones.validarTelefono(inputTelefono.value)) && valido;

        const nacionalidad = paisNombre.value
            ? { valido: true, mensaje: '' }
            : { valido: false, mensaje: 'Selecciona tu nacionalidad de la lista.' };
        valido = Validaciones.aplicar(inputBuscarPais, nacionalidad) && valido;

        if (!inputTerminos.checked) {
            Validaciones.mostrarError(inputTerminos, 'Debes aceptar los terminos y condiciones.');
            valido = false;
        } else {
            Validaciones.limpiarError(inputTerminos);
        }

        if (!valido) {
            UI.toast('Revisa los campos marcados en rojo.', 'error');
            document.querySelector('.campo-invalido')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        botonRegistrar.disabled = true;
        botonRegistrar.textContent = 'Guardando…';

        try {
            const habilidades = Array.from(
                document.querySelectorAll('input[name="habilidad"]:checked')
            ).map(check => check.value);

        const ciudadFinal = ciudadNombre && ciudadNombre.value ? ciudadNombre.value : inputCiudad.value;
        const usuario = await Auth.registrar({
                rol,
                nombres: inputNombres.value,
                apellidos: inputApellidos.value,
                email: inputEmail.value,
                password: inputPassword.value,
                fechaNacimiento: inputFecha.value,
                nacionalidad: {
                    nombre: paisNombre.value,
                    codigo: paisCodigo.value,
                    bandera: paisBandera.value,
                    banderaSmall: paisBanderaSmall ? paisBanderaSmall.value : ''
                },
                telefono: inputTelefono.value,
                ciudad: ciudadFinal,
                avatar: avatarDataUri,
                habilidades,
                nivel: document.querySelector('input[name="nivel"]:checked')?.value || 'Principiante',
                objetivo: document.getElementById('objetivo')?.value || ''
            });

            const config = Auth.ROLES[usuario.rol];
            UI.toast('Cuenta creada correctamente.', 'exito');
            await UI.alerta(
                '¡Registro completado!',
                `${usuario.nombres}, tu cuenta de ${config.etiqueta} fue creada. ` +
                `Ya puedes ingresar con tu correo y contraseña.`,
                'success'
            );
            window.location.href = Auth.panelDe(usuario.rol);

        } catch (error) {
            if (error.message.includes('ya esta registrado')) {
                Validaciones.mostrarError(inputEmail, error.message);
                const ir = await UI.confirmar('Correo ya registrado',
                    'Ese correo ya tiene una cuenta. ¿Deseas iniciar sesión?', 'Sí, iniciar sesión');
                if (ir) {
                    Storage.guardar('emailPrellenado', inputEmail.value.trim());
                    window.location.href = '../login/login.html';
                }
            } else {
                UI.error('No se pudo completar el registro', error.message);
            }
        } finally {
            botonRegistrar.disabled = false;
            botonRegistrar.textContent = 'Finalizar Registro →';
        }
    });

    // Correo traido desde el login cuando la cuenta no existia.
    const prellenado = Storage.leer('emailPrellenado', null);
    if (prellenado) {
        Storage.eliminar('emailPrellenado');
        inputEmail.value = prellenado;
    }
});
