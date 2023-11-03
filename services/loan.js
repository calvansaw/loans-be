const { dynamodb } = require("../libs/dynamoClient");

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

module.exports = { createLoan };
