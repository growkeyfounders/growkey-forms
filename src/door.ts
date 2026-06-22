// La app se sirve por dos "puertas" (subdominios): clientes (sales.) y equipo (admin.).
// Cada puerta es SOLO para su público. Aquí detectamos en cuál estamos y armamos
// el enlace a la otra, para que admin y cliente queden totalmente separados.

export type Door = "admin" | "client";

// Puerta actual según el subdominio. null en localhost/otro → no se fuerza (dev).
export function currentDoor(): Door | null {
  const h = window.location.hostname;
  if (h.startsWith("admin") || h.startsWith("equipo")) return "admin";
  if (h.startsWith("sales") || h.startsWith("app")) return "client";
  return null;
}

// URL de login de la puerta indicada (mismo dominio base, distinto subdominio).
export function doorUrl(target: Door): string {
  const { protocol, hostname, port } = window.location;
  const suffix = port ? `:${port}` : "";
  const host =
    target === "admin"
      ? hostname.replace(/^(sales|app|www)\./, "admin.")
      : hostname.replace(/^(admin|equipo)\./, "sales.");
  return `${protocol}//${host}${suffix}/login`;
}
