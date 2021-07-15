import dotenv from "dotenv";
// eslint-disable-next-line no-unused-vars
import express from "express";

import { authenticate } from "ldap-authentication";

import { queryPromise } from "../db/database.js";
// eslint-disable-next-line no-unused-vars
import { HttpResponseWrapper } from "../global/HttpControllerWrapper.js";
import Tokens from "../global/Tokens.js";

dotenv.config();

/**
 * @api       {post}        /users/login   Post a user login
 * @apiName   PostUserLogin
 * @apiGroup  User
 *
 * @apiParam {string} userPseudo    ENT Login
 * @apiParam {string} userPassword  ENT password
 *
 * @apiSuccess (200) {string} pseudo  			the ENT login
 * @apiSuccess (200) {string} accessToken   the user access token
 * @apiSuccess (200) {string} refreshToken  the user refresh token
 *
 * @apiError 	 (400) BadRequestFormat
 * @apiError   (401) IncorrectPassword
 * @apiError   (404) UserNotFound
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function login(req, res) {
  const { userPseudo, userPassword } = req.body;

  if (!userPseudo || !userPassword) {
    return res.sendUsageError(400, "Pseudo ou mot de passe invalide");
  }

  const userExists = await doesUserExist(userPseudo);

  if (!userExists) {
    res.sendUsageError(404, "Utilisateur inconnu");
    return;
  }

  const auth =
    process.env.NODE_ENV === "test"
      ? queryMockedLdap(userPseudo, userPassword)
      : await queryLdap(userPseudo, userPassword);
  if (auth) {
    const isAdmin = await isUserAdmin(userPseudo);
    const refreshToken = await Tokens.createRefreshToken(userPseudo, isAdmin);
    const accessToken = Tokens.createAccessToken(refreshToken);
    res.sendResponse(200, {
      user: userPseudo,
      accessToken,
      refreshToken,
      isAdmin,
    });
  } else {
    res.sendUsageError(401, "Échec de l'authentification");
  }
}

/**
 * @api       {post}        /users/logout  User logout
 * @apiName   UserLogout
 * @apiGroup  User
 *
 * @apiParam {string} refreshToken 			The user refresh token
 *
 * @apiPermission LoggedIn
 *
 * @apiError 	 (400) BadRequestFormat
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function logout(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendUsageError(400, "Le refresh token est manquant");
  }

  await Tokens.deleteToken(refreshToken);

  res.sendResponse(200, "Utilisateur déconnecté avec succès");
}

/**
 * @api       {post}  /users/token   Generate a new access token
 * @apiName   GenerateAccessToken
 * @apiGroup  User
 *
 * @apiParam {string} refreshToken The refresh token
 *
 * @apiSuccess (200) {string} accessToken  A new access token
 *
 * @apiError 	 (400) InvalidToken The token is invalid or expired
 * @apiError 	 (400) MissingToken The token is missing
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function generateAccessToken(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.sendUsageError(400, "Le refresh token est manquant");
  }

  const tokenExists = await Tokens.doesRefreshTokenExist(refreshToken);

  if (!tokenExists) {
    return res.sendUsageError(400, "Ce refresh token n'existe pas");
  }

  const accessToken = Tokens.createAccessToken(refreshToken);

  res.sendResponse(200, { accessToken });
}

/**
 * @apiDefine GetUserSuccess
 *
 * @apiSuccess {string} pseudo            ENT login
 * @apiSuccess {number} victories         Number of victories
 * @apiSuccess {number} defeats           Number of defeats
 * @apiSuccess {Object} avatar            Avatar object
 * @apiSuccess {string} avatar.colorBG    Hex background color
 * @apiSuccess {string} avatar.colorBody  Hex Body colod
 * @apiSuccess {number} avatar.eyes       Number of the eyes
 * @apiSuccess {number} avatar.hands      Number of the hands
 * @apiSuccess {number} avatar.hat        Number of the hat
 * @apiSuccess {number} avatar.mouth      Number of the mouth
 */

/**
 * @api {get} /users/ Get data of users
 * @apiName GetAllUsersData
 * @apiGroup User
 *
 * @apiPermission LoggedIn
 *
 * @apiParam {Boolean} challengeable=false      Query parameter: Only get challengeable users
 *
 * @apiSuccess (200) {object[]} users           All users in an array
 * @apiSuccess (200) {string}   users.pseudo    Pseudo of the user
 * @apiSuccess (200) {int}      users.victories Number of victories
 * @apiSuccess (200) {int}      users.defeats   Number of defeats
 * @apiSuccess (200) {string}   users.avatar    JSONified avatar informations
 *
 * @apiUse ErrorServer
 *
 * @param {HttpResponseWrapper} res The http response
 */
