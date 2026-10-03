import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import booksRouter from "./books";
import profileRouter from "./profile";
import optimizationRouter from "./optimization";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(booksRouter);
router.use(profileRouter);
router.use(optimizationRouter);

export default router;
