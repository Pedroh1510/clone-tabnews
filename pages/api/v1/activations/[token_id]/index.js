import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";
import authorization from "models/authorization.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.patch(controller.canRequest("read:activation_token"), patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const userTryingToPatch = request.context.user;
  const tokenId = request.query.token_id;

  const activationToken = await activation.findOneValidById(tokenId);

  await activation.activateUserByUserId(activationToken.user_id);
  const activationTokenUsed = await activation.markTokenAsUsed(activationToken);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    "read:activation_token",
    activationTokenUsed,
  );

  return response.status(200).json(secureOutputValues);
}
