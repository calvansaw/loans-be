const { dynamodb } = require("../libs/dynamoClient");
const utils = require("../helpers/utils");
const account = require("../services/account");
const loan = require("../services/loan");

const REQUESTS_TABLE = "requests";
const CREATE_ACCOUNT = "createAccount";
const CREATE_LOAN = "createLoan";
const APPROVED = "APPROVED";
const REJECTED = "REJECTED";

const createRequest = async (data) => {
  const item = { ...data, requestId: `${new Date().valueOf()}` };
  const params = {
    TableName: REQUESTS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(requestId)",
  };

  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
          Message: "SUCCESS",
          Item: item,
        };
        return utils.buildResponse(200, body);
      },
      (err) => {
        return utils.buildResponse(400, err);
      }
    );
};

const deleteRequest = async (requestId) => {
  const params = {
    TableName: REQUESTS_TABLE,
    Key: { requestId },
  };

  return await dynamodb
    .delete(params)
    .promise()
    .then(
      (data) => {
        const body = {
          Operation: "DELETE",
          Message: "SUCCESS",
          Item: data,
        };
        return utils.buildResponse(200, body);
      },
      (err) => {
        return utils.buildResponse(400, err);
      }
    );
};

const getAllRequests = async (event) => {
  const accessToken = event.headers.Authorization.split("Bearer ")[1];

  let userInfo;
  try {
    userInfo = await account.getUser(accessToken);
    console.log("userInfo: ", userInfo);
  } catch (err) {
    return utils.buildResponse(400, err);
  }

  const isAdmin = account.checkAdmin(userInfo.UserAttributes);
  const { exclusiveStartKey, limit } = event.queryStringParameters || {};

  const params = {
    TableName: REQUESTS_TABLE,
    ...(limit && { Limit: parseInt(limit, 10) }),
    ...(exclusiveStartKey && {
      ExclusiveStartKey: { requestId: exclusiveStartKey },
    }),
    ...(!isAdmin && {
      FilterExpression: "#sub = :sub",
      ExpressionAttributeNames: {
        "#sub": "sub",
      },
      ExpressionAttributeValues: {
        ":sub": account.getUserSub(userInfo.UserAttributes),
      },
    }),
  };

  try {
    const scanResult = await account.scanDynamo(params, []);
    return utils.buildResponse(200, scanResult);
  } catch (err) {
    return utils.buildResponse(400, err);
  }
};

const approveRequest = async (eventBody, userSub) => {
  if (eventBody.requestType === CREATE_ACCOUNT) {
    const item = {
      ...eventBody.requestData,
      sub: userSub,
      loans: [],
      payments: [],
    };
    return await account.createAccount(item);
  } else if (eventBody.requestType === CREATE_LOAN) {
    const item = {
      ...eventBody.requestData,
      loanId: `${new Date().valueOf()}-${eventBody.requestData.loanType}`,
      redeemed: false,
      loanApproval: APPROVED,
    };
    return await loan.createLoan(item, userSub);
  }

  const error = { error: "Invalid request type" };
  return new Promise.reject(error);
};

const rejectRequest = async (eventBody, userSub) => {
  if (eventBody.requestType === CREATE_LOAN) {
    // still create a loan object for record purpose
    const item = {
      ...eventBody.requestData,
      loanId: `${new Date().valueOf()}-${eventBody.requestData.loanType}`,
      redeemed: false,
      loanApproval: REJECTED,
    };
    return await loan.createLoan(item, userSub);
  }
};

const updateRequest = async (event) => {
  const { headers, body } = event;
  const accessToken = headers.Authorization.split("Bearer ")[1];
  let userInfo;
  try {
    userInfo = await account.getUser(accessToken);
    console.log("userInfo: ", userInfo);
  } catch (err) {
    return utils.buildResponse(400, err);
  }

  if (!account.checkAdmin(userInfo.UserAttributes)) {
    const error = { error: "Unauthorized, user is not an admin" };
    return utils.buildResponse(403, error);
  }

  const eventBody = JSON.parse(body);
  const userSub = account.getUserSub(userInfo.UserAttributes);

  try {
    let response;
    if (eventBody.requestApproval === APPROVED) {
      response = await approveRequest(eventBody, userSub);
    } else if (eventBody.requestApproval === REJECTED) {
      response = await rejectRequest(eventBody, userSub);
    } else {
      const error = { error: "Invalid request approval type" };
      return utils.buildResponse(400, error);
    }

    await deleteRequest(eventBody.requestId);
    const body = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: response,
    };
    return utils.buildResponse(200, body);
  } catch (err) {
    return utils.buildResponse(400, err);
  }
};

module.exports = { createRequest, getAllRequests, updateRequest };
