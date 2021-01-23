import express from "express";

import ApiController from "../controllers/api.js";
import QuestionController from "../controllers/question.js";
import UserController from "../controllers/user.js";
import auth from "../middlewares/auth.middleware.js";

const apiRouter = express.Router();

apiRouter.get("/status", ApiController.status);

apiRouter.get("/question/:type", QuestionController.generateQuestion);

apiRouter.post("/user/login", UserController.login);

apiRouter.get("/user/:pseudo", auth, UserController.getInfos);

apiRouter.patch("/user/:pseudo", auth, UserController.saveInfos);

apiRouter.post("/users/about", auth, UserController.severalGetInfos);

export default apiRouter;
