const AWS = require("aws-sdk");
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

module.exports = { cognitoidentityserviceprovider };