async function getAll(req, res) {
  const currentUser = req.body._auth.user;

  const filterChallengeable = req.query.challengeable === "true";

  const sql =
    "SELECT us_login AS pseudo, \
            us_victories AS victories, \
            us_defeats AS defeats, \
            us_avatar AS avatar \
      FROM user \
      WHERE us_deleted IS NULL;";

  const sqlRes = filterChallengeable
    ? (await queryPromise("CALL getChallengeableUsers(?);", [currentUser]))[0]
    : await queryPromise(sql);

  const usersData = {};
  for (const value of sqlRes) {
    usersData[value.pseudo] = {
      pseudo: value.pseudo,
      victories: Number(value.victories),
      defeats: Number(value.defeats),
      avatar: JSON.parse(value.avatar),
    };
  }

  res.sendResponse(200, usersData);
}

/**
 * @api {post} /users/ Get data of several users
 * @apiName GetUsersData
 * @apiGroup User
 *
 * @apiPermission LoggedIn
 *
 * @apiParam {string[]} listOfUsers  Pseudo of several users
 *
 * @apiSuccess (200) {object[]} users  All users in an array
 *
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function severalGetInfos(req, res) {
  const listOfUsers = req.body;
  if (
    !Array.isArray(listOfUsers) ||
    listOfUsers.length === 0 ||
    listOfUsers.some((user) => typeof user !== "string")
  ) {
    return res.sendUsageError(401, "Liste d'utilisateurs invalide");
  }

  const sqlWhere = listOfUsers.map(() => "us_login = ?");
  const sql = `SELECT us_login AS pseudo,
                      us_victories AS victories,
                      us_defeats AS defeats,
                      us_avatar AS avatar
               FROM user
               WHERE us_deleted IS NULL
               AND (${sqlWhere.join(" OR ")})`;

  const sqlRes = await queryPromise(sql, listOfUsers);

  const usersData = {};
  for (let value of sqlRes) {
    usersData[value.pseudo] = {
      pseudo: value.pseudo,
      victories: Number(value.victories),
      defeats: Number(value.defeats),
      avatar: JSON.parse(value.avatar),
    };
  }
  res.sendResponse(200, usersData);
}

/**
 * @api       {get}        /users/:pseudo   Get user informations
 * @apiName   GetUserInformations
 * @apiGroup  User
 *
 * @apiPermission LoggedIn
 *
 * @apiUse GetUserSuccess
 * @apiError (404) UserNotFound User not found
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function getInfos(req, res) {
  const param = String(req.params.pseudo);
  const user = param === "me" ? req.body._auth.user : param;

  const infos = await getUserInformations(user);
  if (!infos) {
    return res.sendUsageError(404, "Utilisateur introuvable");
  }
  res.sendResponse(200, infos);
}

/**
 * @api       {patch}               /users/:pseudo   Patch user informations
 * @apiSampleRequest off
 * @apiName   PatchUserInformations
 * @apiGroup  User
 * @apiDescription At least one field must be filled

 * @apiPermission LoggedIn
 * @apiPermission (for the moment, users can only update themselves)
 *
 * @apiParam {string}             [pseudo]            ENT login
 * @apiParam {Object}             [avatar]            Avatar object
 * @apiParam {string{7}=hexColor} avatar.colorBG      Hex background color
 * @apiParam {string{7}=hexColor} avatar.colorBody    Hex Body color
 * @apiParam {number{0...}}       avatar.eyes         Number of the eyes
 * @apiParam {number{0...}}       avatar.hands        Number of the hands
 * @apiParam {number{0...}}       avatar.hat          Number of the hat
 * @apiParam {number{0...}}       avatar.mouth        Number of the mouth
 *
 * @apiUse GetUserSuccess
 * @apiUse ErrorNotAllowed
 * @apiUse ErrorBadRequest
 * @apiError (404) NotFound   User not found
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function saveInfos(req, res) {
  const param = String(req.params.pseudo);
  const user = param === "me" ? req.body._auth.user : param;

  if (req.body._auth.user !== user) {
    return res.sendUsageError(403, "Opération non autorisée");
  }

  const { avatar } = req.body;

  if (!avatar && true) {
    // true will be replaced by another fields of the request
    return res.sendUsageError(400, "Informations manquantes");
  }

  if (avatar) {
    const wantedProperties = ["colorBG", "eyes", "hands", "hat", "mouth", "colorBody"];
    if (!wantedProperties.every((p) => Object.prototype.hasOwnProperty.call(avatar, p))) {
      return res.sendUsageError(400, "Mauvaise requête");
    }

    const integerProperties = ["eyes", "hands", "hat", "mouth"];
    if (!integerProperties.every((p) => Number(avatar[p]) === avatar[p])) {
      return res.sendUsageError(400, "Mauvaise requête");
    }

    const hexColorProperties = ["colorBG", "colorBody"];
    if (!hexColorProperties.every((p) => /^#[0-9A-Fa-f]{6}$/i.test(avatar[p]))) {
      return res.sendUsageError(400, "Mauvaise requête");
    }
  }

  const infos = await getUserInformations(user);
  infos.avatar = avatar || infos.avatar;

  await updateUserAvatar(user, infos.avatar);
  res.sendResponse(200, infos);
}

/** BACKEND */
async function getAllUsers(req, res) {
  const sql = "SELECT us_login, us_admin FROM user WHERE us_deleted IS NULL;";
  const data = await queryPromise(sql);
  res.sendResponse(200, data);
}

