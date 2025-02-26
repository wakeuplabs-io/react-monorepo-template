import { Router } from "express";

import testRoute from "./health/route.js";

const router = Router();

router.use("/health", testRoute);

export default router;
