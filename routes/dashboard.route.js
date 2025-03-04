import express from "express";

import { protectRoute } from "../middleware/protectRoute.js";
import {
  addNotes,
  deleteNote,
  getNotes,
} from "../controllers/note.controller.js";
import {
  acceptInvitation,
  getClientDocs,
  getClientsAndInvitations,
  getInvitation,
  getUserDocs,
  inviteClients,
} from "../controllers/DashboardControllers/inviteClients.controller.js";
import {
  createFolder,
  getFolders,
} from "../controllers/DashboardControllers/folder.controller.js";

const router = express.Router();

router.post("/addNotes", protectRoute, addNotes);
router.get("/getNotes", protectRoute, getNotes);
router.delete("/deleteNote", protectRoute, deleteNote);
router.post("/invite-client", protectRoute, inviteClients);
router.get("/fetch-invitation", getInvitation);
router.post("/accept-invitation", acceptInvitation);
router.get("/invitation-clients", getClientsAndInvitations);
router.post("/create-folder", protectRoute, createFolder);
router.get("/get-folders", protectRoute, getFolders);
router.get("/get-userDocs", protectRoute, getUserDocs);
router.get("/get-clientDocs", protectRoute, getClientDocs);
export default router;
