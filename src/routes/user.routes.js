import { Router } from "express";
import {
    registerUser,
    loginUser,
    createOrOpenPrivateChat,
    changeProfileImage,
    changeUserName,
    changeBio,
    searchUser,
    searchUserByName,
    searchUserByEmail,
    deleteChat,
    displayChats,
    getMyProfile,
    getUserProfile,
    changeCurrentPassword,
    showAllUsers,
    logout
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/register").post(
    upload.fields([
        {
            name: "profileImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT,logout);

router.route("/profile").get(verifyJWT,getMyProfile);
router.route("/password").patch(verifyJWT,changeCurrentPassword);

router.route("/users").get(verifyJWT,showAllUsers);

router.route("/profile/:userId").get(verifyJWT,getUserProfile);
router.route("/chat").post(verifyJWT,createOrOpenPrivateChat);

router.route("/profile").patch(upload.fields([
        {
            name: "mediaUrl",
            maxCount: 1
        }
    ]),verifyJWT,changeProfileImage);

router.route("/username").patch(verifyJWT, changeUserName);

router.route("/bio").patch(verifyJWT,changeBio);

router.route("/:keyword").get(verifyJWT, searchUser);
router.route("/name/:keyword").get(verifyJWT,searchUserByName);
router.route("/email/:keyword").get(verifyJWT,searchUserByEmail);

router.route("/").get(verifyJWT, displayChats);

router.route("/delete/:chatId").delete(verifyJWT, deleteChat);

export default router