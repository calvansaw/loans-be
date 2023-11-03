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

module.exports = { createLoan, getAllLoans };
