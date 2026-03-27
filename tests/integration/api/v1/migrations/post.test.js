import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    test("Try run pending migrations", async () => {
      const response1 = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: "POST",
      });
      expect(response1.status).toBe(403);

      const responseBody = await response1.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação",
        action: 'Verifique se seu usuário possui a feature "create:migration"',
        status_code: 403,
      });
    });
  });
  describe("Default User", () => {
    test("Try run pending migrations", async () => {
      const defaultUser = await orchestrator.createUser();
      await orchestrator.activateUser(defaultUser);
      const defaultUserSession = await orchestrator.createSession(defaultUser);
      const response1 = await fetch(`${webserver.origin}/api/v1/migrations`, {
        method: "POST",
        headers: {
          Cookie: `session_id=${defaultUserSession.token}`,
        },
      });
      expect(response1.status).toBe(403);

      const responseBody = await response1.json();

      expect(responseBody).toEqual({
        name: "ForbiddenError",
        message: "Você não possui permissão para executar esta ação",
        action: 'Verifique se seu usuário possui a feature "create:migration"',
        status_code: 403,
      });
    });
  });

  describe("Privileged user", () => {
    describe("Running pending migrations", () => {
      test("with `create:migration`", async () => {
        await orchestrator.runPendingMigrations();
        const privilegedUser = await orchestrator.createUser();
        await orchestrator.activateUser(privilegedUser);
        await orchestrator.addFeaturesToUser(privilegedUser, [
          "read:migration",
          "create:migration",
        ]);
        const privilegedUserSession =
          await orchestrator.createSession(privilegedUser);
        const response2 = await fetch(`${webserver.origin}/api/v1/migrations`, {
          method: "POST",
          headers: {
            Cookie: `session_id=${privilegedUserSession.token}`,
          },
        });
        expect(response2.status).toBe(200);

        const response2Body = await response2.json();

        expect(Array.isArray(response2Body)).toBe(true);
        expect(response2Body.length).toBe(0);
      });
    });
  });
});
