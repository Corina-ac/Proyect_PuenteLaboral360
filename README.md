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
| JavaScript (ES5) | Validación de formulario en modal |
| Google Maps Embed | Mapa de ubicación en página de inicio |

---

## Estructura de Carpetas

```
Proyect_PuenteLaboral360/
│
├── index.html                          ← Página principal
│
├── css/
│   ├── general.css                     ← Estilos base globales (Box Model, Flex, Grid)
│   ├── estilos.css                     ← Estilos complementarios del sitio
│   ├── index.css                       ← Estilos específicos de inicio
│   ├── contacto.css                    ← Layout Flexbox + Grid del formulario de contacto
│   ├── buscar.css                      ← Grid de resultados de búsqueda
│   ├── galeria.css                     ← Grid mosaico con span para galería
│   ├── servicios.css                   ← Tarjetas Flexbox y Grid de beneficios
│   └── proyeccion.css                  ← Personalización Bootstrap 5 (página de proyección)
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

## Cómo visualizar el proyecto

1. Clonar o descargar el repositorio
2. Abrir `index.html` directamente en el navegador (no requiere servidor)
3. Navegar entre páginas usando los enlaces del navbar

> Requiere conexión a internet para cargar Bootstrap 5 CDN, Font Awesome CDN y avatares externos.

---

## Autor

**Corina Acosta**  
Estudiante de Ingeniería en Software  
Quito, Ecuador — 2026
