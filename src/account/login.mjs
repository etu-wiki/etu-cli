import fs from "fs";
import os from "os";
import path from "path";
import { CognitoIdentity } from "@aws-sdk/client-cognito-identity";
import { CognitoIdentityProvider } from "@aws-sdk/client-cognito-identity-provider";
import inquirer from "inquirer";
import yaml from "js-yaml";
import jwt from "jsonwebtoken";

import { COGNITO_CLIENT_ID, USER_POOL_ID, IDENTITY_POOL_ID, AWS_REGION } from "../config.mjs";

// Configure AWS Cognito
const client = new CognitoIdentityProvider({ region: AWS_REGION });
const cognitoClient = new CognitoIdentity({ region: AWS_REGION });

// prompt user to enter username and password or register new user or confirm registration
const answer = await inquirer.prompt([
  {
    type: "list",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { name: "Sign In", value: "login" },
      { name: "Sign Up", value: "register" },
    ],
  },
  {
    type: "input",
    name: "username",
    message: "Enter your username:",
    when(answers) {
      return answers.action === "login";
    },
  },
  {
    type: "password",
    name: "password",
    message: "Enter your password:",
    when(answers) {
      return answers.action === "login";
    },
  },
  {
    type: "input",
    name: "username",
    message: "(1/4) Enter your username:",
    when(answers) {
      return answers.action === "register";
    },
  },
  {
    type: "password",
    name: "password",
    message: "(2/4) Enter your password:",
    when(answers) {
      return answers.action === "register";
    },
  },
  {
    type: "password",
    name: "password_confirm",
    message: "      Confirm your password:",
    when(answers) {
      return answers.action === "register";
    },
  },
  {
    type: "input",
    name: "email",
    message: "(3/4) Enter your email:",
    when(answers) {
      return answers.action === "register";
    },
  },
]);

let isConfirmed = false;

// register new user
if (answer.action === "register") {
  try {
    if (answer.password !== answer.password_confirm) {
      console.log("Registration failed: Please enter the same password twice.");
      process.exit(1);
    }
    await client.signUp({
      ClientId: COGNITO_CLIENT_ID,
      Password: answer.password,
      Username: answer.username,
      UserAttributes: [
        {
          Name: "email",
          Value: answer.email,
        }
      ],
    });


    while (!isConfirmed) {
      // prompt for confirmation code
      const confirmAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "code",
          message: "(4/4) Please check your email and enter confirmation code:",
        },
      ]);
      try {
        await client.confirmSignUp({
          ClientId: COGNITO_CLIENT_ID,
          ConfirmationCode: confirmAnswer.code,
          Username: answer.username,
        });
        isConfirmed = true;
      } catch (err) {
        console.log(err.message);
      }
    }
    console.log("Registration successful!");
  } catch (err) {
    console.log("Registration failed: " + err);
  }
}

// login
if (answer.action === "login" || isConfirmed) {
  try {
    const response = await client.initiateAuth({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: answer.username,
        PASSWORD: answer.password,
      },
    });
    const idToken = response.AuthenticationResult.IdToken;
    const jwtId = jwt.decode(idToken);

    // Get the identity ID using the access token
    const userPoolEndpoint = `cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`;
    const logins = {};
    logins[userPoolEndpoint] = idToken;

    const { IdentityId } = await cognitoClient.getId({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: logins,
    });

    // // Get the temporary credentials using the identity ID
    const { Credentials } = await cognitoClient.getCredentialsForIdentity({
      IdentityId,
      Logins: logins,
    });

    fs.mkdirSync(path.join(os.homedir(), ".etu"), { recursive: true });
    fs.writeFileSync(
      path.join(os.homedir(), ".etu", ".credentials"),
      yaml.dump({
        user: {
          id: jwtId.sub,
          name: jwtId.name,
          email: jwtId.email,
          username: answer.username,
        },
        token: response.AuthenticationResult,
        sts: Credentials,
      })
    );

    console.log(`Welcome ${answer.username}! Enjoy your ETU journey!`);
  } catch (err) {
    console.log("Login failed: " + err);
  }
}
