import express from "express";

import ImagesImporterController from "../controllers/imagesImporter.js";
import MoleculesImporterController from "../controllers/moleculesImporter.js";
import UsersImporterController from "../controllers/usersImportation.js";
import HttpControllerWrapper from "../global/HttpControllerWrapper.js";
import { createMulter } from "../middlewares/multer.middleware.js";

const MULTIPLE_FILES = true;

const importApiRouter = express.Router();

importApiRouter.post(
  "/molecules",
  createMulter(),
  HttpControllerWrapper(MoleculesImporterController.importMolecules)
);

importApiRouter.get(
  "/molecules",
  HttpControllerWrapper(MoleculesImporterController.getLastImportedFile)
);

importApiRouter.post(
  "/images",
  createMulter(MULTIPLE_FILES),
  HttpControllerWrapper(ImagesImporterController.importImages)
);

importApiRouter.post(
  "/uniqueImage",
  createMulter(),
  HttpControllerWrapper(ImagesImporterController.importUniqueImage)
);

importApiRouter.get("/images", HttpControllerWrapper(ImagesImporterController.getLastImportedFile));

importApiRouter.post(
  "/users",
  createMulter(),
  HttpControllerWrapper(UsersImporterController.importUsers)
);

importApiRouter.get(
  "/users",
  createMulter(),
  HttpControllerWrapper(UsersImporterController.getLastImportedUsers)
);

export default importApiRouter;
