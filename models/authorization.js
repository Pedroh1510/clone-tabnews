function can(user, feature, resource) {
  let authorized = false;
  if (user?.features?.includes(feature)) {
    authorized = true;
  }
  if (feature === "update:user" && resource) {
    authorized = false;
    if (user.id === resource.id || can(user, "update:user:others", resource)) {
      authorized = true;
    }
  }
  return authorized;
}

function filterOutput(user, feature, output) {
  if (feature === "read:user") {
    return {
      id: output.id,
      username: output.username,
      created_at: output.created_at,
      updated_at: output.updated_at,
      features: output.features,
    };
  }
}

const authorization = {
  can,
  filterOutput,
};

export default authorization;
