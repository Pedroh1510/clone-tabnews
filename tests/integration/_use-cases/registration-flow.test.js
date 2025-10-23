import webserver from "infra/webserver.js";
import activation from "models/activation.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.cleanEmail();
  await orchestrator.runPendingMigrations();
});

describe("Use case: Registration Flow(all successful)", () => {
  let createUseResponseBody;
  let activationTokenId;
  test("Create user account", async () => {
    const response = await fetch("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "RegistrationFlow",
        email: "registration.flow@curso.dev",
        password: "RegistrationFlowPassword",
      }),
    });

    expect(response.status).toBe(201);

    createUseResponseBody = await response.json();

    expect(createUseResponseBody).toEqual({
      id: createUseResponseBody.id,
      username: "RegistrationFlow",
      email: "registration.flow@curso.dev",
      password: createUseResponseBody.password,
      created_at: createUseResponseBody.created_at,
      updated_at: createUseResponseBody.updated_at,
      features: ["read:activation_token"],
    });
  });
  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.from?.address).toBe("contato@curso.dev");
    expect(lastEmail.to[0]?.address).toBe("registration.flow@curso.dev");
    expect(lastEmail.subject).toBe("Ative seu cadastro no FinTab!");
    expect(lastEmail.content).toContain("RegistrationFlow");

    activationTokenId = orchestrator.extractUUID(lastEmail.content);

    expect(lastEmail.content).toContain(
      `${webserver.origin}/cadastro/ativar/${activationTokenId}`,
    );

    const activationToken =
      await activation.findOneValidById(activationTokenId);
    expect(activationToken.user_id).toEqual(createUseResponseBody.id);
    expect(activationToken.used_at).toBe(null);
  });
  test("Activate account", async () => {
    const activationResponse = await fetch(
      `http://localhost:3000/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );
    expect(activationResponse.status).toBe(200);
    const activationResponseBody = await activationResponse.json();
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername("RegistrationFlow");
    expect(activatedUser.features).toEqual(["create:session"]);
  });
  test("Login", async () => {});
  test("Get user information", async () => {});
});
