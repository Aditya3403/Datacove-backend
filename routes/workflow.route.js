import express from "express";
import { getWorkflows } from "../controllers/workflows.controller.js";
const router = express.Router();
router.get("/get-workflows", getWorkflows);

export default router;
