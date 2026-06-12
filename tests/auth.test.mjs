import { describe, expect, it } from "vitest";
import { authenticate } from "../server/auth.mjs";

const requestWith = (header) => ({ headers: header ? { authorization: header } : {} });

describe("authenticate", () => {
  it("null sin header Bearer", async () => {
    expect(await authenticate(requestWith(undefined), { fetchImpl: async () => { throw new Error("no llamar"); } })).toBeNull();
    expect(await authenticate(requestWith("Basic xyz"), { fetchImpl: async () => { throw new Error("no llamar"); } })).toBeNull();
  });
  it("null si supabase rechaza el token", async () => {
    const fetchImpl = async () => ({ ok: false });
    expect(await authenticate(requestWith("Bearer bad"), { fetchImpl })).toBeNull();
  });
  it("null si el fetch a supabase auth falla (red caída o env sin configurar)", async () => {
    const fetchImpl = async () => { throw new Error("network down"); };
    expect(await authenticate(requestWith("Bearer any"), { fetchImpl })).toBeNull();
  });
  it("devuelve userId+role cuando token y perfil existen", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ id: "u1" }) });
    const loadProfile = async (id) => ({ user_id: id, role: "admin", name: "Majo" });
    const result = await authenticate(requestWith("Bearer good"), { fetchImpl, loadProfile });
    expect(result).toEqual({ userId: "u1", role: "admin", name: "Majo" });
  });
  it("null si no hay perfil (usuario no invitado)", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ id: "u2" }) });
    const loadProfile = async () => null;
    expect(await authenticate(requestWith("Bearer good"), { fetchImpl, loadProfile })).toBeNull();
  });
});
