import { Router } from "express";
import  {
    uploadTextAsStatus,
    uploadMediaAsStatus,
    openStatus,
    checkStatusViews,
    deleteStatus,
    toggleLikeStatus,
    getStatusLikes,
} from "../controllers/status.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

router.route("/text").post(verifyJWT, uploadTextAsStatus);
router.route("/media").post(
    upload.fields([
        {
            name: "mediaUrl",
            maxCount: 1
        }
    ]),
    verifyJWT, uploadMediaAsStatus);

router.route("/:userId").get(verifyJWT, openStatus);
router.route("/:statusId/views").get(verifyJWT, checkStatusViews);

router.route("/:statusId/likes").post(verifyJWT, toggleLikeStatus).get(verifyJWT, getStatusLikes);

router.route("/:statusId").delete(verifyJWT, deleteStatus);

export default router;