async function addUser(req){
  const {login, admin} = req.body;
  const sql = `INSERT IGNORE INTO user (us_login,us_admin, us_avatar) VALUES ('${login}',${admin},'{"eyes":0,"hands":0,"hat":0,"mouth":0,"colorBody":"#0c04fc","colorBG":"#D3D3D3"}');`;
  await queryPromise(sql);
}

async function deleteUser(req){
  const { selectedLogin } = req.body;
  const sql = `DELETE FROM user WHERE us_login='${selectedLogin}';`;
  await queryPromise(sql);
}

async function updateUser(req){
  const { selectedLogin, newAdmin } = req.body;
  const sql = `UPDATE user SET us_admin=${newAdmin} WHERE us_login='${selectedLogin}';`;
  await queryPromise(sql);
}


export default {
  login,
  logout,
  generateAccessToken,
  saveInfos,
  getInfos,
  getAll,
  severalGetInfos,
  getAllUsers,
  addUser,
  deleteUser,
  updateUser,
};

// ***** INTERNAL FUNCTIONS *****

/**
 * Check if a user is an admin
 * @param {string} login The user login
 * @returns {Promise<boolean>}
 */

async function isUserAdmin(login) {
  const sql = `SELECT us_admin AS isAdmin FROM user WHERE us_login = ?;`;
  const { isAdmin } = (await queryPromise(sql, [login]))[0];
  return Boolean(isAdmin);
}

/**
 * Check if a user exists
 * @param {string} login The user login
 * @returns {Promise<boolean>} True if the user exists, false otherwise
 */
async function doesUserExist(login) {
  const sql = `SELECT COUNT(*) as found
                  FROM user
                  WHERE us_login = ?
                  AND us_deleted IS NULL;`;

  const res = await queryPromise(sql, [login]);
  return res[0].found > 0;
}

/**
 * This function implements the LDAP authentication
 * @param {string} login The user login
 * @param {string} pass The user password
 * @returns {boolean} Boolean telling if the user is well authenticated
 */
async function queryLdap(login, pass) {
  // auth with regular user
  const options = {
    ldapOpts: {
      url: process.env.LDAP_URL,
      // tlsOptions: { rejectUnauthorized: false }
    },
    userDn: `uid=${login},${process.env.LDAP_DOMAIN}`,
    userPassword: `${pass}`,
    userSearchBase: `${process.env.LDAP_DOMAIN}`,
    usernameAttribute: "uid",
    username: `${login}`,
    // starttls: false
  };

  try {
    await authenticate(options);
  } catch (e) {
    return false;
  }
  return true;
}

/**
 * Simulate user authentication
 * @param {string} login The user login
 * @param {string} pass The user password
 * @returns {boolean} Boolean telling if the user is well authenticated
 */
function queryMockedLdap(login, pass) {
  if (process.env.NODE_ENV !== "test") {
    throw Error("Function not available outside of tests");
  }
  return pass === "1234";
}

/**
 * Update the user avatar in database
 * @param {string} user The username login
 * @param {object} avatar The avatar object
 * @returns {Promise}
 */
async function updateUserAvatar(user, avatar) {
  const sql = `UPDATE user
                  SET us_avatar = ?
                  WHERE us_login = ?;`;

  await queryPromise(sql, [JSON.stringify(avatar), user]);
}

/**
 * Contruct a JSON object with informations for the user from the database
 * @param {String} pseudo ENT login of the user
 * @return {Object|null} user informations or null if user not found
 */
async function getUserInformations(pseudo) {
  const sql = `SELECT
                  us_login AS pseudo,
                  us_victories AS victories,
                  us_defeats AS defeats,
                  us_avatar AS avatar
                FROM user
                WHERE us_login = ?
                AND us_deleted IS NULL;`;

  const res = await queryPromise(sql, [pseudo]);

  if (res.length !== 1) {
    return null;
  }

  return {
    pseudo: res[0].pseudo,
    victories: Number(res[0].victories),
    defeats: Number(res[0].defeats),
    avatar: JSON.parse(res[0].avatar),
  };
}
