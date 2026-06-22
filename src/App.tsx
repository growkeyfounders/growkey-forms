import { useEffect, useMemo } from "react";
import logoUrl from "./assets/growkey-mascot.png";
import {
  OFFER_SLUG,
  offerForm,
  ONBOARDING_SLUG,
  onboardingForm,
  type FormConfig,
} from "./formSchema";
import { useSession } from "./session";
import { AdminClientDetail } from "./pages/AdminClientDetail";
import { AdminPanel } from "./pages/AdminPanel";
import { ClientPortal } from "./pages/ClientPortal";
import { FormPage } from "./pages/FormPage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  const path = useMemo(() => window.location.pathname, []);

  if (path.startsWith("/onboarding") || path.startsWith("/offer")) {
    const form: FormConfig = path.startsWith("/onboarding") ? onboardingForm : offerForm;
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href={form.path} aria-label={form.title}>
            <img src={logoUrl} alt="" />
            <strong>Growkey</strong>
            <span>{form.shortTitle}</span>
          </a>
        </header>
        <FormPage form={form} />
      </div>
    );
  }

  const clientDetailMatch = path.match(/^\/admin\/clients\/([0-9a-fA-F-]+)$/);
  if (clientDetailMatch) {
    return (
      <RequireRole role="admin">
        <div className="app-shell">
          <header className="topbar">
            <a className="brand" href="/admin" aria-label="Panel interno">
              <img src={logoUrl} alt="" />
              <strong>Growkey</strong>
              <span>Panel interno</span>
            </a>
            <div className="topbar-actions">
              <ViewSwitch current="admin" />
              <SignOutButton />
            </div>
          </header>
          <AdminClientDetail clientId={clientDetailMatch[1]} />
        </div>
      </RequireRole>
    );
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    // /admin/onboarding y /admin/offer (links existentes) abren la pestaña
    // Formularios con el filtro correspondiente; /admin abre Clientes.
    const adminFilterSlug = path.startsWith("/admin/onboarding")
      ? ONBOARDING_SLUG
      : path.startsWith("/admin/offer")
        ? OFFER_SLUG
        : null;
    return (
      <RequireRole role="admin">
        <div className="app-shell">
          <header className="topbar">
            <a className="brand" href="/admin" aria-label="Panel interno">
              <img src={logoUrl} alt="" />
              <strong>Growkey</strong>
              <span>Panel interno</span>
            </a>
            <div className="topbar-actions">
              <ViewSwitch current="admin" />
              <SignOutButton />
            </div>
          </header>
          <AdminPanel
            initialFormsFilter={adminFilterSlug}
            initialTab={adminFilterSlug ? "forms" : "clients"}
          />
        </div>
      </RequireRole>
    );
  }

  if (path === "/app" || path.startsWith("/app/")) {
    return (
      <RequireRole role="client">
        <div className="app-shell">
          <header className="topbar">
            <a className="brand" href="/app" aria-label="Mi camino">
              <img src={logoUrl} alt="" />
              <strong>Growkey</strong>
              <span>Mi camino</span>
            </a>
            <div className="topbar-actions">
              <ViewSwitch current="client" />
              <SignOutButton />
            </div>
          </header>
          <ClientPortal />
        </div>
      </RequireRole>
    );
  }

  // "/" y "/login" (y cualquier otra ruta) → login
  return <LoginPage />;
}

function SignOutButton() {
  const { signOut } = useSession();
  // Al cerrar sesión, RequireRole detecta la sesión nula y redirige a /login.
  return (
    <button className="ghost-button" onClick={() => void signOut()} type="button">
      Cerrar sesión
    </button>
  );
}

// /admin requiere rol admin; /app requiere tener un camino (me.client). Una misma
// cuenta puede tener ambos (admin + su propio camino) y cambiar entre vistas.
function RequireRole({ role, children }: { role: "admin" | "client"; children: React.ReactNode }) {
  const { session, me, loading, signOut } = useSession();
  const profile = me?.profile ?? null;
  const isAdmin = profile?.role === "admin";
  const hasCamino = Boolean(me?.client);
  const allowed = role === "admin" ? isAdmin : hasCamino;
  // Si no puede estar aquí pero sí en la otra vista, lo mandamos allá.
  const fallback = role === "admin" ? (hasCamino ? "/app" : null) : (isAdmin ? "/admin" : null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      window.location.replace("/login");
      return;
    }
    if (profile && !allowed && fallback) {
      window.location.replace(fallback);
    }
  }, [loading, session, profile, allowed, fallback]);

  if (loading || !session) {
    return (
      <div className="login-shell">
        <p className="route-status">Cargando…</p>
      </div>
    );
  }

  if (!profile || (!allowed && !fallback)) {
    return (
      <div className="login-shell">
        <img src={logoUrl} alt="" width={56} />
        <h1>Cuenta en revisión</h1>
        <div className="login-card">
          <p className="route-status">
            Tu cuenta está en revisión. Te avisaremos por correo cuando se apruebe y
            podrás entrar. Si crees que es un error, escríbele al equipo.
          </p>
          <button className="secondary-button" onClick={() => void signOut()} type="button">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="login-shell">
        <p className="route-status">Cargando…</p>
      </div>
    );
  }

  return <>{children}</>;
}

// Botón para cambiar entre el panel del equipo y el camino propio (cuando la
// cuenta tiene ambas cosas).
function ViewSwitch({ current }: { current: "admin" | "client" }) {
  const { me } = useSession();
  if (current === "admin") {
    if (!me?.client) return null;
    return (
      <a className="ghost-button" href="/app">
        Mi camino
      </a>
    );
  }
  if (me?.profile?.role !== "admin") return null;
  return (
    <a className="ghost-button" href="/admin">
      Panel del equipo
    </a>
  );
}
