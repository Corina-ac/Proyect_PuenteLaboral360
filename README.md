# PuenteLaboral360

Plataforma web educativa y de empleo que conecta estudiantes con empresas mediante habilidades verificadas y certificados reconocidos. Desarrollado como proyecto académico de Ingeniería en Software.

---

## Descripción

**PuenteLaboral360** permite a los estudiantes crear un perfil, aprender con cursos verificados, obtener certificados y ser encontrados automáticamente por empresas según sus habilidades. Incluye roles diferenciados para estudiantes, instructores y empresas.

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura semántica de todas las páginas |
| CSS3 | Estilos base, Flexbox, Grid, Box Model |
| Bootstrap 5.3 | Framework responsivo — página de proyección |
| Font Awesome 6.5 | Iconografía en todo el sitio |
| JavaScript (ES6+) | Manipulación del DOM, eventos, fetch y módulos por archivo |
| JSON + fetch | Ocho archivos en `/json` como fuente inicial de datos |
| localStorage | Persistencia de los datos y de la sesión entre recargas |
| SweetAlert2 | Confirmaciones, formularios modales y detalles |
| Toastify | Notificaciones breves de cada operación |
| Chart.js 4 | Gráficos de cursos por categoría y de usuarios por rol |
| countries.dev | API de países para la nacionalidad del registro |
| Open-Meteo | API de clima de las sedes presenciales |
| Google Maps Embed | Mapa de ubicación en página de inicio |

---

## Estructura de Carpetas

```
Proyect_PuenteLaboral360/
│
├── index.html                          ← Página principal
│
├── js/                                 ← Lógica de la aplicación
│   ├── storage.js                      ← Acceso a localStorage
│   ├── validaciones.js                 ← Validaciones y hash de contraseñas
│   ├── datos.js                        ← Carga de JSON, cache y operaciones CRUD
│   ├── auth.js                         ← Sesión, roles y protección de páginas
│   ├── guardia.js                      ← Control de acceso declarativo por rol
│   ├── api.js                          ← countries.dev y Open-Meteo
│   ├── componentes.js                  ← Alertas, notificaciones y estados de carga
│   ├── main.js                         ← Página de inicio
│   ├── login.js / registro.js          ← Autenticación y alta de usuarios
│   ├── cursos.js                       ← Catálogo con búsqueda, filtros y CRUD
│   ├── perfil.js                       ← Perfil del usuario en sesión
│   ├── galeria.js                      ← Mosaico dinámico
│   └── admin.js                        ← Panel de administración
│
├── json/                               ← Fuente inicial de datos (129 registros)
│   ├── cursos.json                     ← Archivo principal (25 registros)
│   ├── categorias.json
│   ├── instructores.json
│   ├── usuarios.json
│   ├── empresas.json
│   ├── vacantes.json
│   ├── matriculas.json
│   └── galeria.json
│
├── css/
│   ├── general.css                     ← Estilos base globales (Box Model, Flex, Grid)
│   ├── estilos.css                     ← Estilos complementarios del sitio
│   ├── index.css                       ← Estilos específicos de inicio
│   ├── contacto.css                    ← Layout Flexbox + Grid del formulario de contacto
│   ├── buscar.css                      ← Grid de resultados de búsqueda
│   ├── galeria.css                     ← Grid mosaico con span para galería
│   ├── servicios.css                   ← Tarjetas Flexbox y Grid de beneficios
│   ├── proyeccion.css                  ← Personalización Bootstrap 5 (página de proyección)
│   └── componentes.css                 ← Componentes generados por JavaScript
│
├── img/
│   ├── educacion-global.ico            ← Favicon del sitio
│   ├── certificacion_verificadas.jpg
│   ├── demo_day.jpg
│   ├── techcorp_s.a.png
│   ├── crecimiento_personal.jpg
│   └── instructores_verificados.png
│
├── data/
│   ├── datos.json                      ← Ejemplo de datos simulados en formato JSON
│   └── datos.xml                       ← Ejemplo de datos simulados en formato XML
│
└── pages/
    ├── contacto/
    │   └── contacto.html               ← Formulario de contacto (Flexbox 2 columnas)
    ├── galeria/
    │   └── galeria.html                ← Galería con Grid mosaico
    ├── servicios/
    │   └── servicios.html              ← Catálogo de servicios y planes
    ├── proyeccion/
    │   └── proyeccion.html             ← Proyección personal — Bootstrap 5
    ├── login/
    │   └── login.html
    ├── registro/
    │   └── registro.html
    ├── buscar/
    │   └── buscar.html
    ├── dashboard-estudiante/
    ├── dashboard-instructor/
    ├── dashboard-empresa/
    ├── admin/                          ← Panel de administración
    └── ...
```

