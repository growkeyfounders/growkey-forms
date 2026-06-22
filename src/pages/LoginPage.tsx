import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { useSession } from "../session";
import { currentDoor } from "../door";
import logoUrl from "../assets/growkey-mascot.png";

const activationTokenHash = () =>
  new URLSearchParams(window.location.search).get("token_hash");

// Token de activación propio (?uid=...&setup=...): no caduca y muere al usarse.
const setupParams = () => {
  const p = new URLSearchParams(window.location.search);
  const uid = p.get("uid");
  const setup = p.get("setup");
  return uid && setup ? { uid, setup } : null;
};

type Mode = "login" | "set-password" | "signup";

function PasswordField({
  value,
  onChange,
  placeholder = "Contraseña",
  minLength,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minLength?: number;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input
        autoFocus={autoFocus}
        minLength={minLength}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        required
        type={show ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="password-toggle"
        onClick={() => setShow((s) => !s)}
        type="button"
      >
        {show ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { session, me, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  // Estado del enlace de activación. El flujo nuevo (?uid&setup) no necesita
  // verificación previa → "ready". El viejo (?token_hash) sí → "checking".
  const [linkState, setLinkState] = useState<"none" | "checking" | "ready" | "error">(() =>
    setupParams() ? "ready" : activationTokenHash() ? "checking" : "none",
  );
  const [mode, setMode] = useState<Mode>(() =>
    setupParams() ||
    activationTokenHash() ||
    window.location.hash.includes("type=invite") ||
    window.location.hash.includes("type=recovery")
      ? "set-password"
      : "login",
  );
  const [busy, setBusy] = useState(false);
  const isTeamHost =
    window.location.hostname.startsWith("admin") || window.location.hostname.startsWith("equipo");

  // Solo el flujo viejo (token_hash) usa verifyOtp.
  useEffect(() => {
    if (setupParams()) return;
    const tokenHash = activationTokenHash();
    if (!tokenHash) return;
    const type = (new URLSearchParams(window.location.search).get("type") || "recovery") as EmailOtpType;
    void (async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        setLinkState("error");
        setError("El enlace de acceso no es válido o ya expiró. Pídele uno nuevo al equipo.");
      } else {
        setLinkState("ready");
        window.history.replaceState({}, "", "/activar");
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !session || mode === "set-password" || !me) return;
    const isAdmin = me.profile?.role === "admin";
    const hasCamino = Boolean(me.client);
    const door = currentDoor();
    // La puerta decide dónde aterrizas primero; el botón "cambiar vista" hace el resto.
    let dest: string;
    if (door === "admin") dest = isAdmin ? "/admin" : hasCamino ? "/app" : "/admin";
    else if (door === "client") dest = hasCamino ? "/app" : isAdmin ? "/admin" : "/app";
    else dest = isAdmin ? "/admin" : "/app";
    window.location.replace(dest);
  }, [loading, session, me, mode]);

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Correo o contraseña incorrectos.");
    setBusy(false);
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const setup = setupParams();
    if (setup) {
      try {
        const res = await fetch("/api/skool/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: setup.uid, setup: setup.setup, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            data.error === "link_used"
              ? "Este enlace ya se usó (la cuenta ya tiene contraseña). Pídele al equipo uno nuevo si la olvidaste."
              : data.error === "weak_password"
                ? "La contraseña debe tener al menos 8 caracteres."
                : "No pudimos guardar la contraseña. Intenta de nuevo.",
          );
          setBusy(false);
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password });
        if (signInError) {
          setMode("login");
          window.history.replaceState({}, "", "/login");
          setError("Tu contraseña quedó lista. Inicia sesión con tu correo y contraseña.");
          setBusy(false);
          return;
        }
        window.location.replace("/app");
      } catch {
        setError("No pudimos guardar la contraseña. Intenta de nuevo.");
        setBusy(false);
      }
      return;
    }
    // Flujo viejo (token_hash / recovery de Supabase).
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const msg = error.message || "";
      setError(
        /session|jwt|expired|missing|token/i.test(msg)
          ? "El enlace expiró o ya se usó. Pídele al equipo un enlace nuevo y ábrelo de inmediato."
          : /different|same/i.test(msg)
            ? "La contraseña debe ser distinta a una anterior. Usa otra."
            : /weak|breach|pwned|short|least|8 char/i.test(msg)
              ? "Contraseña muy débil o común. Usa una más larga y única (mín. 8)."
              : `No pudimos guardar la contraseña: ${msg || "intenta de nuevo"}.`,
      );
    } else {
      setMode("login");
      window.location.hash = "";
      window.location.replace("/app");
    }
    setBusy(false);
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/skool/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.ok) {
        setSignupDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === "already_exists"
            ? "Ese correo ya tiene una cuenta. Inicia sesión."
            : data.error === "weak_password"
              ? "La contraseña debe tener al menos 8 caracteres."
              : data.error === "invalid_email"
                ? "Revisa el correo: no parece válido."
                : "No pudimos enviar tu solicitud. Intenta de nuevo.",
        );
      }
    } catch {
      setError("No pudimos enviar tu solicitud. Intenta de nuevo.");
    }
    setBusy(false);
  }

  return (
    <div className="login-shell">
      <img src={logoUrl} alt="" width={56} />
      <h1>Agentic Sales</h1>
      {isTeamHost ? <p className="login-divider">Acceso del equipo</p> : null}

      {mode === "set-password" ? (
        <form onSubmit={setNewPassword} className="login-card">
          <h2>Crea tu contraseña</h2>
          {linkState === "checking" ? (
            <p className="route-status">Validando tu enlace de acceso…</p>
          ) : linkState === "error" ? null : (
            <>
              <p className="login-divider">Define tu contraseña para entrar a tu camino.</p>
              <PasswordField value={password} onChange={setPassword} placeholder="Nueva contraseña" minLength={8} autoFocus />
              <button className="primary-button" disabled={busy} type="submit">Guardar y entrar</button>
            </>
          )}
        </form>
      ) : mode === "signup" ? (
        signupDone ? (
          <div className="login-card">
            <h2>¡Solicitud enviada! 🎉</h2>
            <p className="login-divider">
              Tu cuenta quedó en revisión. Te avisaremos por correo cuando se apruebe y podrás entrar
              con tu correo y contraseña.
            </p>
            <button className="secondary-button" type="button" onClick={() => { setSignupDone(false); setMode("login"); }}>
              Volver al inicio
            </button>
          </div>
        ) : (
          <form onSubmit={signup} className="login-card">
            <h2>Crear cuenta</h2>
            <input type="text" placeholder="Nombre y apellido" value={name} required onChange={(e) => setName(e.currentTarget.value)} />
            <input type="email" placeholder="Correo" value={email} required onChange={(e) => setEmail(e.currentTarget.value)} />
            <PasswordField value={password} onChange={setPassword} placeholder="Contraseña (mín. 8)" minLength={8} />
            <button className="primary-button" disabled={busy} type="submit">Crear cuenta</button>
            <button className="link-button" type="button" onClick={() => { setError(null); setMode("login"); }}>
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </form>
        )
      ) : (
        <form onSubmit={loginPassword} className="login-card">
          <input type="email" placeholder="Correo" value={email} required onChange={(e) => setEmail(e.currentTarget.value)} />
          <PasswordField value={password} onChange={setPassword} />
          <button className="primary-button" disabled={busy} type="submit">Entrar</button>
          {!isTeamHost ? (
            <button className="link-button" type="button" onClick={() => { setError(null); setMode("signup"); }}>
              ¿No tienes cuenta? Crear cuenta
            </button>
          ) : null}
        </form>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
