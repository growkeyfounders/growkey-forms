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
            <SignOutButton />
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
            <SignOutButton />
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

function RequireRole({ role, children }: { role: "admin" | "client"; children: React.ReactNode }) {
  const { session, me, loading, signOut } = useSession();
  const profile = me?.profile ?? null;

  useEffect(() => {
    if (loading) return;
    if (!session) {
      window.location.replace("/login");
      return;
    }
    if (profile && profile.role !== role) {
      window.location.replace(profile.role === "admin" ? "/admin" : "/app");
    }
  }, [loading, session, profile, role]);

  if (loading || !session || (profile && profile.role !== role)) {
    return (
      <div className="login-shell">
        <p className="route-status">Cargando…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="login-shell">
        <img src={logoUrl} alt="" width={56} />
        <h1>Sin acceso</h1>
        <div className="login-card">
          <p className="route-status">
            Tu cuenta no tiene acceso a Agentic Skool. Si crees que es un error,
            escríbele al equipo Growkey.
          </p>
          <button className="secondary-button" onClick={() => void signOut()} type="button">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
