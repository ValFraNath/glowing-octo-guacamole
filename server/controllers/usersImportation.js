import path from "path";

// eslint-disable-next-line no-unused-vars
import express from "express";

import { queryPromise } from "../db/database.js";
import { deleteFiles, moveFile, createDir, getSortedFiles } from "../global/files.js";

// eslint-disable-next-line no-unused-vars
import { HttpResponseWrapper } from "../global/HttpControllerWrapper.js";
import { HeaderErrors } from "../global/importation/csv-reader/HeaderChecker.js";

import { parseUsersFromCsv } from "../global/importation/users-importation/usersParser.js";

const FILES_DIR = process.env.NODE_ENV === "test" ? "files-test" : "files";
const USERS_DIR = path.resolve(FILES_DIR, "users");
const MAX_FILE_KEPT = 15;

/**
 * @api {post} /import/users Import a csv file of users
 * @apiName ImportUsers
 * @apiGroup Import
 * 
 * @apiPermission LoggedIn
 * @apiPermission Admin
 * @apiDescription Import a csv file to update the users list; the format of the request must be multipart/form-data! 
 * 
 * @apiParam  {File} file The csv file
 * @apiParam {string} confirmed If "true", the users will be imported, otherwise they will be only tested
 * 
 * @apiSuccess (201 | 202) {string} message Message explaining what has been done
 * @apiSuccess (201 | 202) {object[]} warnings Array of warnings
 * @apiSuccess (201 | 202) {object} warnings.warning A warning
 * @apiSuccess (201 | 202) {number} warnings.warning.code The warning code
 * @apiSuccess (201 | 202) {string} warnings.warning.message The warning message
 * @apiSuccess (201 | 202) {boolean} imported Boolean telling if data are imported
 *
 * @apiSuccessExample Success-Response:
 *  {
      "message": "File tested but not imported",
      "warnings": [
        {
          "code": 5,
          "message": "Aucun utilisateur n'est désigné comme admin"
        },
        {
          "code": 1,
          "message": "Duplication du login \"mpudlo\""
        },
      ],
      "imported": false
    }
  
 * @apiError (422) BadFormattedFile The csv file is badly formatted  
 * @apiError (400) BadFileType The file is not csv
 * @apiError (400) MissingFile No file provided
 * @apiErrorExample 400 Error-Response:
  {
    "message" : "Fichier manquant"
  }
 * @apiUse ErrorServer
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function importUsers(req, res) {
  const { confirmed } = req.body;

  if (!req.file) {
    return res.sendUsageError(400, "Fichier manquant");
  }

  const { path: filepath, filename, originalname } = req.file;

  try {
    if (!/\.csv$/i.test(originalname)) {
      res.sendUsageError(400, "Format de fichier invalide : uniquement CSV");
      return;
    }

    const data = await parseUsersFromCsv(filepath);

    if (confirmed === "true") {
      const insertionScript = data.createImportSql();

      await queryPromise(insertionScript);

      await createDir(USERS_DIR);

      await moveFile(filepath, path.resolve(USERS_DIR, filename));

      const files = await getSortedFiles(USERS_DIR);

      await deleteFiles(...files.slice(MAX_FILE_KEPT).map((file) => `${USERS_DIR}/${file}`));

      res.sendResponse(201, {
        message: "Fichier importé",
        warnings: [],
        imported: true,
      });
    } else {
      const warnings = data.analyze();
      res.sendResponse(202, {
        message: "Fichié testé mais pas importé",
        warnings,
        imported: false,
      });
    }
  } catch (error) {
    if (HeaderErrors.isInstance(error)) {
      res.sendUsageError(422, "Fichier mal formaté", {
        errors: error.errors,
        imported: false,
      });
      return;
    }
    throw error;
  } finally {
    deleteFiles(filepath).catch(() => {});
  }
}

/**
 *
 * @api {get} /import/users Get the last imported users
 * @apiName GetLastImportedUsers
 * @apiGroup Import
 * @apiPermission LoggedIn 
 * @apiPermission Admin 
 *
 * @apiSuccess (200) {string} url The url to the file
 * @apiSuccess (200) {string} shortpath The path to the file in the server
 * @apiSuccess (200) {string} file The file name
 * @apiError (404) NoImportedFile No file was previously imported
 *
 * @apiSuccessExample Success-Response:
 *  {
      "url": "https://apothiquiz.com/files/molecules/molecules_1612279095021.csv",
      "shortpath" : "/files/molecules/molecules_1612279095021.csv",
      "file" : "molecules_1612279095021.csv"
    }
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function getLastImportedUsers(req, res) {
  const files = await getSortedFiles(USERS_DIR);
  const last = files[0];

  if (!last) {
    return res.sendUsageError(404, "Aucun utilisateur n'a déjà été importé");
  }

  res.sendResponse(200, {
    url: `${req.protocol}://${req.get("host")}/api/v1/files/users/${last}`,
    shortpath: `/api/v1/files/users/${last}`,
    file: last,
  });
}

export default { importUsers, getLastImportedUsers };
