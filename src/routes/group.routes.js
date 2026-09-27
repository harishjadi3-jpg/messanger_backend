import { Router } from "express";
import {
    createGroup,
    changeGroupIcon,
    changeGroupName,
    changeGroupDescription,
    exitFromGroup,
    addMembersIntoGroup,
    addAdminsIntoGroup,
    removeFromGroup,
    filterByGroups,
    joinGroup,
    getJoinLink,
    deleteGroup,
    getGroupProfile,
    getGroupMembers,
    searchGroups
} from "../controllers/group.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(upload.fields([
        {
            name: "groupImage",
            maxCount: 1
        }
    ]),
    verifyJWT, createGroup);
router.route("/:chatId/profile").get(verifyJWT,getGroupProfile);
router.route("/:chatId/members").get(verifyJWT,getGroupMembers);
router.route("/").get(verifyJWT, filterByGroups);
router.get("/:chatId/join-link", verifyJWT,getJoinLink);
router.post("/:chatId/join", verifyJWT,joinGroup);
router.route("/:chatId/leave").patch(verifyJWT, exitFromGroup);
router.route("/search").get(verifyJWT, searchGroups);
router.route("/:chatId/name").patch(verifyJWT,changeGroupName);
router.route("/:chatId/description").patch(verifyJWT,changeGroupDescription);
router.route("/:chatId/icon").patch(
    upload.fields([
        {
            name: "groupImage",
            maxCount: 1
        }
    ]),
    verifyJWT, changeGroupIcon);

router.route("/:chatId/members").patch(verifyJWT,addMembersIntoGroup);
router.route("/:chatId/members").delete(verifyJWT,removeFromGroup);

router.route("/:chatId/admins").patch(verifyJWT,addAdminsIntoGroup);

router.route("/:chatId").delete(verifyJWT,deleteGroup);

export default router;