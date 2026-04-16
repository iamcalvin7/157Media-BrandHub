import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import changelogRouter from "./changelog.js";
import contentIdeasRouter from "./contentIdeas.js";
import openaiRouter from "./openai.js";
import contentRouter from "./content.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(changelogRouter);
router.use(contentIdeasRouter);
router.use(openaiRouter);
router.use(contentRouter);

export default router;
