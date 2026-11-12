# Flota — Inventario de vehículos

Aplicación React + Vite para organizar las 81 unidades de `Inventario.csv` en proyectos. Incluye catálogo por modelo y estado, arrastre con dnd-kit y un escenario 2.5D con animaciones GSAP, selección de fondos y almacenamiento local de asignaciones. La propuesta de estructura y movimiento está en `docs/design.md`.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+ y npm.

```sh
npm install
npm run dev
```

Abre la dirección local que indique Vite. Para producción:

```sh
npm run build
npm run preview
```

## Uso

1. Selecciona un proyecto o crea uno con **Nuevo proyecto**.
2. Abre un modelo del inventario. Las unidades aparecen en orden **Bueno → Regular → Malo**. Busca por modelo, placas, año o número de inventario y filtra por estado.
3. Arrastra desde cualquier parte de la tarjeta, incluida la imagen, para previsualizar la unidad. Un clic no activa la vista previa y el escenario no elige una unidad del catálogo automáticamente. Al soltar en el escenario aparece una confirmación; la asignación solo se guarda al aceptar. Con teclado, enfoca la tarjeta, pulsa espacio, mueve con flechas y vuelve a pulsar espacio. Escape cancela el arrastre.
4. La tira **En este proyecto** permite cambiar de unidad. Su **X roja** pregunta si deseas retirar la asignación. Al confirmar, la unidad vuelve al catálogo; cancelar o pulsar Escape conserva la asignación.
5. Abre **Más información / Ficha completa** para consultar inventario, serie, versión, motor, cilindros, descripción, clasificación y proyecto asignado. El icono de carpeta o **Información del proyecto** abre los datos del proyecto y su lista de unidades.
6. **Cambiar fondo** ofrece Bosque, Valle, Montaña, Horizonte y Desierto; cada proyecto conserva su fondo. El botón de pausa detiene balanceo y paralaje. Se respeta la preferencia del sistema de movimiento reducido.

Las asignaciones y los proyectos se guardan en `localStorage` (`flota-workspace-v1`) en este navegador y origen. No hay backend ni sincronización entre dispositivos. Cambiar de puerto u origen abre otro almacenamiento. El CSV permanece intacto.

**Regla de asignación:** solo se permiten unidades en condición **Bueno** o **Regular** y estado operativo **En activo**. Estado **Malo**, mantenimiento, baja o un estado operativo desconocido bloquean la asignación con una advertencia al soltar. Se mantiene la vista previa y el acceso a la ficha. La regla se valida antes de la confirmación y en el estado de la aplicación; las asignaciones antiguas no se eliminan automáticamente.

## Datos y assets

- El CSV original se procesa con Papa Parse durante la carga del módulo y se incorpora a la compilación. Tras editarlo, Vite actualiza desarrollo; producción requiere una nueva compilación.
- Los registros se identifican por su número de inventario. Se rechazan columnas faltantes, filas mal formadas, estados desconocidos e identificadores duplicados.
- Las variantes se agrupan conservando el detalle original en la ficha. El archivo contiene **32 Aveo, 17 NP 300, 2 Frontier, 16 RAM 700, 5 JAC Frison, 4 L200, 2 Tsuru, 1 Silverado, 1 V-Drive y 1 RAM 4000**. La cifra de 19 NP 300 del task no coincide con el CSV; no se cambió la clasificación de Frontier para forzarla.
- Las diez imágenes originales de `img/cars/` tienen canal alfa con transparencia y se reutilizan sin modificar. Algunas imágenes representan al modelo y no el año o color exacto de cada unidad.
- Los fondos de `img/backgrounds/` y el recorte `img/pine.png` forman las capas del escenario. No se necesita una librería 3D: perspectiva CSS, sombras y GSAP resuelven el efecto de libro desplegable.
- El rediseño sigue el boceto `CambiosDesign.png` proporcionado por el usuario. Los PDF de la especificación inicial no están incluidos en el proyecto.
- Las fuentes DM Sans y Manrope se solicitan a Google Fonts, con respaldo sans-serif si no hay conexión.

## Verificación

```sh
npm test
npm run test:e2e
npm run build
```

Las pruebas unitarias cubren lectura y conteos reales, imágenes, orden, búsquedas, validación, asignación exclusiva, devolución, restauración y fondos por proyecto. Las pruebas de navegador cubren arrastre, cancelación, persistencia, proyectos, filtros, vista previa, ficha completa, fondos, pausa, viewport móvil y movimiento reducido. Playwright utiliza Microsoft Edge instalado; para otro navegador ajusta `channel` en `playwright.config.js`.

La interfaz admite arrastre con teclado, anuncios de confirmación, enfoque visible y `prefers-reduced-motion`. En móvil las tres columnas se apilan y los proyectos aparecen en la parte superior.

## Referencias de implementación

- [dnd-kit: useDraggable](https://dndkit.com/legacy/api-documentation/draggable/use-draggable/)
- [GSAP en React](https://gsap.com/resources/React/)

## Estructura

- `src/App.jsx`: proyectos, catálogo, showroom e interacciones.
- `src/components/VehicleScene.jsx`: capas, cámara, animaciones, selector de fondos y unidades asignadas.
- `src/components/InformationDialog.jsx`: fichas de vehículo y proyecto.
- `src/components/AssignmentDialog.jsx`: confirmación de asignación, retirada y advertencias de bloqueo.
- `src/inventory.js`: lectura, normalización, agrupación y búsquedas.
- `src/workspace.js`: estado y restauración de asignaciones.
- `src/assets.js`: mapeo de imágenes con Vite.
- `src/styles.css`: diseño adaptable y estados visuales.
- `tests/`: pruebas de datos y navegador.
