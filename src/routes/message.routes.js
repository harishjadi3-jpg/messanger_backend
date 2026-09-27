import { Router } from "express";
import  {
    sendTextAsMessage,
    sendMediaAsMessage,
    loadMessages,
    deleteMessageForMe,
    deleteMessageForEveryOne
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/:chatId/messages/text").post(verifyJWT,sendTextAsMessage);
router.route("/:chatId/messages/media").post(upload.fields([
        {
            name: "mediaUrl",
            maxCount: 1
        }
    ]), verifyJWT, sendMediaAsMessage);
router.route("/:chatId/messages").get(verifyJWT,loadMessages);
router.route("/:messageId").delete(verifyJWT, deleteMessageForMe);
router.route("/:messageId/everyone").delete(verifyJWT, deleteMessageForEveryOne);

export default router;