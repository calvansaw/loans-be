const { dynamodb } = require("../libs/dynamoClient");
const { cognitoidentityserviceprovider } = require("../libs/cognitoClient");
const utils = require("../helpers/utils");

const LOANS_TABLE = "loans";

const getUser = async (accessToken) => {
  const params = { AccessToken: accessToken };
  return await cognitoidentityserviceprovider.getUser(params).promise();
};

const checkAdmin = (userAttributes) => {
  return userAttributes.some(
    (att) => att.Name === "custom:role" && att.Value === "admin"
  );
};

const createAccount = async (event) => {
  const { headers, body } = event;

  const accessToken = headers.Authorization.split("Bearer ")[1];
  let userInfo;
  try {
    userInfo = await getUser(accessToken);
    console.log("userInfo: ", userInfo);
  } catch (err) {
    return utils.buildResponse(400, err);
  }

  if (!checkAdmin(userInfo.UserAttributes)) {
    const error = { error: "Unauthorized, user is not an admin" };
    return utils.buildResponse(403, error);
  }

  const params = {
    TableName: LOANS_TABLE,
    Item: JSON.parse(body),
    ConditionExpression: "attribute_not_exists(#sub)",
    ExpressionAttributeNames: {
      "#sub": "sub",
    },
  };
  return await dynamodb
    .put(params)
    .promise()
    .then(
      () => {
        const body = {
          Operation: "SAVE",
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

module.exports.createAccount = createAccount;
