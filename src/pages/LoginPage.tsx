import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { useSession } from "../session";
import logoUrl from "../assets/growkey-mascot.png";

const activationTokenHash = () =>
  new URLSearchParams(window.location.search).get("token_hash");

export function LoginPage() {
  const { session, me, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Estado del enlace de activación (?token_hash=...): lo canjeamos con verifyOtp
  // para abrir sesión y dejar que el cliente cree su contraseña, sin depender del
  // redirect configurado en Supabase ni de emails.
  const [linkState, setLinkState] = useState<"none" | "checking" | "ready" | "error">(() =>
    activationTokenHash() ? "checking" : "none",
  );
  // Capturar el hash SINCRÓNICAMENTE en el initializer: supabase-js
  // (detectSessionInUrl) consume y borra el hash de forma asíncrona,
  // así que un useEffect puede llegar tarde y saltarse el set-password.
  const [mode, setMode] = useState<"login" | "set-password">(() =>
    activationTokenHash() ||
    window.location.hash.includes("type=invite") ||
    window.location.hash.includes("type=recovery")
      ? "set-password"
      : "login",
  );
  const [busy, setBusy] = useState(false);

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
        // Quitar el token de la URL (que no quede en el historial).
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

  async function loginGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/login" },
    });
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError("No pudimos guardar la contraseña. Intenta de nuevo.");
    else { setMode("login"); window.location.hash = ""; window.location.replace("/app"); }
    setBusy(false);
  }

  return (
    <div className="login-shell">
      <img src={logoUrl} alt="" width={56} />
      <h1>Agentic Sales</h1>
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
      ) : (
        <form onSubmit={loginPassword} className="login-card">
          <button className="secondary-button" onClick={loginGoogle} type="button">Entrar con Google</button>
          <span className="login-divider">o con tu correo</span>
          <input type="email" placeholder="Correo" value={email} required onChange={(e) => setEmail(e.currentTarget.value)} />
          <input type="password" placeholder="Contraseña" value={password} required onChange={(e) => setPassword(e.currentTarget.value)} />
          <button className="primary-button" disabled={busy} type="submit">Entrar</button>
        </form>
      )}
      {error ? <p className="login-error">{error}</p> : null}
    </div>
  );
}
