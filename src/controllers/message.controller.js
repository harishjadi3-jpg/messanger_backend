import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/mediaUpload.js";

import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { io } from "../socket.js"


const sendTextAsMessage = asyncHandler(async (req, res, next) => {
    const { messageType, text} = req.body;
    const {chatId}=req.params;
    if (!messageType || !text || !chatId) {
        throw new ApiError(404, "Enter all Valid details");
    }
    if (messageType !== "text") {
        throw new ApiError(415, "Error while sending Text as message");
    }
    const isValidChat = await Chat.findById(chatId);

    if (!isValidChat) {
        throw new ApiError(404, "Chat is not existed");
    }
    if (!isValidChat.participants.includes(req.user._id.toString())) {
        throw new ApiError(403, "You Entered Other Chat Data");
    }

    const chat = await Chat.findById(chatId);
    const message = await Message.create({
        chatId,
        messageType,
        senderId: req.user._id,
        text,
    });
    isValidChat.participants.forEach(participantsId => {
        if (participantsId.toString() !== req.user._id.toString()) {
            io.to(participantsId.toString()).emit("receiveMessage", message);
        }
    });
    chat.lastMessageId = message._id;
    await chat.save({ validateBeforeSave: true });
    res.status(201).json(
        new ApiResponse(201, message, "Message sent successfull")
    )
})
const sendMediaAsMessage = asyncHandler(async (req, res, next) => {
    const {chatId}=req.params;
    const { messageType, text, thumbnail } = req.body;
    console.log("this is console",messageType,text,chatId,thumbnail);
    if (!messageType ||  !chatId) {
        throw new ApiError(404, "Enter all Valid details");
    }
    if (messageType === "text") {
        throw new ApiError(415, "Error while sending files as message");
    }
    const isValidChat = await Chat.findById(chatId);
    if (!isValidChat) {
        throw new ApiError(404, "Chat is not existed");
    }
    console.log("this is valid chat");
    if (!isValidChat.participants.includes(req.user._id.toString())) {
        throw new ApiError(403, "You Entered Other Chat Data");
    }
    const { mediaUrl } = req.files
    console.log("thiis media url",mediaUrl);
    if (!mediaUrl || mediaUrl?.length <= 0) {
        throw new ApiError(404, "Uploading files are not found");
    }
    const mediaImages = await Promise.all(
        mediaUrl.map(async (file) => {
            const uploadedImage =
                await uploadOnCloudinary(file.path);
            return uploadedImage;
        })
    );
    console.log(mediaImages,"this is link ")
    const chat = await Chat.findById(chatId);
    console.log("this is chat",chat);
    const mediaMessage = await Message.create({
        chatId,
        messageType,
        senderId: req.user._id,
        thumbnail,
        mediaUrl: mediaImages
    });
    console.log("this is mediaMessage",mediaMessage);
    isValidChat.participants.forEach(participantsId => {
        if (participantsId.toString() !== req.user._id.toString()) {
            io.to(participantsId.toString()).emit("receiveMessage", mediaMessage);
        }
    });
    chat.lastMessageId = mediaMessage._id;
    await chat.save({ validateBeforeSave: true });
    res.status(201).json(
        new ApiResponse(201, mediaMessage, "Message sent successfull")
    )
})

const loadMessages = asyncHandler(async (req, res) => {
    
    const { chatId, cursor } = req.params;
    console.log("Group messaged debugging here ",chatId);
    const limit = Number(req.query.limit) || 20;
    const filter = {
        chatId: chatId,
    };
    if (cursor) {
        filter._id = {
            $lt: cursor,
        };
    }
    const messages = await Message.find({
    chatId: chatId
})
.populate("senderId", "username profileImage")
.sort({ _id: -1});
    
    let nextCursor = null;
    if (messages.length > limit) {
        messages.pop();
        nextCursor = messages[messages.length - 1]._id;
    }
    console.log("this is messages from backend",messages);
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                messages,
                nextCursor,
                hasMore: nextCursor !== null,
            },
            "Messages loaded successfully"
        )
    );
});
const deleteMessageForMe = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    console.log("this is messaageId",messageId);
    const message = await Message.findById(messageId);
    if (!message) {
        throw new ApiError(400, "Message not found");
    }
    console.log("thisis message",message.senderId,req.user._id);
    if (!message.senderId.equals(req.user._id)) {
        throw new ApiError(403, "You can delete only your own messages");
    }
    console.log("msg tech")
    message.deletedForMe.push(req.user._id);
    await message.save();
    console.log("finish")
    io.to(message.chatId.toString()).emit("messageDeletedForMe", {
        messageId,
        userId: req.user._id,
    });
    return res.status(200).json(
        new ApiResponse(200, null, "Message Deleted Successfully")
    )
})
const deleteMessageForEveryOne = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    console.log("message id",messageId,message);
    if (!message) {
        throw new ApiError(404, "Message Not Found");
    }
    if (!message.senderId.equals(req.user._id)) {
        throw new ApiError(403, "You can delete only your own messages");
    }
    await message.deleteOne();
    io.to(message.chatId.toString()).emit("messageDeleted", {
        messageId,
    });

    return res.status(200).json(
        new ApiResponse(200, null, "Message Deleted SuccessFully")
    )
})
export {
    sendTextAsMessage,
    sendMediaAsMessage,
    loadMessages,
    deleteMessageForMe,
    deleteMessageForEveryOne
}