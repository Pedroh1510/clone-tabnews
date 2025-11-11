import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";

const router = createRouter();

router.use(controller.injectAnonymousOrUser);
router.patch(controller.canRequest("read:activation_token"), patchHandler);

export default router.handler(controller.errorHandlers);

async function patchHandler(request, response) {
  const tokenId = request.query.token_id;

  const activationToken = await activation.findOneValidById(tokenId);

  await activation.activateUserByUserId(activationToken.user_id);
  const activationTokenUsed = await activation.markTokenAsUsed(activationToken);

  return response.status(200).json(activationTokenUsed);
}
