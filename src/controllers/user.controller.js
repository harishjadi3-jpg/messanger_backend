import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/mediaUpload.js";

import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { io } from "../socket.js";



const generateAccessTokenAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();

        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken };

    } catch (error) {
        console.log("Error while generating Accesstoken and refresh token", error);
        throw new ApiError(503, "Error while generating Accesstoken and refresh token");
    }
}
const registerUser = asyncHandler(async (req, res, next) => {
    const { email, phoneNumber, password, username, bio } = req.body;

    if (
        [email, phoneNumber, password, username, bio].some((item) => !item || item.trim() === "")
    ) {
        throw new ApiError(400, "Enter All Details Properly");
    }
    const checkUserEmail = await User.findOne({ email });
    if (checkUserEmail) {
        throw new ApiError(409, "Email already Exist!");
    }
    const checkUserPhoneNumber = await User.findOne({ phoneNumber });
    if (checkUserPhoneNumber) {
        throw new ApiError(409, "Phone Number already used");
    }
    let cloudProfileImage = "";
    if (req.files?.profileImage?.length > 0) {
        cloudProfileImage = await uploadOnCloudinary(req.files.profileImage[0].path);
    }


    const createduser = await User.create({
        username,
        email,
        password,
        profileImage: cloudProfileImage || "https://in.pinterest.com/pin/863706034818497453/",
        bio,
        phoneNumber,
    })
    const registeredUser = await User.findById(createduser._id).select("-password -refreshToken");
    return res.status(201).json(new ApiResponse(201, registeredUser, "User Created Successfully"));
})
const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (
        [email, password].some((item) => !item || item.trim() === "")
    ) {
        throw new ApiError(400, "Enter All Details Properly while login");
    }
    const checkUser = await User.findOne({ email });
    if (!checkUser) {
        throw new ApiError(404, "User Not Found!");
    }
    const isPasswordMatch = await checkUser.isPasswordCorrect(password);
    if (!isPasswordMatch) {
        throw new ApiError(401, "User entered Password is incorrect");

    }
    const options = {
        httpOnly: true,
        secure: true
    };


    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(checkUser._id);

    const user = await User.findById(checkUser._id).select("-password -refreshToken");
    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user, accessToken, refreshToken }, "user Logged in Successfully"))

})
const createOrOpenPrivateChat = asyncHandler(async (req, res, next) => {
    const { participantId, chatType } = req.body;
    console.log("Participant", participantId, chatType);
    if (req.user._id.toString() === participantId) {
        throw new ApiError(400, "You cannot create a chat with yourself");
    }
    console.log("step1");
    const isChatExist = await Chat.findOne({ chatType: "private", participants: { $all: [req.user._id, participantId] } });
    if (isChatExist) {
        return res.status(200).json(
            new ApiResponse(200, isChatExist, "Messaged Fetched Successfully")
        );
    }
    console.log("Debugging is Chat exit",isChatExist);
    console.log("step1");
    if (!chatType) {
        throw new ApiError(400, "Enter Valid creation type");
    }
    console.log("step1");
    if (chatType.toLowerCase() === "private") {
        const isValidParticipantId = await User.findById(participantId);
        if (!isValidParticipantId) {
            throw new ApiError(400, "Enter Valid Deatails of the user");
        } else {
            const chat = await Chat.create({
                chatType,
                participants: [participantId, req.user._id]
            });

            return res.status(201).json(
                new ApiResponse(201, chat, "user added successfully"));

        }

    } else {
        throw new ApiError(400, "Chat type Entered Wrongly");
    }

})

const changeProfileImage = asyncHandler(async (req, res, next) => {
    let cloudProfileImage = "";
    if (!req.files?.profileImage?.length) {
        throw new ApiError(400, "Profile image is required");
    }
    if (req.files?.profileImage?.length > 0) {
        cloudProfileImage = await uploadOnCloudinary(req.files.profileImage[0].path);
    }
    if (!cloudProfileImage) {
        throw new ApiError(503, "Profile Change Failed");
    }
    console.log("This is updated Profile", cloudProfileImage);
    const registeredUser = await User.findByIdAndUpdate(req.user._id, { profileImage: cloudProfileImage }, { new: true });
    if (!registerUser) {
        throw new ApiError(404, "User not found");
    }
    return res.status(200).json(new ApiResponse(200, cloudProfileImage, "Profile Changed Successfully "));
})

const changeUserName = asyncHandler(async (req, res, next) => {
    const { username } = req.body;

    if (!username || !username.trim()) {
        throw new ApiError(400, "Username is required");
    }
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "user not found");
    }
    if (user.username === username.trim()) {
        throw new ApiError(400, "New username is the same as the current username");
    }
    user.username = username;
    await user.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, user, "username name Changed Successfully "));
})

const changeBio = asyncHandler(async (req, res, next) => {
    const { bio } = req.body;

    if (!bio || !bio.trim()) {
        throw new ApiError(400, "bio is required");
    }
    const user = await User.findById(req.user._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "user not found");
    }
    if (user.bio === bio.trim()) {
        throw new ApiError(400, "New bio is the same as the current bio");
    }
    user.bio = bio;
    await user.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, user, "bio  Changed Successfully "));
})

