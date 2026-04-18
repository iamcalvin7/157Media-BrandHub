import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import changelogRouter from "./changelog.js";
import contentIdeasRouter from "./contentIdeas.js";
import openaiRouter from "./openai.js";
import contentRouter from "./content.js";
import storageRouter from "./storage.js";
import eventsRouter from "./events.js";
import teamMembersRouter from "./teamMembers.js";
import savedItemsRouter from "./savedItems.js";
import mediaAssetsRouter from "./mediaAssets.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(changelogRouter);
router.use(contentIdeasRouter);
router.use(openaiRouter);
router.use(contentRouter);
router.use(storageRouter);
router.use(eventsRouter);
router.use(teamMembersRouter);
router.use(savedItemsRouter);
router.use(mediaAssetsRouter);

export default router;
