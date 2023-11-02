const { dynamodb } = require("../libs/dynamoClient");
const utils = require("../helpers/utils");

const LOANS_TABLE = "loans";

const createAccount = async (data) => {
  const params = {
    TableName: LOANS_TABLE,
    Item: data,
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
        console.log(err);
        return utils.buildResponse(400, err);
      }
    );
};

module.exports.createAccount = createAccount;
