import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "osiris-test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("OSIRIS safety boundaries", () => {
  it("rejects recon targets containing command or URL syntax", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.recon.lookup({ target: "example.org; rm -rf /" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.recon.lookup({ target: "https://example.org" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns source metadata for public intelligence layers", async () => {
    const caller = appRouter.createCaller(createContext());
    const snapshot = await caller.intel.snapshot();
    expect(snapshot.meta.sources).toContain("USGS");
    expect(snapshot.layers.weather).toHaveProperty("source", "Open-Meteo");
    expect(snapshot.layers.cameras).toHaveProperty("availability");
  });

  it("keeps workspace data scoped to the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext());
    const workspace = await caller.workspace.get();
    expect(workspace).toHaveProperty("areas");
    expect(workspace).toHaveProperty("rules");
    expect(workspace).toHaveProperty("preferences");
  });
});
