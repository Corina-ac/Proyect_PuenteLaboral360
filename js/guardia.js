/* ============================================================================
   guardia.js — Control de acceso declarativo

   Cada pagina privada indica en su etiqueta <body> los roles autorizados:

       <body data-roles="estudiante">
       <body data-roles="instructor,admin">

   Sin sesion se redirige al inicio de sesion; con un rol distinto se devuelve
   al panel que corresponde al usuario. La comprobacion se ejecuta antes de
   pintar la pagina para que el contenido privado no llegue a mostrarse.
   ========================================================================== */

(() => {
    const cuerpo = document.body;
    if (!cuerpo) return;

    const declarados = (cuerpo.dataset.roles || '').trim();
    const roles = declarados === ''
        ? []                                       // basta con estar autenticado
        : declarados.split(',').map(rol => rol.trim()).filter(Boolean);

    const usuario = Auth.proteger(roles);
    if (!usuario) {
        // Auth.proteger ya lanzo la redireccion; se oculta el contenido mientras tanto.
        cuerpo.style.visibility = 'hidden';
        return;
    }

    // Los datos del usuario se reflejan en la barra lateral y en la de navegacion.
    document.addEventListener('DOMContentLoaded', () => {
        UI.pintarPerfilLateral(usuario);

        const inicio = document.getElementById('enlace-inicio');
        if (inicio) inicio.href = Auth.panelDe(usuario.rol);
    });
})();
