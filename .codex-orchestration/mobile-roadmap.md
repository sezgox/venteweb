# Mobile app roadmap (integrated decisions)

## Temporal scope

- Global priority: **MOBILE APP FIRST** (see `project-context.md` -> Product priority).
- This document refines milestones for the **Android MVP** and following phases. Update it when priorities or decisions change.

---

## Phase 1 - MUST BE DONE (review and close)

**Meaning:** esta tabla Phase 1 queda reducida a **Notifications** y **Feed API**. El resto del MVP (auth, detalle de evento, explore mapa, crear evento, etc.) no se lista aqui; retomar segun prioridad o backlog.

| Area | Scope |
|------|--------|
| **Notifications** | **In-app only:** Socket.IO (`/notifications`), hub en **Social** + **campana** abre pantalla **Notificaciones**, **atras** vuelve a Social, lectura por **viewport**. Push/FCM = Phase 2. **Estado: hecho (QA cerrada en dispositivo).** |
| **Feed API** | `GET /api/events` incluye **`participations`** (`venteweb` `EventRepository.findMany` -> Prisma); el cliente puede calcular badges (p. ej. voluntarios) sin campo agregado. Explore mezcla **mocks solo en la primera pagina** de resultados. **Hecho en cliente + API:** filtros alineados con la web (busqueda, radio, fechas, visibilidad, colaboracion, categoria) y **paginacion por offset** con metadatos `page`, `limit`, `total`, `hasNextPage` + scroll infinito en el feed. |

---

## Phase 2 - NEXT TO DO (and platform hardening)

### Phase 2 - Part 1 (i18n + feed UX)

1. **Internationalization (first Phase 2 task):** app available in **English** and **Spanish**. Language from **user choice** on **login / register** (persist preference); later also **Settings** when that screen exists. **Default / hint:** derive initial suggestion from **device locale** (`navigator.language` / Capacitor `Locale` where applicable), **SIM or network region** if needed, or heuristics (e.g. Spain vs rest) -> exact priority order to define at implementation (device locale is the usual baseline). **Estado: testeando**; ya esta en casi todos los flujos y la mayoria de errores detectados han sido corregidos.
2. **Explore feed cards - categories & labels:**
   - **Hecho:** badge **volunteers / busca voluntarios** usa **color secundario** del tema (naranja/ambar `--ion-color-secondary`, alineado con LIVE = primario).
   - **Pendiente (mejora):** mostrar **categorias como iconos** (no solo accesible), con nombres para lectores de pantalla. Mas etiquetas secundarias en el futuro (p. ej. casi lleno, privado) cuando se definan.

### Phase 2 - Rest (platform & features)

3. **Email on register (backend):** validate that the address **exists / is acceptable** **before** sending the verification email (reduces useless sends and abuse). Exact checks (format, MX, disposable domains, etc.) are decided at implementation time.
4. **Feed / API - "Buscar aqui" (mapa):** **Hecho.** Cliente `vente-mobile` (bounds alineados con venteweb/ventewebf) + **QA cerrada** en dispositivo (VPN, filtros, mapa, MCP mobile_next); evidencia: `.codex-orchestration/testing/mobile-explore-map-vpn-qa.md`.
5. **Recommended listing:** personalized results per user from multiple signals (long-term ambitious). **Start simple:** e.g. events the user rated highly, preference signals, etc.; iterate.
6. **Light markdown (WhatsApp-style):** **Hecho a nivel producto/alcance** (descripciones de evento + **threads**, mismo criterio de formato). **Pendiente:** implementacion en cliente + backend/escape segun spec (cuando toque; no bloquea el cierre de "Buscar aqui").
7. **Account (activacion por email + gate de login) - Estado: TESTING:** registro no-Google: enviar un **correo** (objetivo: **Firebase** u orquestacion equivalente) pidiendo **activar la cuenta** con un **enlace** que **abra la app** via **deep link / App Link** si es posible, o caiga en la **version web** y active alli. **Sin cuenta activada:** **no inicio de sesion**; **ninguna** accion hoy protegida por auth. Modelo/UX: flag `active` (o analogo) en usuario, `401`/mensaje claro en clientes, relacion con **reenvio** y **reset password** (item relacionado, flujo distinto). El item 3 (validar email antes de enviar) reduce spam; este item define el **ciclo de vida** post-registro.
8. **Ratings, threads, levels, subscriptions, new notification types** -> prioritize against Phase 1 closure. **Ratings (movil):** ver seccion [Ratings (producto)](#ratings-producto) mas abajo.
9. **Push notifications:** **not in Phase 1.** In **Phase 2**, define **which** notification types also become **push** and implement the **new push service** (e.g. FCM).
10. **Explore map:** cluster events on the map when marker density is high, with a tap/zoom flow that still leads cleanly to individual event cards. Validation note: place many events in the same area, zoom out until a cluster appears, tap the cluster, and verify it decomposes through zoom/sub-clusters or spiderfy until individual event cards can be opened again. **Estado: testing.**

---

## Ratings (producto)

Pendiente para el circuito de valoracion en **vente-mobile** (alineado con `venteweb` / contratos de API con `ventewebf`).

1. **Vista evento - rating post-evento:** actualizar el detalle del evento para que quien **participo** (registrado) pueda **valorar** una vez el evento **ha terminado** (completar o integrar el flujo; la ruta dedicada de ratings en tabs sigue siendo el lugar para edicion detallada si aplica). Objetivo: no depender solo de la pantalla aislada de ratings para el "primer contacto" tras el cierre.
2. **Vista evento - participacion:** **no mostrar** el boton / accion **Remove participation** si el evento **ya finalizo**.
3. **Event card (feed / listados / tarjetas homogeneas):** usar **tiers de medalla/estrella** segun la media del evento: **Bronze** `> 3.3`, **Silver** `> 3.8`, **Gold** `> 4.3`. **Layout:** las **categorias** bajan y quedan **apenas por encima del titulo**, al **lado derecho**; la **estrella** queda en la zona donde ahora suelen mostrarse las **categorias** (esquina superior derecha del card), sin duplicar ruido visual.

---

## Revision y rediseño de Dashboard y Vista Evento

---

## Threads + Social (current agreement)

- **Threads inside the event:** each event has its thread; who can post/comment -> **detailed rules TBD** when building the feature.
- **Social:** surface **posts without full event context** (e.g. only the new post) from **friends** (when the event is visible to you), events you attend/organize, etc.
- **Primary goal of threads:** give **organizers** a channel for **updates** about the event and, when allowed, **interaction** with attendees. Permissions and moderation **TBD**.

---

## Other features (backlog)

- **Achievements:** tras cada rating nuevo o actualizado de un evento, para el organizador se recalcula cuantos eventos propios superan `3.3`, `3.8` y `4.3` para desbloquear insignias.
- **Settings / preferences** (user/event): posts, notifications, language, country, etc.
- **Event timeline / sub-events**, virtual vs on-site types and model refactor -> including the "both types" case as **two linked events** with their own sub-events, as previously specified.

---
