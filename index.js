const utils = require("./helpers/utils");
const account = require("./services/account");
const request = require("./services/request");
const loan = require("./services/loan");

const LOANS_URL = "/loans";
const REQUESTS_URL = "/requests";

const handler = async (event) => {
  console.log("event: ", event);
  console.log("requestContext.authorizer: ", event.requestContext.authorizer);
  let response;
  switch (true) {
    case event.httpMethod === "GET" && event.path === LOANS_URL:
      response = await loan.getAllLoans(event);
      break;
    case event.httpMethod === "PUT" && event.path === LOANS_URL:
      response = await loan.updateLoan(event);
      break;
    case event.httpMethod === "POST" && event.path === REQUESTS_URL:
      response = await request.createRequest(event);
      break;
    case event.httpMethod === "GET" && event.path === REQUESTS_URL:
      response = await request.getAllRequests(event);
      break;
    case event.httpMethod === "PUT" && event.path === REQUESTS_URL:
      response = await request.updateRequest(event);
      break;

    default:
      response = utils.buildResponse(404);
  }
  return response;
};

module.exports.handler = handler;
