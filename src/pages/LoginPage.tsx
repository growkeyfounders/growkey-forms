import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { useSession } from "../session";
import logoUrl from "../assets/growkey-mascot.png";

const activationTokenHash = () =>
  new URLSearchParams(window.location.search).get("token_hash");

type Mode = "login" | "set-password" | "signup";

export function LoginPage() {
  const { session, me, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  // Estado del enlace de activación (?token_hash=...): lo canjeamos con verifyOtp
  // para abrir sesión y dejar que el cliente cree su contraseña.
  const [linkState, setLinkState] = useState<"none" | "checking" | "ready" | "error">(() =>
    activationTokenHash() ? "checking" : "none",
  );
  // Capturar el hash SINCRÓNICAMENTE en el initializer (ver verifyOtp abajo).
  const [mode, setMode] = useState<Mode>(() =>
    activationTokenHash() ||
    window.location.hash.includes("type=invite") ||
    window.location.hash.includes("type=recovery")
      ? "set-password"
      : "login",
  );
  const [busy, setBusy] = useState(false);
  // Entrada del equipo: subdominio "admin." o "equipo." → sin auto-registro.
  const isTeamHost =
    window.location.hostname.startsWith("admin") || window.location.hostname.startsWith("equipo");

  // Canjea el token del enlace de acceso por una sesión (verifyOtp).
  useEffect(() => {
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
    if (loading || !session || mode === "set-password") return;
    if (me?.profile?.role === "admin") window.location.replace("/admin");
    else if (me?.profile?.role === "client") window.location.replace("/app");
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
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError("No pudimos guardar la contraseña. Intenta de nuevo.");
    else { setMode("login"); window.location.hash = ""; window.location.replace("/app"); }
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
              <input type="password" placeholder="Nueva contraseña" value={password} minLength={8} required
                onChange={(e) => setPassword(e.currentTarget.value)} />
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
            <input type="password" placeholder="Contraseña (mín. 8)" value={password} minLength={8} required onChange={(e) => setPassword(e.currentTarget.value)} />
            <button className="primary-button" disabled={busy} type="submit">Crear cuenta</button>
            <button className="link-button" type="button" onClick={() => { setError(null); setMode("login"); }}>
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          </form>
        )
      ) : (
        <form onSubmit={loginPassword} className="login-card">
          <input type="email" placeholder="Correo" value={email} required onChange={(e) => setEmail(e.currentTarget.value)} />
          <input type="password" placeholder="Contraseña" value={password} required onChange={(e) => setPassword(e.currentTarget.value)} />
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
