import database from "infra/database.js";
import email from "infra/email.js";
import { ForbiddenError, NotFoundError } from "infra/errors.js";
import webserver from "infra/webserver.js";
import authorization from "models/authorization.js";
import user from "models/user.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000;

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const newToken = await runInsertQuery(userId, expiresAt);
  return newToken;

  async function runInsertQuery(userId, expiresAt) {
    const results = await database.query({
      text: `
      INSERT INTO
        user_activation_tokens (user_id, expires_at)
      VALUES
        ($1, $2)
      RETURNING
        *
      `,
      values: [userId, expiresAt],
    });
    return results.rows[0];
  }
}

async function sendEmailToUser(user, activationToken) {
  await email.send({
    from: "FinTab <contato@curso.dev>",
    to: user.email,
    subject: "Ative seu cadastro no FinTab!",
    body: `${user.username},  clique no link abaixo para ativar o seu cadastro no FinTab:

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe FinTab`,
  });
}

async function findOneValidById(tokenId) {
  const activationTokenFound = await runSelectQuery(tokenId);

  return activationTokenFound;

  async function runSelectQuery(tokenId) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          user_activation_tokens
        WHERE
          id = $1
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT
          1
      ;`,
      values: [tokenId],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message:
          "O token de ativação utilizado não foi encontrado no sistema ou expirou.",
        action: "Faça um novo cadastro.",
      });
    }

    return results.rows[0];
  }
}

async function markTokenAsUsed(activationToken) {
  const activationTokenUsed = await runUpdateActivationToken(activationToken);
  return activationTokenUsed;

  async function runUpdateActivationToken(activationToken) {
    const results = await database.query({
      text: `
        UPDATE
          user_activation_tokens
        SET
          used_at = timezone('utc', now()),
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
        ;`,
      values: [activationToken.id],
    });

    return results.rows[0];
  }
}

async function activateUserByUserId(userId) {
  const activationUser = await user.findOneById(userId);
  if (!authorization.can(activationUser, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para ativar a conta",
      action: `Contate o suporte caso você acredite que isso seja um erro`,
    });
  }
  return await user.setFeatures(userId, ["create:session", "read:session"]);
}

const activation = {
  EXPIRATION_IN_MILLISECONDS,
  sendEmailToUser,
  create,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
};

export default activation;