---

## Páginas principales

### `index.html` — Inicio
- Navbar con Flexbox
- Sección hero con CTA
- Grid de estadísticas (4 columnas)
- Sección "¿Cómo funciona?" con pasos
- Grid de roles (Estudiante / Instructor / Empresa)
- Grid de equipo con badges absolutamente posicionados
- Mapa embebido y FAQ con `<details>`
- Sección de datos estructurados con ejemplos de JSON y XML

### `pages/contacto/contacto.html` — Contacto
- Layout Flexbox 2 columnas (formulario + datos)
- Grid interno para campos del formulario
- Tarjetas de información con borde izquierdo

### `pages/galeria/galeria.html` — Galería
- Grid mosaico 3×3 con `grid-column: span 2` y `grid-row: span 2`
- Overlay con `position: absolute` e `inset: 0`
- Catálogo de 4 columnas

### `pages/servicios/servicios.html` — Servicios
- Tarjetas Flexbox con `flex: 1`
- Grid 2×2 de beneficios
- Proceso en fila con `::after` como línea conectora
- Planes de precios con badge centrado por `transform: translateX(-50%)`

### `pages/proyeccion/index.html` — Mi Proyección *(Bootstrap 5)*
- Navbar responsivo con toggler (hamburguesa en móvil)
- Hero con Alert dismissible y Badges de tecnologías
- Cards de visión/misión/propósito (Grid 3 columnas)
- Barras de progreso para habilidades frontend y backend
- Tabla responsiva con progress bars integradas
- Accordion con Carousel dentro del primer ítem
- Grid de proyectos con Cards (imagen + badges + botones)
- List Group conectado a paneles de certificaciones (Tab Content)
- Modal con formulario completo de contacto
- Footer de 3 columnas

---

## Conceptos de Maquetación Aplicados

### Box Model
- `box-sizing: border-box` en selector universal `*`
- `padding`, `margin`, `border`, `border-radius` en todos los componentes
- `max-width` en contenedores para limitar el ancho máximo

### Flexbox
- Navbar: `display: flex; justify-content: space-between; align-items: center`
- Layout de contacto: dos columnas con `flex: 2` y `flex: 1`
- Redes sociales: `justify-content: center; gap: 20px; flex-wrap: wrap`
- Proceso de pasos: `justify-content: center; align-items: flex-start`

### CSS Grid
- Estadísticas inicio: `grid-template-columns: repeat(4, 1fr)`
- Galería mosaico: `repeat(3, 1fr)` con `span 2` en ítems destacados
- Formulario de contacto: `grid-template-columns: 1fr 1fr`
- Equipo: `grid-template-columns: repeat(3, 1fr)` con `gap: 28px`
- Catálogo: `repeat(4, 1fr)`

### Posicionamiento
- `position: relative` en tarjetas contenedoras
- `position: absolute` para badges flotantes y overlays
- `inset: 0` para cubrir toda la tarjeta en overlays de galería

### Pseudo-elementos
- `.proceso-paso:not(:last-child)::after` — línea horizontal conectora entre pasos

---

## Funcionalidades JavaScript (tercer parcial)

| Requisito | Dónde se evidencia |
|---|---|
| Manipulación del DOM | Todas las tarjetas, tablas y filtros se generan desde JavaScript |
| Manejo de eventos | `click`, `submit`, `input`, `change`, `focus`, `keydown`, `DOMContentLoaded` y `error` |
| Eventos delegados | `js/cursos.js`, `js/admin.js`, `js/galeria.js`, `js/registro.js` |
| Lectura de JSON con fetch | `js/datos.js` → `descargar()` |
| Búsqueda en tiempo real | Catálogo, galería y panel de administración (evento `input`) |
| Filtros | Categoría y nivel en cursos; rol y estado en administración |
| Ordenamiento | Siete criterios en el catálogo, cuatro en administración |
| Registro de elementos | Alta de cursos y registro de usuarios |
| Modificación | Edición de cursos y de datos del perfil |
| Eliminación | Baja de cursos y de usuarios, con confirmación previa |
| Validación de formularios | `js/validaciones.js` |
| localStorage | `js/storage.js` (prefijo `pl360_`) |
| APIs externas | countries.dev y Open-Meteo (`js/api.js`) |
| Librerías | SweetAlert2, Toastify y Chart.js |
| Manejo de errores | `try/catch`, verificación de `response.ok` y mensajes al usuario |
| Indicadores de carga | `UI.cargando()` con spinner accesible |
| Notificaciones | `UI.toast()` en cada operación |
| Restablecer datos | Botón en el catálogo y en el panel de administración |

