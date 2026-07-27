/* ============================================================================
   validaciones.js — Reglas de validacion de formularios del proyecto
   ========================================================================== */

const Validaciones = (() => {

    /* --------------------------------------------------------------- edad */
    // La plataforma ofrece formacion y colocacion laboral, por lo que el
    // registro se limita a personas en edad de trabajar.
    const EDAD_MINIMA = 16;
    const EDAD_MAXIMA = 60;

    /** Calcula la edad exacta en anios a partir de una fecha ISO (yyyy-mm-dd). */
    function calcularEdad(fechaNacimiento) {
        const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
        if (isNaN(nacimiento.getTime())) return null;

        const hoy = new Date();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        // Todavia no cumple anios este anio.
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return edad;
    }

    /**
     * Valida la fecha de nacimiento.
     * Devuelve { valido, mensaje, edad }.
     */
    function validarFechaNacimiento(fechaNacimiento) {
        if (!fechaNacimiento) {
            return { valido: false, mensaje: 'Debes indicar tu fecha de nacimiento.', edad: null };
        }

        const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
        if (isNaN(nacimiento.getTime())) {
            return { valido: false, mensaje: 'La fecha de nacimiento no es valida.', edad: null };
        }
        if (nacimiento > new Date()) {
            return { valido: false, mensaje: 'La fecha de nacimiento no puede ser futura.', edad: null };
        }

        const edad = calcularEdad(fechaNacimiento);
        if (edad < EDAD_MINIMA) {
            return {
                valido: false,
                edad,
                mensaje: `Tienes ${edad} anios. Debes tener al menos ${EDAD_MINIMA} anios para registrarte.`
            };
        }
        if (edad > EDAD_MAXIMA) {
            return {
                valido: false,
                edad,
                mensaje: `La edad registrada es de ${edad} anios. El registro esta disponible hasta los ${EDAD_MAXIMA} anios.`
            };
        }
        return { valido: true, mensaje: '', edad };
    }

    /** Rango de fechas permitido, para los atributos min y max del input date. */
    function rangoFechasPermitido() {
        const hoy = new Date();
        const aISO = fecha => fecha.toISOString().slice(0, 10);
        // El mas joven permitido cumple hoy la edad minima.
        const max = new Date(hoy.getFullYear() - EDAD_MINIMA, hoy.getMonth(), hoy.getDate());
        // El de mayor edad permitido aun no cumple la edad maxima + 1.
        const min = new Date(hoy.getFullYear() - EDAD_MAXIMA - 1, hoy.getMonth(), hoy.getDate() + 1);
        return { min: aISO(min), max: aISO(max) };
    }

    /* ------------------------------------------------------------- textos */
    function validarEmail(email) {
        const patron = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!email) return { valido: false, mensaje: 'El correo electronico es obligatorio.' };
        if (!patron.test(email.trim())) return { valido: false, mensaje: 'El formato del correo no es valido.' };
        return { valido: true, mensaje: '' };
    }

    function validarPassword(password) {
        if (!password) return { valido: false, mensaje: 'La contrasena es obligatoria.' };
        if (password.length < 8 || password.length > 16) {
            return { valido: false, mensaje: 'La contrasena debe tener entre 8 y 16 caracteres.' };
        }
        if (!/[A-Za-z]/.test(password)) return { valido: false, mensaje: 'La contrasena debe incluir al menos una letra.' };
        if (!/\d/.test(password)) return { valido: false, mensaje: 'La contrasena debe incluir al menos un numero.' };
        if (!/[@$!%*?&.#_-]/.test(password)) {
            return { valido: false, mensaje: 'La contrasena debe incluir un caracter especial (@$!%*?&.#_-).' };
        }
        return { valido: true, mensaje: '' };
    }

    function validarTexto(valor, etiqueta, minimo = 2) {
        const limpio = (valor || '').trim();
        if (limpio.length < minimo) {
            return { valido: false, mensaje: `${etiqueta} debe tener al menos ${minimo} caracteres.` };
        }
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/.test(limpio) && etiqueta.toLowerCase().includes('nombre')) {
            return { valido: false, mensaje: `${etiqueta} solo debe contener letras.` };
        }
        return { valido: true, mensaje: '' };
    }

    function validarTelefono(telefono) {
        if (!telefono) return { valido: true, mensaje: '' }; // campo opcional
        if (!/^[0-9+\s-]{7,15}$/.test(telefono.trim())) {
            return { valido: false, mensaje: 'El telefono debe tener entre 7 y 15 digitos.' };
        }
        return { valido: true, mensaje: '' };
    }

    function validarNumero(valor, etiqueta, minimo = 0, maximo = Infinity) {
        const numero = Number(valor);
        if (valor === '' || valor === null || isNaN(numero)) {
            return { valido: false, mensaje: `${etiqueta} debe ser un numero.` };
        }
        if (numero < minimo || numero > maximo) {
            return { valido: false, mensaje: `${etiqueta} debe estar entre ${minimo} y ${maximo}.` };
        }
        return { valido: true, mensaje: '' };
    }

    /* ------------------------------------------------------ contrasenas */
    // Hash djb2 con sal. No es criptograficamente seguro: su unico proposito
    // es evitar almacenar la contrasena en texto plano dentro del JSON y de
    // localStorage en un proyecto que se ejecuta solo en el navegador.
    const SAL = 'PL360';

    function hashSimple(texto) {
        let h = 5381;
        const cadena = SAL + texto;
        for (let i = 0; i < cadena.length; i++) {
            h = ((h << 5) + h + cadena.charCodeAt(i)) >>> 0;
        }
        return 'h' + h.toString(16);
    }

    /* ------------------------------------------------- ayuda visual DOM */
    /** Pinta un mensaje de error debajo de un input y marca el campo. */
    function mostrarError(input, mensaje) {
        if (!input) return;
        input.classList.add('campo-invalido');
        input.setAttribute('aria-invalid', 'true');
        let aviso = input.parentElement.querySelector('.mensaje-error');
        if (!aviso) {
            aviso = document.createElement('p');
            aviso.className = 'mensaje-error';
            aviso.setAttribute('role', 'alert');
            input.parentElement.appendChild(aviso);
        }
        aviso.textContent = mensaje;
    }

    function limpiarError(input) {
        if (!input) return;
        input.classList.remove('campo-invalido');
        input.removeAttribute('aria-invalid');
        const aviso = input.parentElement.querySelector('.mensaje-error');
        if (aviso) aviso.remove();
    }

    /** Pinta un mensaje verde de confirmacion debajo de un input. */
    function mostrarOk(input, mensaje) {
        if (!input) return;
        input.classList.add('campo-valido');
        let aviso = input.parentElement.querySelector('.mensaje-ok');
        if (!aviso) {
            aviso = document.createElement('p');
            aviso.className = 'mensaje-ok';
            input.parentElement.appendChild(aviso);
        }
        aviso.textContent = mensaje;
    }

    function limpiarOk(input) {
        if (!input) return;
        input.classList.remove('campo-valido');
        const aviso = input.parentElement.querySelector('.mensaje-ok');
        if (aviso) aviso.remove();
    }

    /**
     * Conecta el evento 'input' de un campo con un validador para dar
     * retroalimentacion inmediata mientras el usuario escribe.
     * Si el campo esta vacio no muestra nada (para no reganiar de entrada).
     */
    function enVivo(input, validador, mensajeOk = 'Se ve bien ✔') {
        if (!input) return;
        input.addEventListener('input', () => {
            if (!input.value.trim()) {
                limpiarError(input);
                limpiarOk(input);
                return;
            }
            const resultado = validador(input.value);
            if (resultado.valido) {
                limpiarError(input);
                mostrarOk(input, typeof mensajeOk === 'function' ? mensajeOk(resultado) : mensajeOk);
            } else {
                limpiarOk(input);
                mostrarError(input, resultado.mensaje);
            }
        });
    }

    /**
     * Aplica una validacion a un input y actualiza su mensaje de error.
     * Devuelve true si el campo es valido.
     */
    function aplicar(input, resultado) {
        if (resultado.valido) {
            limpiarError(input);
        } else {
            limpiarOk(input);
            mostrarError(input, resultado.mensaje);
        }
        return resultado.valido;
    }

    return {
        EDAD_MINIMA, EDAD_MAXIMA,
        calcularEdad, validarFechaNacimiento, rangoFechasPermitido,
        validarEmail, validarPassword, validarTexto, validarTelefono, validarNumero,
        hashSimple, mostrarError, limpiarError, mostrarOk, limpiarOk, aplicar, enVivo
    };
})();
