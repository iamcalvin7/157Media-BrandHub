import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import changelogRouter from "./changelog.js";
import contentIdeasRouter from "./contentIdeas.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(changelogRouter);
router.use(contentIdeasRouter);

export default router;
