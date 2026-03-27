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
  let createUserResponseBody;
  let activationTokenId;
  let createSessionResponseBody;
  test("Create user account", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/users`, {
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

    createUserResponseBody = await response.json();

    expect(createUserResponseBody).toEqual({
      id: createUserResponseBody.id,
      username: "RegistrationFlow",
      created_at: createUserResponseBody.created_at,
      updated_at: createUserResponseBody.updated_at,
      features: ["read:activation_token"],
    });
  });
  test("Receive activation email", async () => {
    const lastEmail = await orchestrator.getLastEmail();

    expect(lastEmail.from?.address).toBe(
      `contato@${process.env.EMAIL_SMTP_FROM_DOMAIN}`,
    );
    expect(lastEmail.to[0]?.address).toBe("registration.flow@curso.dev");
    expect(lastEmail.subject).toBe("Ative seu cadastro no FinTab!");
    expect(lastEmail.content).toContain("RegistrationFlow");

    activationTokenId = orchestrator.extractUUID(lastEmail.content);

    expect(lastEmail.content).toContain(
      `${webserver.origin}/cadastro/ativar/${activationTokenId}`,
    );

    const activationToken =
      await activation.findOneValidById(activationTokenId);
    expect(activationToken.user_id).toEqual(createUserResponseBody.id);
    expect(activationToken.used_at).toBe(null);
  });
  test("Activate account", async () => {
    const activationResponse = await fetch(
      `${webserver.origin}/api/v1/activations/${activationTokenId}`,
      {
        method: "PATCH",
      },
    );
    expect(activationResponse.status).toBe(200);
    const activationResponseBody = await activationResponse.json();
    expect(Date.parse(activationResponseBody.used_at)).not.toBeNaN();

    const activatedUser = await user.findOneByUsername("RegistrationFlow");
    expect(activatedUser.features).toEqual([
      "create:session",
      "read:session",
      "update:user",
      "read:status",
    ]);
  });
  test("Login", async () => {
    const createSessionResponse = await fetch(
      `${webserver.origin}/api/v1/sessions/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "registration.flow@curso.dev",
          password: "RegistrationFlowPassword",
        }),
      },
    );

    expect(createSessionResponse.status).toBe(201);

    createSessionResponseBody = await createSessionResponse.json();
    expect(createSessionResponseBody.user_id).toEqual(
      createUserResponseBody.id,
    );
  });
  test("Get user information", async () => {
    const userResponse = await fetch(`${webserver.origin}/api/v1/user`, {
      headers: {
        Cookie: `session_id=${createSessionResponseBody.token}`,
      },
    });

    expect(userResponse.status).toBe(200);
    const userResponseBody = await userResponse.json();
    expect(userResponseBody.id).toEqual(createUserResponseBody.id);
  });
});
