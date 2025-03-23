import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  deleteWorkflowDocuments,
  legalWorkflow,
  shareFile,
  uploadClientFile,
  uploadFile,
  deleteFile
} from "../controllers/upload.controller.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.post("/uploadFile", upload.any("files", 50), uploadFile);
router.post("/deleteFile", deleteFile);
router.post("/client-file", upload.any("files", 50), uploadClientFile);
router.post(
  "/legal-workflow",
  protectRoute,
  upload.any("files", 20),
  legalWorkflow
);
router.post("/delete-workflow-file", protectRoute, deleteWorkflowDocuments);
router.post("/shareFile", protectRoute, shareFile);
export default router;