---

## Archivos JSON

La carpeta `json/` contiene **129 registros** distribuidos en ocho archivos.
El archivo principal, `cursos.json`, tiene **25 registros**.

| Archivo | Registros | Contenido |
|---|---|---|
| `cursos.json` | 25 | Archivo principal del catálogo |
| `matriculas.json` | 30 | Relación entre usuarios y cursos |
| `vacantes.json` | 20 | Ofertas laborales publicadas |
| `instructores.json` | 12 | Docentes de la plataforma |
| `usuarios.json` | 12 | Cuentas registradas y sus roles |
| `galeria.json` | 12 | Imágenes de la galería |
| `empresas.json` | 10 | Empresas aliadas |
| `categorias.json` | 8 | Áreas de formación |

### Relaciones entre archivos

Los archivos no se llaman entre sí: las relaciones se resuelven con JavaScript
después de cargarlos con `fetch`, usando `find()`, `filter()` y `map()`.

```
cursos.categoriaId    → categorias.id
cursos.instructorId   → instructores.id
matriculas.usuarioId  → usuarios.id
matriculas.cursoId    → cursos.id
vacantes.empresaId    → empresas.id
vacantes.categoriaId  → categorias.id
```

Los registros incluyen además objetos anidados, como `usuarios.contacto`,
`usuarios.nacionalidad`, `usuarios.preferencias` y `empresas.contacto`.

Las rutas de las imágenes se almacenan dentro de los JSON (`cursos.imagen`,
`galeria.imagen`) y JavaScript las lee para construir las etiquetas `<img>`.

---

## Roles y control de acceso

El inicio de sesión **no pregunta el rol**: lo deduce del usuario registrado en
`usuarios.json` o en `localStorage`. Si el correo no existe, la aplicación
ofrece ir al formulario de registro.

| Rol | Panel de inicio | Acceso |
|---|---|---|
| 🎓 Estudiante | `dashboard-estudiante` | Catálogo, perfil, notificaciones |
| 👨‍🏫 Instructor | `dashboard-instructor` | Sus cursos, alta y edición del catálogo |
| 🏢 Empresa | `dashboard-empresa` | Vacantes y buscador de talento |
| 🛡️ Administrador | `admin` | Gestión de usuarios y de todo el sistema |

Cada página privada declara sus roles autorizados en la etiqueta `<body>`:

```html
<body data-roles="instructor,admin">
```

`js/guardia.js` verifica la sesión antes de mostrar el contenido. Sin sesión se
redirige al inicio de sesión; con un rol distinto se devuelve al panel propio.

### Seguridad del administrador

La cuenta de administrador exige un **segundo código de acceso** además de la
contraseña. Las contraseñas no se guardan en texto plano: se almacena un hash
(`Validaciones.hashSimple`). Al tratarse de una aplicación que se ejecuta solo
en el navegador, este mecanismo es didáctico y no sustituye una autenticación
real de servidor.

### Cuentas de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `corina@correo.com` | `Estudiante123.` |
| Instructor | `maria.lopez@puentelaboral360.com` | `Instructor123.` |
| Empresa | `rrhh@techcorp.com` | `Empresa123.` |
| Administrador | `admin@puentelaboral360.com` | `Admin1234.` más el código `PL360-ADMIN` |

---

## Registro de usuarios

- Validación de edad: solo se admiten personas de **16 a 60 años**, por tratarse
  de una plataforma de formación y colocación laboral. El campo de fecha limita
  el rango con `min` y `max`, y la validación se repite antes de guardar.
- Nacionalidad obtenida de `https://countries.dev/countries` mediante un
  selector personalizado con búsqueda y banderas.
- Foto de perfil opcional, guardada como data URI; si no se sube ninguna se
  genera un avatar SVG con las iniciales del usuario.
- Cuando se llega desde un plan concreto (`registro.html?rol=estudiante`), el
  rol queda fijado y no puede cambiarse.

---

## Cómo ejecutar el proyecto

1. Clonar o descargar el repositorio.
2. Abrir la carpeta en Visual Studio Code.
3. Iniciar **Live Server** sobre `index.html` (clic derecho, *Open with Live Server*).
4. Navegar entre páginas usando el menú.

> **Importante:** el proyecto debe ejecutarse con Live Server o un servidor local
> equivalente. Al abrir los archivos con `file://` el navegador bloquea `fetch`
> y los archivos JSON no se cargan.
>
> Requiere conexión a internet para las librerías por CDN y para las dos APIs externas.

---

## Autor

**Corina Acosta**  
Estudiante de Ingeniería en Software  
Quito, Ecuador — 2026
