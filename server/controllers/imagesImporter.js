import path from "path";

import Zip from "adm-zip";
// eslint-disable-next-line no-unused-vars
import express from "express";

import { queryFormat, queryPromise } from "../db/database.js";
import { createDir, deleteFiles, getSortedFiles, moveFile } from "../global/files.js";
// eslint-disable-next-line no-unused-vars
import { HttpResponseWrapper } from "../global/HttpControllerWrapper.js";

import ImagesList from "../global/importation/images-importation/ImagesList.js";
import { Molecule } from "../global/importation/molecules-importation/MoleculesList.js";
import Logger from "../global/Logger.js";

import { updateNumberOfRoundsPerDuel } from "./config.js";

const IMAGES_DIR_PATH = path.resolve(
  process.env.NODE_ENV === "test" ? "files-test" : "files",
  "images"
);

/**
 * @api {post} /import/images Import molecules images
 * @apiName ImportImages
 * @apiGroup Import
 *
 * @apiPermission LoggedIn
 * @apiPermission Admin
 * @apiDescription Import images to bind them to molecules; the format of the request must be multipart/form-data!
 *
 * @apiParam  {File} file The images
 * @apiParam {string} confirmed If "true", the images will be imported, otherwise they will be only tested
 *
 * @apiSuccess (201 | 202) {string} message Message explaining what has been done
 * @apiSuccess (201 | 202) {object[]} warnings Array of warnings
 * @apiSuccess (201 | 202) {object} warnings.warning A warning
 * @apiSuccess (201 | 202) {number} warnings.warning.code The warning code
 * @apiSuccess (201 | 202) {string} warnings.warning.message The warning message
 * @apiSuccess (201 | 202) {boolean} imported Boolean telling if images are imported
 *
 * @apiSuccessExample Success-Response:
 *  {
      "message": "Images tested but not imported",
      "warnings": [
        {
          "code": 3,
          "message": "Molécule invalide : \"$zanamivir_copie\" "
        },
        {
          "code": 1,
          "message": "Plusieurs images pour la molécule \"abacavir\""
        },
        {
          "code" : 2,
          "message" : "Molécule inconnue : \"aseltamivir\""
        }
      ],
      "imported": false
    }

 *
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
async function importImages(req, res) {
  if (req.files.length === 0) {
    return res.sendUsageError(400, "Fichiers manquants");
  }
  const { confirmed } = req.body;
  const ogNames = req.files.map((f) => f.originalname);

  const deleteUploadedFiles = () => deleteFiles(...req.files.map((f) => f.path)).catch(() => {});

  try {
    const imagesList = new ImagesList(ogNames);

    if (confirmed !== "true") {
      const warnings = await imagesList.analyze();

      res.sendResponse(202, {
        message: "Images testées mais pas importées",
        warnings,
        imported: false,
      });
    } else {
      await createDir(IMAGES_DIR_PATH);

      const imported = await imagesList.bindImagesToMolecules();

      await deletePreviousImages();

      await Promise.all(
        imported.map((file) => {
          const filepath = req.files.find((f) => f.originalname === file).path;
          return moveFile(filepath, path.resolve(IMAGES_DIR_PATH, Molecule.normalizeDCI(file)));
        })
      );

      res.sendResponse(201, {
        message: "Images importées",
        warnings: [],
        imported: true,
      });

      updateNumberOfRoundsPerDuel().catch(Logger.error);
    }
  } finally {
    deleteUploadedFiles();
  }
}

/**
 *
 * @api {get} /import/images Get the last imported images
 * @apiName GetLastImportedImages
 * @apiGroup Import
 * @apiPermission LoggedIn
 * @apiPermission Admin
 *
 * @apiSuccess (200) {string} url The url to the images archive
 * @apiSuccess (200) {string} shortpath The path to the archive in the server
 * @apiSuccess (200) {string} file The archive name
 * @apiError (404) NoImportedFile No file was previously imported
 *
 * @apiSuccessExample Success-Response:
 *  {
      "url": "https://apothiquiz.com/api/v1/files/images/images-archive.zip",
      "shortpath" : "/api/v1/files/images/images-archive.zip",
      "file" : "images-archive.zip"
    }
 *
 * @param {express.Request} req The http request
 * @param {HttpResponseWrapper} res The http response
 */
async function getLastImportedFile(req, res) {
  const archiveName = await archiveImages();

  if (!archiveName) {
    return res.sendUsageError(404, "Aucune image n'a déjà été importée");
  }

  res.sendResponse(200, {
    url: `${req.protocol}://${req.get("host")}/api/v1/files/images/${archiveName}`,
    shortpath: `/api/v1/files/images/${archiveName}`,
    filename: archiveName,
  });
}

/**
 * Archive all images in a zip archive
 * @returns {Promise<string>} The archive name
 */
async function archiveImages() {
  const archive = new Zip();

  const files = await getSortedFiles(IMAGES_DIR_PATH);
  if (files.length === 0) {
    return null;
  }

  files
    .filter((f) => !f.endsWith(".zip"))
    .forEach((file) => archive.addLocalFile(path.resolve(IMAGES_DIR_PATH, file)));

  const archiveName = "images-molecules.zip";
  archive.writeZip(path.resolve(IMAGES_DIR_PATH, archiveName));
  return archiveName;
}

/**
 * Delete previous images
 * @returns {Promise}
 */
async function deletePreviousImages() {
  const files = await getSortedFiles(IMAGES_DIR_PATH);
  await deleteFiles(...files.map((f) => path.resolve(IMAGES_DIR_PATH, f)));
}

/**BACKEND*/
async function importUniqueImage(req, res) {
  const file = [req.file];
  const deleteUploadedFiles = () => deleteFiles(...file.map((f) => f.path)).catch(() => {});
  const moleculeName = req.file.originalname.split('.')[0];

  let updateSql = queryFormat('UPDATE molecule SET mo_image = :image WHERE mo_dci = :name ;',
  {image: Molecule.normalizeDCI(req.file.originalname), name: moleculeName});
  await queryPromise(updateSql);
  return await moveFile(req.file.path, path.resolve(IMAGES_DIR_PATH, Molecule.normalizeDCI(req.file.originalname)));
}

export default { importImages, getLastImportedFile, importUniqueImage };
