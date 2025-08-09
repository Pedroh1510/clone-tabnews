import retry from "async-retry";
import { faker } from "@faker-js/faker";

import database from "../infra/database.js";
import migrator from "../models/migrator.js";
import user from "../models/user.js";
import session from "../models/session.js";
import email from "infra/email.js";

async function waitForAllServices() {
  await waitForWebServer();
  await waitForMailServer();

  async function waitForMailServer() {
    await retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    if (!(await email.verifyConnection())) {
      throw Error();
    }

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:8025");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");

      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function getLastEmail() {
  const response = await fetch(`http://localhost:8025/api/v1/message/latest`);

  console.log(response.ok);
  if (!response.ok) return null;
  const content = await response.json();

  return {
    subject: content.Subject,
    to: content.To?.map((item) => ({ address: item.Address, name: item.Name })),
    from: { address: content.From.Address, name: content.From.Name },
    content: content.Text,
  };
}

async function cleanEmail() {
  await fetch(`http://localhost:8025/api/v1/messages`, { method: "DELETE" });
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  getLastEmail,
  cleanEmail,
};

export default orchestrator;
