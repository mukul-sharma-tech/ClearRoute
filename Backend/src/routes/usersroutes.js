import { Router } from "express";

import { login, register, getAllSessions, getMetrics } from "../controllers/usercontroller.js";

const router = Router();

router.route("/login").post(login);

router.route("/register").post(register);

router.route("/sessions").get(getAllSessions);

router.route("/metrics").get(getMetrics);

export default router;