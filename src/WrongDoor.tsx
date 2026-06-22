import logoUrl from "./assets/growkey-mascot.png";
import { useSession } from "./session";
import { doorUrl, type Door } from "./door";

// Pantalla cuando entras por la puerta equivocada (ej. admin por la de clientes).
// La cuenta pertenece a `neededDoor`; le damos el enlace correcto.
export function WrongDoor({ neededDoor }: { neededDoor: Door }) {
  const { signOut } = useSession();
  const url = doorUrl(neededDoor);
  return (
    <div className="login-shell">
      <img src={logoUrl} alt="" width={56} />
      <h1>Agentic Sales</h1>
      <div className="login-card">
        <h2>{neededDoor === "admin" ? "Cuenta del equipo" : "Cuenta de cliente"}</h2>
        <p className="route-status">
          {neededDoor === "admin"
            ? "Esta es la puerta de clientes y tu cuenta es del equipo. Entra por el panel del equipo."
            : "Esta es la puerta del equipo y tu cuenta es de cliente. Entra por tu portal."}
        </p>
        <a className="primary-button" href={url}>
          {neededDoor === "admin" ? "Ir al panel del equipo" : "Ir a mi portal"}
        </a>
        <button className="link-button" type="button" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
