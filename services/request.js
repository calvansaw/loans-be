const { dynamodb } = require("../libs/dynamoClient");
const { cognitoidentityserviceprovider } = require("../libs/cognitoClient");
const utils = require("../helpers/utils");

const REQUESTS_TABLE = "requests";

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

const scanDynamo = async (params, list) => {
  try {
    const dynamoData = await dynamodb.scan(params).promise();
    console.log("params: ", params);
    console.log("dynamoData: ", dynamoData);
    list = [...list, ...dynamoData.Items];
    if (dynamoData.LastEvaluatedKey && list.length < params.Limit) {
      params.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
      return await scanDynamo(params, list);
    }
    return { ...dynamoData, list };
  } catch (err) {
    console.log(err);
    return err;
  }
};

const getAllRequests = async (event) => {
  const { exclusiveStartKey, limit } = event.queryStringParameters;

  const params = {
    TableName: REQUESTS_TABLE,
    Limit: limit,
    ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
  };

  try {
    const scanResult = await scanDynamo(params, []);
    return utils.buildResponse(200, scanResult);
  } catch (err) {
    return utils.buildResponse(400, err);
  }
};

const approveRequest = () => {};
const rejectRequest = () => {};

module.exports = { createRequest, getAllRequests };
