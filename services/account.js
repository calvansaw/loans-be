const { dynamodb } = require("../libs/dynamoClient");
const { cognitoidentityserviceprovider } = require("../libs/cognitoClient");

const LOANS_TABLE = "loans";

const scanDynamo = async (params, list) => {
  try {
    const dynamoData = await dynamodb.scan(params).promise();
    console.log("params: ", params);
    console.log("dynamoData: ", dynamoData);
    list = [...list, ...dynamoData.Items];

    if (dynamoData.LastEvaluatedKey && list.length < params.Limit) {
      params.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
      params.Limit = params.Limit - list.length;
      return await scanDynamo(params, list);
    }
    return { ...dynamoData, list };
  } catch (err) {
    console.log(err);
    return err;
  }
};

const getUser = async (accessToken) => {
  const params = { AccessToken: accessToken };
  return await cognitoidentityserviceprovider.getUser(params).promise();
};

const getUserSub = (userAttributes) => {
  return userAttributes.find((att) => att.Name === "sub").Value;
};

const checkAdmin = (userAttributes) => {
  return userAttributes.some(
    (att) => att.Name === "custom:role" && att.Value === "admin"
  );
};

const createAccount = async (item) => {
  const params = {
    TableName: LOANS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(#sub)",
    ExpressionAttributeNames: {
      "#sub": "sub",
    },
  };
  return await dynamodb.put(params).promise();
};

module.exports = { createAccount, checkAdmin, getUser, getUserSub, scanDynamo };
