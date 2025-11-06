import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";
import authorization from "models/authorization.js";
import user from "models/user.js";
import { ForbiddenError } from "infra/errors.js";

const router = createRouter();

router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const tokenId = request.query.token_id;

  const activationToken = await activation.findOneValidById(tokenId);
  const activationUser = await user.findOneById(activationToken.user_id);
  if (!authorization.can(activationUser, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para ativar a conta",
      action: `Contate o suporte caso você acredite que isso seja um erro`,
    });
  }

  const activationTokenUsed = await activation.markTokenAsUsed(activationToken);
  await activation.activateUserByUserId(activationToken.user_id);

  return response.status(200).json(activationTokenUsed);
}
