# PuenteLaboral360

Plataforma web que conecta estudiantes con empresas mediante habilidades verificadas y certificados reconocidos. Proyecto integrador de la asignatura **Fundamentos Web** — Ingeniería en Software.

**Autora:** Corina Acosta
**Quito, Ecuador — 2026**

---

## Enlaces del proyecto

| Recurso | Enlace |
|---|---|
| Repositorio | https://github.com/Corina-ac/Proyect_PuenteLaboral360 |
| Aplicación publicada | **[corina-ac.github.io/Proyect_PuenteLaboral360](https://corina-ac.github.io/Proyect_PuenteLaboral360/)** |

---

## Descripción

**PuenteLaboral360** aborda un problema concreto: muchos estudiantes terminan su formación sin poder demostrar lo que saben hacer, y muchas empresas no logran encontrar perfiles que encajen con lo que necesitan.

La plataforma resuelve esa distancia con un circuito completo. El estudiante crea su perfil, se matricula en cursos, avanza en ellos y obtiene certificados descargables en PDF. Cada habilidad certificada queda registrada en su perfil. Las empresas publican vacantes y buscan talento con un motor de emparejamiento que compara las habilidades del estudiante con los requisitos de cada vacante y calcula un porcentaje de coincidencia. Los instructores gestionan sus cursos y siguen el progreso de sus matriculados.

### Usuarios a los que se dirige

| Rol | Qué puede hacer |
|---|---|
| 🎓 **Estudiante** | Explorar el catálogo, matricularse, avanzar en cursos, obtener certificados PDF, gestionar su perfil y ver vacantes afines |
| 👨‍🏫 **Instructor** | Crear y editar cursos, revisar sus matriculados, calificar y consultar estadísticas |
| 🏢 **Empresa** | Publicar y administrar vacantes, buscar talento con filtros y contactar candidatos |
| 🛡️ **Administrador** | Gestionar todas las cuentas, activar o desactivar usuarios, ver indicadores globales y restablecer el sistema |

---

## Objetivo

Integrar HTML semántico, diseño responsivo, JavaScript, archivos JSON, almacenamiento local, librerías y APIs externas en una aplicación web coherente y funcional, demostrando la evolución del proyecto a lo largo de los tres parciales.

---

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
|---|---|
| HTML5 | Estructura semántica: `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` |
| CSS3 | Box Model, Flexbox, Grid, posicionamiento y media queries |
| JavaScript (ES6+) | Toda la lógica: DOM, eventos, `fetch`, CRUD y validaciones |
| Bootstrap 5.3 | Framework responsivo en la página *Mi Proyección* |
| Font Awesome 6.5 | Iconografía |
| localStorage | Persistencia de datos entre sesiones |

El código JavaScript se organiza en módulos con patrón IIFE. No requiere compilación ni gestor de paquetes.

---

## Librerías incorporadas

| Librería | Finalidad | Dónde se usa |
|---|---|---|
| **SweetAlert2** | Confirmar eliminaciones, restablecer datos, mostrar detalles y errores | `js/componentes.js` (envuelta en el objeto `UI`) |
| **Toastify** | Notificaciones breves de éxito, error, aviso e información | `js/componentes.js` |
| **Chart.js** | 9 gráficos: progreso de cursos, mapa de habilidades, usuarios por rol, vacantes y matrículas | Los 4 paneles |
| **jsPDF** | Generar los certificados de finalización descargables | `js/componentes.js` |

---

## APIs consumidas

### 1. countries.dev — Nacionalidad

```
https://countries.dev/countries
```

Alimenta el selector de nacionalidad del formulario de registro. Incluye campo de búsqueda que filtra los países mientras se escribe, muestra la bandera junto al nombre y guarda el país elegido dentro del registro del usuario. El listado se cachea en `localStorage` para no repetir la petición.

**Implementación:** `js/api.js` → `obtenerPaises()`

### 2. Open-Meteo — Clima

```
https://api.open-meteo.com/v1/forecast?latitude=-0.18&longitude=-78.47&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto
```

Muestra temperatura, humedad, viento y estado del cielo de las ciudades donde la plataforma dicta cursos presenciales: Quito, Guayaquil, Santo Domingo, Quevedo y Cuenca. El usuario cambia de ciudad y se lanza una nueva consulta.

**Justificación:** permite a quien va a asistir a un curso presencial planificar su traslado.
**Implementación:** `js/api.js` → `obtenerClima()`

### 3. Groq — Asistente de IA *(complemento opcional)*

Genera recomendaciones de cursos, sugerencias de habilidades y empleos afines al perfil. Requiere una clave propia: si no se configura, la aplicación funciona con normalidad y estas funciones simplemente no se activan (ver *Configuración opcional*).

Las tres integraciones controlan el estado de carga, verifican `response.ok` y muestran mensajes comprensibles ante cualquier fallo.

---

## Funcionalidades

### Datos y persistencia
- Carga de 9 archivos JSON mediante `fetch`
- Relaciones entre archivos resueltas por identificador con `find()`, `filter()` y `map()`
- Copia a `localStorage` en la primera ejecución y lectura desde ahí en las siguientes
- Restablecimiento de los datos originales, con confirmación previa

### Operaciones sobre los datos
- **Registro** de cursos, vacantes, matrículas y usuarios, con validación e identificador automático
- **Modificación** de cursos, vacantes, perfil y progreso
- **Eliminación** de usuarios y cursos, con confirmación mediante SweetAlert2
- La interfaz y los gráficos se actualizan tras cada operación

### Búsqueda y presentación
- Búsqueda en tiempo real (evento `input`) en catálogo, panel de administración, galería y búsqueda de talento
- Filtros combinables: categoría, nivel, estado, rol, certificados y vacante asociada
- Ordenamiento por nombre, precio, valoración, fecha y porcentaje de coincidencia
- Detalles de cada registro en modal
- Paneles de indicadores calculados con `map()`, `filter()`, `reduce()` y `some()`

### Cuentas y seguridad
- Registro con validación de nombres, correo, contraseña, edad (16 a 60 años) y nacionalidad
- Inicio de sesión que **deduce el rol** del usuario registrado, sin pedirlo
- Segundo código de seguridad exclusivo del administrador
- Protección de páginas declarativa mediante `<body data-roles="...">`
- Las contraseñas nunca se guardan en texto plano

### Robustez
- Estados de carga, vacío y error con opción de reintentar
- Imágenes con respaldo automático generado en SVG
- Manejo de archivo no encontrado, respuesta inválida, falta de conexión y JSON mal formado

---

## Estructura de carpetas

```
Proyect_PuenteLaboral360/
│
├── index.html                     ← Página principal
├── 404.html                       ← Redirección para GitHub Pages
├── README.md
│
├── json/                          ← Fuente inicial de datos (145 registros)
│   ├── cursos.json                    (24)  archivo principal
│   ├── matriculas.json                (29)
│   ├── vacantes.json                  (20)
│   ├── notificaciones.json            (18)
│   ├── usuarios.json                  (12)
│   ├── instructores.json              (12)
│   ├── galeria.json                   (12)
│   ├── empresas.json                  (10)
│   └── categorias.json                 (8)
│
├── js/
│   ├── storage.js                 ← Acceso a localStorage (prefijo pl360_)
│   ├── validaciones.js            ← Reglas de validación de formularios
│   ├── datos.js                   ← Carga de JSON, CRUD y relaciones
│   ├── auth.js                    ← Sesión, roles y protección de páginas
│   ├── componentes.js             ← Interfaz común: alertas, avatares, PDF
│   ├── guardia.js                 ← Control de acceso declarativo
│   ├── api.js                     ← Consumo de APIs externas
│   ├── config.example.js          ← Plantilla de configuración de claves
│   └── (un archivo por página)
│
├── css/
│   ├── general.css                ← Estilos base y etiquetas semánticas
│   ├── estilos.css                ← Componentes compartidos
│   ├── componentes.css            ← Alertas, chips, estados
│   └── (uno por página)
│
├── img/
│   ├── cursos/                    ← Portadas en SVG
│   └── galeria/
│
├── data/                          ← Ejemplos JSON y XML del primer parcial
│
└── pages/
    ├── login/          registro/         perfil/
    ├── cursos/         galeria/          servicios/
    ├── contacto/       planes/           proyeccion/
    ├── dashboard-estudiante/  dashboard-instructor/  dashboard-empresa/
    ├── admin/          buscar-talento/   mis-vacantes/
    ├── notificaciones/ politica-privacidad/
```

---

## Cómo ejecutar el proyecto

El proyecto lee los archivos JSON con `fetch`, por lo que **debe abrirse desde un servidor local**. Al abrir `index.html` con doble clic el navegador bloquea esas peticiones por seguridad.

### Opción A — Live Server (recomendada)

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Corina-ac/Proyect_PuenteLaboral360.git
   ```
2. Abrir la carpeta en Visual Studio Code.
3. Instalar la extensión **Live Server**.
4. Clic derecho sobre `index.html` → *Open with Live Server*.

### Opción B — Python

```bash
cd Proyect_PuenteLaboral360
python -m http.server 8000
```
Luego abrir `http://localhost:8000`.

### Configuración opcional (asistente de IA)

Las funciones de inteligencia artificial requieren una clave propia. Sin ella el proyecto funciona igual, solo que esas sugerencias no se generan.

1. Copiar `js/config.example.js` como `js/config.js`.
2. Colocar dentro una clave obtenida en https://console.groq.com/keys

> `js/config.js` está en `.gitignore`: las claves no se suben al repositorio.

---

## Cuentas de prueba

La propia pantalla de inicio de sesión muestra una cuenta por rol con su contraseña. Basta con hacer clic sobre el correo para rellenar el formulario.

| Rol | Contraseña |
|---|---|
| Estudiante | `Estudiante123.` |
| Instructor | `Instructor123.` |
| Empresa | `Empresa123.` |
| Administrador | `Admin1234.` + código `PL360-ADMIN` |

---

## Evolución del proyecto

| Parcial | Aportación |
|---|---|
| **Primero** | Estructura con HTML semántico, formularios con `label`, tablas con encabezados e imágenes con `alt` |
| **Segundo** | Diseño responsivo con media queries para móvil (375 px), tableta (768 px) y escritorio (1366 px) |
| **Tercero** | JavaScript: manipulación del DOM, eventos, carga de JSON, `localStorage`, CRUD, librerías y APIs |

En la versión final, el contenido que antes estaba escrito directamente en el HTML —tarjetas de cursos, tablas de usuarios, galería, vacantes y candidatos— se genera desde JavaScript a partir de los archivos JSON. El HTML conserva únicamente los contenedores.

---

## Notas sobre el alcance

Se trata de un proyecto **frontend con fines académicos**:

- No hay servidor ni base de datos: `localStorage` cumple ese papel.
- Las contraseñas se guardan transformadas, pero con una función que no alcanza el nivel de un sistema en producción.
- Los datos de cada persona quedan en su propio navegador.

Las mejoras naturales serían incorporar un backend con base de datos real, autenticación con tokens y despliegue en un servicio de alojamiento con dominio propio.