const searchUser = asyncHandler(async (req, res) => {
    const { keyword, cursor } = req.query;
    const limit = Number(req.query.limit) || 20;
    if (!keyword || !keyword.trim()) {
        throw new ApiError(400, "Keyword is required");
    }
    const filter = {
        $and: [
            {
                $or: [
                    {
                        username: {
                            $regex: keyword,
                            $options: "i",
                        },
                    },
                    {
                        email: {
                            $regex: keyword,
                            $options: "i",
                        },
                    },
                ],
            },
            {
                _id: {
                    $ne: req.user._id,
                },
            },
        ],
    };
    if (cursor) {
        filter._id = {
            ...filter._id,
            $gt: cursor,
        };
    }
    const users = await User.find(filter)
        .select("-password -refreshToken")
        .sort({ _id: 1 })
        .limit(limit + 1);
    let nextCursor = null;
    if (users.length > limit) {
        const lastUser = users.pop();
        nextCursor = lastUser._id;
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                nextCursor,
                hasMore: nextCursor !== null,
            },
            "Users fetched successfully"
        )
    );
});

const searchUserByName = asyncHandler(async (req, res) => {
    const { keyword, cursor } = req.query;
    const { searchType } = req.body;
    const limit = Number(req.query.limit) || 20;
    if (!keyword || !keyword.trim()) {
        throw new ApiError(400, "Keyword is required");
    }
    if (!searchType || searchType !== "name") {
        throw new ApiError(400, "Enter Search Type also");
    }
    const filter = {
        $and: [
            {
                $or: [
                    {
                        username: {
                            $regex: keyword,
                            $options: "i",
                        },
                    }

                ],
            },
            {
                _id: {
                    $ne: req.user._id,
                },
            },
        ],
    };
    if (cursor) {
        filter._id = {
            ...filter._id,
            $gt: cursor,
        };
    }
    const users = await User.find(filter)
        .select("-password -refreshToken")
        .sort({ _id: 1 })
        .limit(limit + 1);
    let nextCursor = null;
    if (users.length > limit) {
        const lastUser = users.pop();
        nextCursor = lastUser._id;
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                nextCursor,
                hasMore: nextCursor !== null,
            },
            "Users fetched successfully"
        )
    );
});

const searchUserByEmail = asyncHandler(async (req, res) => {
    const { keyword, cursor } = req.query;
    const { searchType } = req.body;
    const limit = Number(req.query.limit) || 20;
    if (!keyword || !keyword.trim()) {
        throw new ApiError(400, "Keyword is required");
    }
    if (!searchType || searchType !== "name") {
        throw new ApiError(400, "Enter Search Type also");
    }
    const filter = {
        $and: [
            {
                $or: [
                    {
                        email: {
                            $regex: keyword,
                            $options: "i",
                        },
                    },
                ],
            },
            {
                _id: {
                    $ne: req.user._id,
                },
            },
        ],
    };
    if (cursor) {
        filter._id = {
            ...filter._id,
            $gt: cursor,
        };
    }
    const users = await User.find(filter)
        .select("-password -refreshToken")
        .sort({ _id: 1 })
        .limit(limit + 1);
    let nextCursor = null;
    if (users.length > limit) {
        const lastUser = users.pop();
        nextCursor = lastUser._id;
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                users,
                nextCursor,
                hasMore: nextCursor !== null,
            },
            "Users fetched successfully"
        )
    );
});

const deleteChat = asyncHandler(async (req, res) => {
    const { chatId } = req.query;
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not found");
    }
    if (!chat.participants.some(id => id.equals(req.user._id))) {
        throw new ApiError(403, "You are not a participant of this chat");
    }
    await Message.deleteMany({
        chat: chatId
    });
    await chat.deleteOne();
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Chat and messages deleted successfully"
        )
    );
});

const displayChats = asyncHandler(async (req, res, next) => {
    const { cursor } = req.query;
    const limit = Number(req.query.limit) || 10;
    const filter = {
        chatType: "private",
        participants: {
            $in: [req.user._id]
        }
    }
    if (cursor) {
        filter._id = {
            ...filter._id,
            $gt: cursor,
        };
    }
    const userChats = await Chat.find(filter).populate({
        path: "participants",
        select: "username bio profileImage onlineStatus"
    }).populate({
        path: "lastMessageId",
        select: "message createdAt sender"
    });
    const chats = userChats.map(chat => {
        const otherUser = chat.participants.find(
            user => user._id.toString() !== req.user._id.toString()
        );

        return {
            _id: chat._id,
            user: otherUser,
            lastMessage: chat.lastMessage,
            updatedAt: chat.updatedAt
        };
    });
    let nextCursor = null;
    if (userChats.length > limit) {
        userChats.pop();
        nextCursor = userChats[userChats.length - 1]._id;
    }

    if (!userChats) {
        throw new ApiError(404, "Chats not Found");
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                chats,
                nextCursor,
                hasMore: nextCursor !== null,
            },
            "Chats Displayed Successfully"
        )
    );

})

const getMyProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select(
            "-password -refreshToken -verifyOtp -verifyOtpExpire"
        );

    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "Profile fetched successfully"
        )
    );
});

const getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

    const user = await User.findById(userId)
        .select("-password -refreshToken -verifyOtp -verifyOtpExpire");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            user,
            "User profile fetched successfully"
        )
    );
});
const logout = asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        }, {
        new: true
    }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    if ([oldPassword, newPassword].some((field) => field.trim() === "")) {
        throw new ApiError(500, "All fileds should require");
    }
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(500, "User not Logged in");
    }
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordValid) {
        throw new ApiError(500, "Old password is invalid");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    res.status(200).json(new ApiResponse(200, {}, "Password changed Successfully"));
})

const showAllUsers= asyncHandler(async (req, res, next) => {
    const cursor=req.query.cursor;
    const name=req.query.name;
    const limit = Number(req.query.limit) || 10;
    const filter = {};
    if(cursor){
        filter._id = { $gt: cursor,$ne: req.user._id };
    }
    if(name){
        filter.name = { $regex: name, $options: "i" };
    }
    const users = await User.find(filter).select("-password -refreshToken").limit(limit);

    res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});

export {
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
    logout,
}