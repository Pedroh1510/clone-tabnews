import webserver from "infra/webserver.js";
import email from "infra/email.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.cleanEmail();
});

describe("infra/email.js", () => {
  test("send()", async () => {
    await email.send({
      from: `"Service Team" <suporte@finance.com>`,
      to: "contato@finance.com",
      subject: "Teste assunto",
      body: "Teste corpo",
    });
    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail).toEqual({
      from: { address: "suporte@finance.com", name: "Service Team" },
      to: [{ address: "contato@finance.com", name: "" }],
      subject: "Teste assunto",
      content: "Teste corpo\r\n",
    });
  });
});
