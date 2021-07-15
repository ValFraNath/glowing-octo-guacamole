import express from "express";

import chemicalsController from "../controllers/chemicals.js";
import HttpControllerWrapper from "../global/HttpControllerWrapper.js";
import AuthMiddleware from "../middlewares/auth.middleware.js";

const chemicalsApiRouter = express.Router();

chemicalsApiRouter.get("/systems", HttpControllerWrapper(chemicalsController.getAllSystems));
/**BACKEND*/
/**PROPERTY*/
chemicalsApiRouter.get("/property", HttpControllerWrapper(chemicalsController.getAllProperties));
chemicalsApiRouter.get("/MoleculesByProperty/:id", HttpControllerWrapper(chemicalsController.getMoleculesByProperty));
chemicalsApiRouter.post("/addProperty", AuthMiddleware(), HttpControllerWrapper(chemicalsController.addProperty));
chemicalsApiRouter.post("/deleteProperty", AuthMiddleware(), HttpControllerWrapper(chemicalsController.deleteProperty));
chemicalsApiRouter.post("/updateProperty", AuthMiddleware(), HttpControllerWrapper(chemicalsController.updateProperty));
/**SYSTEMS*/
chemicalsApiRouter.get("/allSystems", HttpControllerWrapper(chemicalsController.getSystems));
chemicalsApiRouter.get("/MoleculesBySystem/:id", HttpControllerWrapper(chemicalsController.getMoleculesBySystem));
chemicalsApiRouter.post("/addSystem", AuthMiddleware(), HttpControllerWrapper(chemicalsController.addSystem));
chemicalsApiRouter.post("/deleteSystem", AuthMiddleware(), HttpControllerWrapper(chemicalsController.deleteSystem));
chemicalsApiRouter.post("/updateSystem", AuthMiddleware(), HttpControllerWrapper(chemicalsController.updateSystem));
/**CLASSES*/
chemicalsApiRouter.get("/allClasses", HttpControllerWrapper(chemicalsController.getClasses));
chemicalsApiRouter.get("/MoleculesByClass/:id", HttpControllerWrapper(chemicalsController.getMoleculesByClass));
chemicalsApiRouter.post("/addClass", AuthMiddleware(), HttpControllerWrapper(chemicalsController.addClass));
chemicalsApiRouter.post("/deleteClass", AuthMiddleware(), HttpControllerWrapper(chemicalsController.deleteClass));
chemicalsApiRouter.post("/updateClass", AuthMiddleware(), HttpControllerWrapper(chemicalsController.updateClass));
/**MOLECULES*/
chemicalsApiRouter.get("/allMolecules", HttpControllerWrapper(chemicalsController.getMolecules));
chemicalsApiRouter.post("/deleteMolecule", AuthMiddleware(),  HttpControllerWrapper(chemicalsController.deleteMolecule));
chemicalsApiRouter.post("/addMolecule", AuthMiddleware(), HttpControllerWrapper(chemicalsController.addMolecule));
chemicalsApiRouter.post("/updateMolecule", AuthMiddleware(),  HttpControllerWrapper(chemicalsController.updateMolecule));

export default chemicalsApiRouter;
