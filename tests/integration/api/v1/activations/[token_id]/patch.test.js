import activation from "models/activation.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/activations/[token_id]", () => {
  describe("Anonymous user", () => {
    test("Retrieving pending migrations", async () => {
      const response = await fetch(
        "http://localhost:3000/api/v1/activations/0eb19974-fc5c-4acb-b5ef-51360966bac4",
        {
          method: "PATCH",
        },
      );
      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
        status_code: 404,
      });
    });
  });
  describe("Default user", () => {
    test("Activate account", async () => {
      const createdUser = await orchestrator.createUser();
      const activationToken = await activation.create(createdUser.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/activations/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );
      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: activationToken.id,
        created_at: activationToken.created_at.toISOString(),
        expires_at: activationToken.expires_at.toISOString(),
        updated_at: responseBody.updated_at,
        used_at: responseBody.used_at,
        user_id: createdUser.id,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.updated_at)).not.toBeNaN();
      expect(Date.parse(responseBody.used_at)).not.toBeNaN();
    });

    test("Activate account again", async () => {
      const createdUser = await orchestrator.createUser();
      const activationToken = await activation.create(createdUser.id);
      await fetch(
        `http://localhost:3000/api/v1/activations/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );
      const response = await fetch(
        `http://localhost:3000/api/v1/activations/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );
      expect(response.status).toBe(404);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        action: "Faça um novo cadastro.",
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou.",
        name: "NotFoundError",
        status_code: 404,
      });
    });
    test("Activate account baned", async () => {
      const createdUser = await orchestrator.createUser();
      const activationToken = await activation.create(createdUser.id);
      await user.setFeatures(createdUser.id, []);
      const response = await fetch(
        `http://localhost:3000/api/v1/activations/${activationToken.id}`,
        {
          method: "PATCH",
        },
      );
      expect(response.status).toBe(403);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        action: "Contate o suporte caso você acredite que isso seja um erro",
        message: "Você não possui permissão para ativar a conta",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
});
