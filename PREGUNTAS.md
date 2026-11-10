# Preguntas de repaso — Rondas de control

6 preguntas, 5 minutos, se aprueba con 5/6. Una pregunta por tema. Respuesta al final de cada una.

---

## 1. Sesión y seguridad web

**1.1** ¿Por qué el access token se guarda solo en memoria y no en `localStorage`?
- a) Porque `localStorage` tiene un límite de 5 KB
- b) Porque un script inyectado (XSS) puede leer `localStorage` y robar el token
- c) Porque `localStorage` no funciona con HTTPS
- d) Porque el servidor lo exige por CORS

✅ **b**. Cualquier JS que corra en la página puede leer `localStorage`. En memoria se pierde al recargar,
por eso al recargar se usa el refresh token para pedir uno nuevo.

**1.2** El refresh token es de un solo uso. Si dos pestañas lo usan a la vez, ¿qué pasa?
- a) Ambas reciben tokens nuevos
- b) El backend lo toma como robo: revoca la sesión y responde `401 REFRESH_REUSED`
- c) La segunda recibe `429`
- d) No pasa nada, el backend ignora la segunda

✅ **b**. Por eso se coordina: un solo refresh compartido (Web Locks / BroadcastChannel entre pestañas).

**1.3** ¿Qué error justifica intentar un refresh?
- a) `401 TOKEN_INVALID`  b) `401 SESSION_REVOKED`  c) `401 TOKEN_EXPIRED`  d) `403 FORBIDDEN`

✅ **c**. Solo el token vencido se arregla con refresh. Inválido o revocado → volver al login.

**1.4** ¿Qué es CORS?
- a) Un mecanismo del servidor para bloquear bots
- b) Una regla del navegador: el servidor indica qué orígenes pueden leer sus respuestas
- c) Un tipo de token
- d) Un ataque que roba cookies

✅ **b**. Por eso hay que verificar el dominio desplegado: la API solo acepta `localhost` y el origen verificado.

**1.5** Un JWT firmado (sin cifrar)…
- a) No se puede leer sin la clave secreta
- b) Se puede decodificar (base64url) y leer; la firma solo evita que se modifique
- c) Expira cuando se cierra el navegador
- d) Se guarda siempre en una cookie

✅ **b**.

**1.6** La interfaz decide qué botones mostrar según…
- a) `role.code`  b) `permissions`  c) el email  d) el `TEAM_CODE`

✅ **b**. Los roles cambian entre workspaces, los permisos no. Igual el backend vuelve a validar (403):
ocultar un botón no es seguridad.

**1.7** ¿Qué es CSRF?
- a) Inyectar scripts en la página
- b) Que otro sitio haga que el navegador envíe una request autenticada (con cookies) sin que el usuario quiera
- c) Robar el token de `localStorage`
- d) Saturar el servidor

✅ **b**. Con `Authorization: Bearer` en memoria (no cookies) el navegador no lo adjunta solo, así que CSRF no aplica.

**1.8** ¿Qué protege la cabecera `Content-Security-Policy` con `script-src 'self'`?
- a) Evita CORS
- b) Solo permite ejecutar scripts del propio origen: mitiga XSS
- c) Comprime el JS
- d) Fuerza HTTPS

✅ **b**.

---

## 2. React y rendimiento

**2.1** ¿Qué es virtualizar una lista o grilla?
- a) Cargar todos los datos y ocultarlos con CSS
- b) Renderizar en el DOM solo los elementos visibles (y un margen), según el scroll
- c) Usar `<canvas>`
- d) Usar Web Workers

✅ **b**. En la grilla de 512×512 = 262 144 celdas, nunca más de 2 500 en el DOM.

**2.2** ¿Para qué sirve la prop `key` en una lista?
- a) Para estilos  b) Para que React identifique cada elemento entre renders y no lo confunda
- c) Para ordenar la lista  d) Para accesibilidad

✅ **b**. Usar el índice como key falla si la lista se reordena o filtra.

**2.3** Un `useEffect` hace un fetch cada vez que cambia `page`. El usuario cambia rápido de página 1 → 2 → 3,
y la respuesta de la 2 llega después de la de la 3. ¿Cómo se evita que la 2 pise a la 3?
- a) Con `useMemo`
- b) Con un `AbortController` (o una bandera) en la función de limpieza del efecto
- c) Con `setTimeout`
- d) No se puede

✅ **b**. La limpieza del efecto corre antes del siguiente: cancela/ignora la respuesta vieja (Regla del Tablero).

**2.4** ¿Qué diferencia hay entre `useRef` y `useState`?
- a) Ninguna
- b) Cambiar `ref.current` no vuelve a renderizar; cambiar el estado sí
- c) `useRef` solo sirve para inputs
- d) `useState` no guarda valores entre renders

✅ **b**. Por eso la caché de bloques y los cursores van en refs: no re-renderizan toda la grilla.

**2.5** `setAge(age + 1); setAge(age + 1);` con `age = 42`. ¿Cuánto vale después?
- a) 44  b) 43  c) 42  d) error

