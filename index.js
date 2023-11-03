const utils = require("./helpers/utils");
const account = require("./services/account");
const request = require("./services/request");

const LOANS_URL = "/loans";
const REQUESTS_URL = "/requests";

const handler = async (event) => {
  console.log("event: ", event);
  console.log("requestContext.authorizer: ", event.requestContext.authorizer);
  let response;
  switch (true) {
    case event.httpMethod === "POST" && event.path === LOANS_URL:
      response = await account.createAccount(event);
      break;
    case event.httpMethod === "POST" && event.path === REQUESTS_URL:
      response = await request.createRequest(JSON.parse(event.body));
      break;
    case event.httpMethod === "GET" && event.path === REQUESTS_URL:
      response = await request.getAllRequests(event);
      break;

    default:
      response = utils.buildResponse(404);
  }
  return response;
};

module.exports.handler = handler;
