const { dynamodb } = require("../libs/dynamoClient");
const account = require("../services/account");
const utils = require("../helpers/utils");

const LOANS_TABLE = "loans";

const createLoan = async (item, userSub) => {
  const params = {
    TableName: LOANS_TABLE,
    Key: { sub: userSub },
    UpdateExpression: "SET #loans = list_append(#loans, :loans)",
    ExpressionAttributeNames: {
      "#loans": "loans",
    },
    ExpressionAttributeValues: {
      ":loans": [item],
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dynamodb.update(params).promise();
};

const getAllLoans = async (event) => {
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
    TableName: LOANS_TABLE,
    ...(limit && { Limit: parseInt(limit, 10) }),
    ...(exclusiveStartKey && {
      ExclusiveStartKey: { sub: exclusiveStartKey },
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

const updateLoan = async (event) => {
  const { headers, body } = event;
  const accessToken = headers.Authorization.split("Bearer ")[1];
  let userInfo;
  try {
    userInfo = await account.getUser(accessToken);
    console.log("userInfo: ", userInfo);
  } catch (err) {
    return utils.buildResponse(400, err);
  }

  const eventBody = JSON.parse(body);
  const userSub = account.getUserSub(userInfo.UserAttributes);
  const payment = {
    paymentId: `${new Date().valueOf()}`,
    loanId: eventBody.loan.loanId,
    loanTitle: eventBody.loan.loanTitle,
    loanType: eventBody.loan.loanType,
    paymentDate: new Date().toISOString(),
    amount: eventBody.paymentAmount,
    currency: eventBody.loan.currency,
  };

  const params = {
    TableName: LOANS_TABLE,
    Key: { sub: userSub },
    UpdateExpression: `SET #loans[${eventBody.index}] = :loan, #payments = list_append(#payments, :payment)`,
    ExpressionAttributeNames: {
      "#loans": "loans",
      "#payments": "payments",
    },
    ExpressionAttributeValues: {
      ":loan": eventBody.loan,
      ":payment": [payment],
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const response = await dynamodb.update(params).promise();
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

module.exports = { createLoan, getAllLoans, updateLoan };