✅ **b**. Ambos usan el mismo `age` del render. Con `setAge(a => a + 1)` dos veces sería 44.

**2.6** ¿Qué hace `React.lazy(() => import("./RefinePage"))`?
- a) Precarga la página  b) Code splitting: la página va en otro archivo JS que se descarga al usarla
- c) Memoriza el componente  d) Hace SSR

✅ **b**. Así la grilla no entra al bundle inicial del `/login` (≤ 180 KB gzip).

**2.7** ¿Para qué sirve `useMemo`?
- a) Para guardar en `localStorage`  b) Para recordar un valor calculado y no recalcularlo si sus dependencias no cambian
- c) Para efectos  d) Para refs

✅ **b**.

---

## 3. HTTP y resiliencia

**3.1** ¿Qué garantiza una `Idempotency-Key`?
- a) Que la request vaya más rápido
- b) Repetir la misma request con la misma key no repite el efecto (el backend devuelve la respuesta guardada)
- c) Que se genere una key nueva por reintento
- d) Cifrado

✅ **b**. Una key por **intención** del usuario; en el reintento se usa la **misma**. Una key nueva = refinar dos veces.

**3.2** Llega `429` con `Retry-After: 5`. ¿Qué hace la app?
- a) Reintenta enseguida  b) No pide nada a ese recurso hasta que pasen 5 segundos
- c) Cierra la sesión  d) Muestra 404

✅ **b**.

**3.3** ¿Qué es backoff exponencial?
- a) Reintentar cada vez más rápido  b) Esperar cada vez más entre reintentos (1 s, 2 s, 4 s…), idealmente con jitter
- c) No reintentar  d) Reintentar en paralelo

✅ **b**.

**3.4** ¿Para qué sirve `If-Match` con un `ETag`?
- a) Caché de imágenes
- b) Control de concurrencia optimista: solo guarda si el recurso no cambió desde que lo leí; si cambió → `412`
- c) Autenticación  d) Compresión

✅ **b**. Regla de Milchick: nunca sobrescribir lo que no se leyó. `If-Match: *` se rechaza.

**3.5** `409` vs `422`:
- a) Iguales  b) `409` conflicto con el estado actual (ya refinado); `422` datos bien formados pero inválidos (grupo incompleto, caja equivocada)
- c) `409` es error de red  d) `422` es falta de permisos

✅ **b**.

**3.6a** Cancelas con `AbortController` la request de un bloque que salió de la vista. ¿Qué pasa en el servidor?
- a) Se detiene al instante  b) Puede seguir procesándola: si pides el mismo bloque enseguida, quedan DOS en vuelo
- c) Devuelve 499 siempre  d) Borra el bloque

✅ **b**. Abortar solo cancela del lado del navegador. Por eso esperamos un "enfriamiento" antes de volver a pedir ese bloque.

**3.6b** Llega `429` con `Retry-After: 3` mientras otros bloques están en cola. ¿Qué es correcto?
- a) Pedir los demás bloques igual  b) No pedir NINGÚN bloque hasta que pasen 3 s (el límite es por sesión)
- c) Reintentar ese mismo bloque cada 100 ms  d) Cerrar sesión

✅ **b**.

**3.6** ¿Qué significa `503` con `Retry-After`?
- a) No autorizado  b) Servicio no disponible temporalmente: reintentar después
- c) No encontrado  d) Conflicto

✅ **b**.

---

## 4. Algoritmos y datos

**4.1** Un grupo es un "conjunto máximo de celdas conectadas que dan miedo". ¿Qué algoritmo lo encuentra?
- a) Ordenamiento  b) BFS/DFS (componente conexo) desde la celda elegida
- c) Búsqueda binaria  d) Dijkstra

✅ **b**.

**4.2** Con conectividad 4, ¿cuántos vecinos tiene una celda del centro? ¿Y con 8?
- a) 4 y 8  b) 2 y 4  c) 8 y 4  d) 4 y 6

✅ **a**. 8 incluye las diagonales.

**4.3** Grupo con dígitos 7, 5, 9. Estrategia `DIGIT_SUM_MOD`, orden `["DR","WO","MA","FC"]`. ¿Caja?
- a) DR  b) WO  c) MA  d) FC

✅ **b**. (7+5+9) = 21; 21 % 4 = 1 → `order[1]` = WO.

**4.4** Mismo grupo (7, 5, 9) con `MAX_DIGIT_MOD` y el mismo orden:
- a) DR  b) WO  c) MA  d) FC

✅ **b**. max = 9; 9 % 4 = 1 → WO.

**4.5** `tileSize = 32`. ¿En qué bloque está la celda (r=70, c=163)?
- a) (2, 5)  b) (3, 6)  c) (70, 163)  d) (1, 4)

✅ **a**. `floor(70/32)` = 2, `floor(163/32)` = 5. Índices desde 0. Dentro del bloque: (70−64, 163−160) = (6, 3).

**4.6** El `tremor` viene en base64. Cada byte es…
- a) Un carácter de texto  b) El temblor de una celda (0 a 100), en el mismo orden que `values`
- c) Una fila  d) Un bloque

