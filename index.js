const utils = require("./helpers/utils");
const account = require("./services/account");

const LOANS_URL = "/loans";

const handler = async (event) => {
  console.log("event: ", event);
  console.log("requestContext.authorizer: ", event.requestContext.authorizer);
  let response;
  switch (true) {
    case event.httpMethod === "POST" && event.path === LOANS_URL:
      response = await account.createAccount(event);
      break;

    default:
      response = utils.buildResponse(404);
  }
  return response;
};

module.exports.handler = handler;
