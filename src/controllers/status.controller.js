import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/mediaUpload.js";
import { io } from "../socket.js";
import Status from "../models/status.model.js";
import StatusLike from "../models/statusLikes.model.js";


const uploadTextAsStatus = asyncHandler(async (req, res, next) => {
    const { statusText, type } = req.body;
    if (!statusText || !statusText.trim()) {
        throw new ApiError(400, "Text is required");
    }
    if (!type || type !== "text") {
        throw new ApiError(404, "Text only valid");
    }
    const expiresAt = new Date(Date.now() + 86400000);
    const status = await Status.create({
        userId: req.user._id,
        type,
        statusText,
        expiresAt
    })
    return res.status(200).json(new ApiResponse(200, status, "status uploaded Successfully "));
})

const uploadMediaAsStatus = asyncHandler(async (req, res, next) => {
    const { type, caption } = req.body;

    if (!type || type == "text") {
        throw new ApiError(404, "Enter Valid media , not text");
    }

    let cloudStatus = "";
    if (!req.files?.mediaUrl?.length) {
        throw new ApiError(400, "Profile image is required");
    }

    if (req.files?.mediaUrl?.length > 0) {
        cloudStatus = await uploadOnCloudinary(req.files.mediaUrl[0].path);
    }

    if (!cloudStatus) {
        throw new ApiError(503, "status upload Failed");
    }

    const expiresAt = new Date(Date.now() + 86400000);
    const status = await Status.create({
        userId: req.user._id,
        type,
        caption,
        mediaUrl: cloudStatus,
        expiresAt
    });

    res.status(201).json(
        new ApiResponse(201, status, "Status uploaded successfull")
    )
})

const openStatus = asyncHandler(async (req, res, next) => {
    const { userId, count } = req.query;

    console.log("ok to here 1", userId);
    if (!userId) {
        throw new ApiError(403, "User is not defined");
    }
    console.log("ok to here 1", userId);
    const status = await Status.find({ userId })
    if (!status) {
        throw new ApiError(403, "status is not found");
    }
    console.log("ok to here 1", status);

    if (userId.toString() === req.user._id.toString()) {
        return res.status(200).json(new ApiResponse(
            200, { status, remaining: status.length - count }, "Your status array gived to you  Successfully"
        ))
    }
    console.log("ok to here 1", userId);
    if (!count) {
        throw new ApiError(400, "Count is not Defined");
    }
    if (!status[count].viewers.some(
        item => item.userId === userId
    )) {
        status[count].viewers.push(req.user._id);
        await status.save();
    }
    console.log("ok to here 1", userId);
    res.status(200).json(
        new ApiResponse(200, { status, remaining: status.length - count }, "Status opened successfull")
    )
})

const checkStatusViews = asyncHandler(async (req, res, next) => {
    const { statusId } = req.params;
    const { cursor } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    console.log("ok to here 1", statusId);
    if (!statusId) {
        throw new ApiError(403, "User is not defined");
    }
    
    const status = await Status.findById(statusId)
        .populate("viewers.userId", "username profileImage");

    if (!status) {
        throw new ApiError(404, "Status is not found");
    }
    if (status.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(404, "You are not authorised to See views")
    }
    let viewers=status.viewers;
    if(cursor){
        let index= viewers.findIndex((item)=>item._id.toString()===cursor);
        if(index!==-1){
            viewers=viewers.slice(index+1);
        }

    }
    const paginatedViewers = viewers.slice(0, limit);
    const nextCursor = paginatedViewers.length === limit ? paginatedViewers[paginatedViewers.length - 1]._id : null;

    
    return res.status(201).json(
        new ApiResponse(200, { viewers: paginatedViewers, nextCursor }, "viewers fetched successfull")
    )
})
const deleteStatus = asyncHandler(async (req, res, next) => {
    const { statusId } = req.params;
    if (!statusId) {
        throw new ApiError(403, "User is not defined");
    }
    const status = await Status.findById(statusId);
    if (!status) {
        throw new ApiError(404, "Status not found");
    }
    if (status.userId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized");
    }
    await status.deleteOne();
    return res.status(200).json(
        new ApiResponse(200, status, "Status Deleted Successfuly")
    )
})
const toggleLikeStatus = asyncHandler(async (req, res) => {
    const { statusId } = req.params;
    console.log("ok to here 2", statusId);
    const status = await Status.findById(statusId);
    if (!status) {
        throw new ApiError(404, "Status not found");
    }
    if(status.userId.toString() === req.user._id.toString()) {
        throw new ApiError(403, "You cannot like your own status");
    }
    const alreadyLiked = await StatusLike.findOne({
        statusId,
        likedBy: req.user._id,
    });
    if (alreadyLiked) {
        await alreadyLiked.deleteOne();
        return res.status(200).json(
            new ApiResponse(200, null, "Status unliked")
        );
    }
    const like=await StatusLike.create({
        statusId,
        likedBy: req.user._id,
    });
    return res.status(200).json(
        new ApiResponse(200, like, "Status liked")
    );
});
const getStatusLikes = asyncHandler(async (req, res) => {
    const { statusId } = req.params;
    console.log("ok to here 3", statusId);
    const status = await Status.findById(statusId);
    if (!status) {
        throw new ApiError(404, "Status not found");
    }
    const totalLikes = await StatusLike.countDocuments({
        statusId,
    });
    if(status.userId.toString()===req.user._id.toString()){
        throw new ApiError(403, "You cannot see likes of your own status");
    }
    const likedUsers = await StatusLike.find({
        statusId,
    }).populate(
        "likedBy",
        "username profileImage"
    );
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalLikes,
                likedUsers,
            },
            "Status likes fetched successfully"
        )
    );
});

export {
    uploadTextAsStatus,
    uploadMediaAsStatus,
    openStatus,
    checkStatusViews,
    deleteStatus,
    toggleLikeStatus,
    getStatusLikes,
}