✅ **b**. Se decodifica con `atob()` y `charCodeAt(i)`.

**4.7** Archivo de 100 × 70 con `tileSize` 32: ¿cuántos bloques hay?
- a) 6  b) 12  c) 8  d) 9

✅ **b**. ceil(100/32) = 4 filas de bloques × ceil(70/32) = 3 columnas = 12. Los del borde son más chicos.

---

## 5. Tiempo real

**5.1** ¿Por qué el stream SSE usa un "ticket" y no el access token?
- a) Por velocidad
- b) `EventSource` no permite cabeceras y poner el token en la URL lo filtra a logs/historial; el ticket dura 30 s y es de un solo uso
- c) Porque SSE no usa HTTP
- d) Por CORS

✅ **b**.

**5.2** Al reconectar un `EventSource`, ¿para qué sirve `lastEventId`?
- a) Para autenticar  b) Para que el servidor reenvíe los eventos perdidos desde ese id
- c) Para cerrar la conexión  d) Para el heartbeat

✅ **b**. Si ya no puede, envía `stream.reset` y hay que volver a pedir el estado.

**5.3** Algunos eventos llegan dos veces. ¿Cómo se evita aplicarlos dos veces?
- a) No se puede  b) Guardando los `id` ya procesados (o comparando versiones) e ignorando repetidos
- c) Recargando la página  d) Cerrando el stream

✅ **b**.

**5.4** Diferencia entre SSE y WebSocket:
- a) Ninguna  b) SSE: solo servidor → navegador, sobre HTTP; WebSocket: bidireccional
- c) WebSocket solo envía texto  d) SSE es bidireccional

✅ **b**.

**5.5** ¿Cómo comparten varias pestañas una sola conexión SSE?
- a) Abriendo una por pestaña  b) Una pestaña "líder" (Web Locks) mantiene la conexión y reenvía con BroadcastChannel
- c) Con cookies  d) Con `localStorage` cada segundo

✅ **b**. Si se cierra la líder, se libera el lock y otra pestaña lo toma.

**5.6** El WebSocket cierra con código `4403`. ¿Qué hace la app?
- a) Reconecta de inmediato  b) No reconecta y muestra un mensaje
- c) Reconecta tras 10 s  d) Pide otro ticket y reintenta

✅ **b**. `1006` (corte de red) → reconectar con ticket nuevo y espera creciente; `4429` → esperar ≥ 10 s.

**5.7** ¿Para qué sirve el heartbeat (`ping`/`pong`)?
- a) Para medir FPS  b) Para detectar conexiones muertas que no avisaron el cierre
- c) Para autenticar  d) Para comprimir

✅ **b**.

---

## 6. Imágenes, archivos y accesibilidad

**6.1** ¿Por qué se re-codifica la imagen con `<canvas>` → `toBlob("image/webp")` antes de subirla?
- a) Para hacerla más grande  b) Para recortarla/redimensionarla y eliminar metadatos (EXIF, ubicación)
- c) Para cifrarla  d) Porque el servidor no acepta JPG nunca

✅ **b**. Dibujar en canvas y exportar genera un archivo nuevo sin EXIF/XMP.

**6.2** ¿Para qué se calcula el SHA-256 del archivo?
- a) Para comprimirlo  b) Para que el backend compruebe que lo subido es exactamente lo que se pidió en el ticket
- c) Para cifrarlo  d) Para el nombre del bucket

✅ **b**. Se calcula con `crypto.subtle.digest("SHA-256", buffer)`.

**6.3** ¿Cómo se muestra el progreso real de una subida?
- a) Con `fetch`  b) Con `XMLHttpRequest` y `xhr.upload.onprogress`
- c) Con `setInterval`  d) Con CSS

✅ **b**. `fetch` no expone el progreso de subida.

**6.4** ¿Qué es RLS en Supabase?
- a) Un formato de imagen  b) Row Level Security: políticas que limitan qué puede leer/escribir cada rol (p. ej. `anon` solo inserta en su carpeta)
- c) Un CDN  d) Un tipo de token

✅ **b**. Nunca usar la `service_role` key en el frontend.

**6.5** El patrón ARIA *grid* requiere…
- a) Solo `<table>`  b) `role="grid"`, `role="row"`, `role="gridcell"`, `aria-rowcount`/`aria-rowindex` y navegación con teclado
- c) Solo colores  d) `tabindex` en todas las celdas

✅ **b**. Con virtualización, `aria-rowindex`/`aria-colindex` llevan el índice real. Solo una celda con `tabIndex=0` (roving tabindex).

**6.6** Un modal accesible debe…
- a) Cerrarse con cualquier clic  b) Atrapar el foco dentro, anunciarse (`role="dialog"`/`alertdialog`, `aria-modal`) y devolver el foco al cerrar
- c) No tener botones  d) Usar `alert()`

✅ **b**.

**6.7** ¿Cómo se evita XSS al mostrar textos que vienen de la API?
- a) Con `dangerouslySetInnerHTML`  b) Renderizándolos como texto en JSX `{texto}` (React escapa)
- c) Con `eval`  d) Con `innerHTML`

✅ **b**.
