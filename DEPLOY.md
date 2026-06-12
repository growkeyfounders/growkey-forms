# Deploy — Agentic Skool (growkey-forms)

La app tiene formularios públicos, el portal de clientes y el panel interno:

- `/onboarding` → formulario público de onboarding (23 preguntas)
- `/offer` → formulario público del ejercicio de oferta
- `/login` → login del portal (Google o email + contraseña; acceso solo por invitación)
- `/app` → portal del cliente (roadmap, checklist, formularios, chat)
- `/admin` → panel interno (clientes, roadmap, conversaciones, formularios) — requiere rol admin
- `/admin/onboarding`, `/admin/offer` → pestañas de formularios con filtro (links existentes)

## 1. Supabase: migración SQL

Proyecto: "Formularios Growkey" (el mismo de los formularios; los datos existentes se conservan).

1. Si el proyecto es nuevo, correr primero `supabase.sql` (tabla `growkey_form_submissions`).
2. Abrir SQL Editor y ejecutar **completo** `supabase/migrations/001_agentic_skool.sql`.
3. Verificar en Table Editor: tablas `profiles`, `skool_clients`, `skool_client_tasks`,
   `skool_messages`, `skool_thread_members`, `skool_message_reads`, `skool_events`,
   y la columna `client_id` en `growkey_form_submissions`.

La migración activa RLS en todas las tablas y agrega `skool_messages` a la publicación
realtime (necesario para el chat en vivo).

## 2. Supabase: Auth (Google + invitaciones)

1. **Authentication → Providers → Google**: habilitar con client id/secret de Google Cloud
   (OAuth consent + redirect `https://<proyecto>.supabase.co/auth/v1/callback`).
2. **Authentication → URL Configuration**:
   - Site URL = URL de producción (ej. `https://skool.growkey.ai`).
   - Redirect URLs: agregar exactamente `http://localhost:5173/login`,
     `https://<servicio>.onrender.com/login` y `https://skool.growkey.ai/login`.
     Sin la URL exacta de `/login`, el login con Google rebota al root del Site URL.
3. Nota: el SMTP por defecto de Supabase tiene límites de envío; si las invitaciones
   se vuelven problema, configurar SMTP propio.

## 3. Seed del primer admin

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME="..." \
node scripts/seed-admin.mjs
```

Crea (o reutiliza) el usuario en Auth y le asigna `role = 'admin'` en `profiles`.
Desde ahí, ese admin invita clientes y a otros miembros del equipo desde `/admin`.

## 4. Render

Configuración recomendada (ya declarada en `render.yaml`):

- Root directory: vacío (repo standalone `growkey-forms`).
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`
- **Plan Starter** (~USD 7/mes): el free tier duerme tras ~15 min y rompe la
  experiencia de portal y chat. Subir antes de invitar clientes reales.

Variables de entorno del servicio:

| Variable | Notas |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en el servidor; nunca en el frontend |
| `SUPABASE_ANON_KEY` | La usa el server para validar JWT contra Auth |
| `VITE_SUPABASE_URL` | **Build time**: la SPA la embebe en `npm run build` |
| `VITE_SUPABASE_ANON_KEY` | **Build time**: anon key pública (pestaña API) |
| `SUPABASE_TABLE` | `growkey_form_submissions` |
| `ALLOW_ADMIN_DELETE` | `false` |

Las `VITE_*` se necesitan durante el build: Render las inyecta en `npm run build`
por ser env vars del servicio. Si cambian, hay que redeployar para reconstruir la SPA.

## 5. Dominio

1. En Render → Settings → Custom Domains: agregar el subdominio elegido
   (ej. `skool.growkey.ai`).
2. En el DNS de `growkey.ai`: crear el CNAME `skool` → `<servicio>.onrender.com`.
3. Actualizar Site URL y Redirect URLs de Supabase Auth (paso 2) con el dominio final.

## 6. Smoke test de producción

1. `GET /api/health` → `{"ok":true,"storage":"supabase"}`.
2. `/onboarding` y `/offer` funcionan y guardan sin sesión (regresión: links ya compartidos).
3. `GET /api/submissions` sin token → `401`.
4. `/admin` exige login; el admin del seed entra y ve los paneles.
5. Invitar un cliente de prueba → llega el correo → set password → portal → elegir
   fecha de inicio → marcar tarea → chat en vivo con el admin (dos navegadores).
