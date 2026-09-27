import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/mediaUpload.js";

import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { io } from "../socket.js"




const createGroup = asyncHandler(async (req, res, next) => {
    console.log("req", typeof (req.body.participantsIds));
    let { participantsIds, chatType, groupName, groupDescription } = req.body;
    participantsIds = JSON.parse(participantsIds);
    console.log("na 1");
    if (participantsIds.length <= 0) {
        throw new ApiError(400, "You cannot create group with no participants");
    }
    if (!groupName) {
        throw new ApiError(400, "Group name is required");
    }
    const users = await User.find({
        _id: { $in: participantsIds }
    });

    if (users.length !== participantsIds.length) {
        throw new ApiError(400, "One or more participants are invalid");
    }
    if (!chatType) {
        throw new ApiError(400, "Enter Valid creation type");
    }
    const participants = [
        ...new Set([
            ...participantsIds,
            req.user._id.toString()
        ])
    ];
    if (chatType.toLowerCase() === "group") {
        let groupImage = "";
        if (req.files?.groupImage?.length > 0) {
            groupImage = await uploadOnCloudinary(req.files.groupImage[0].path)
        }
        const group = await Chat.create({
            chatType,
            participants,
            groupName,
            groupImage,
            groupAdmins: [req.user._id],
            groupDescription,
            groupCreatedBy: req.user._id
        })
        return res.status(201).json(
            new ApiResponse(201, group, "group Created Successfully")
        )

    } else {
        throw new ApiError(400, "You are trying to create Group not chat");
    }

})

const changeGroupIcon = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;
    console.log("Chat id", chatId);
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "chat not found");
    }
    if (chat.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    const isParticipant = chat.participants.some(
        id => id.equals(req.user._id)
    )
    if (!isParticipant) {
        throw new ApiError(404, "You are  not allowed to change to group icon you are not group member");
    }

    if (!req.files?.groupImage?.length) {
        throw new ApiError(400, "Profile image is required");
    }
    console.log("Ok not chaned");
    const cloudProfileImage = await uploadOnCloudinary(req.files.groupImage[0].path);
    console.log("Ok", cloudProfileImage);
    if (!cloudProfileImage) {
        throw new ApiError(503, "Group Profile Change Failed");
    }
    console.log("This is updated Profile", cloudProfileImage);
    chat.groupImage = cloudProfileImage;
    await chat.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, cloudProfileImage, "Profile Changed Successfully "));
})

const changeGroupName = asyncHandler(async (req, res, next) => {
    const { groupName } = req.body;
    const { chatId } = req.params;
    if (!groupName) {
        throw new ApiError(400, "Group name not mentioned");
    }
    const chat = await Chat.findById(chatId).select("-password -refreshToken");
    if (!chat) {
        throw new ApiError(404, "chat not found");
    }
    if (chat.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    const isParticipant = chat.participants.some(
        id => id.equals(req.user._id)
    )
    if (!isParticipant) {
        throw new ApiError(404, "You are  not allowed to change to group name you are not group member");
    }
    chat.groupName = groupName;
    await chat.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, chat, "group name Changed Successfully "));
})

const changeGroupDescription = asyncHandler(async (req, res, next) => {
    const { groupDescription } = req.body;
    const { chatId } = req.params;
    console.log("Chat id", chatId, groupDescription);
    if (!groupDescription) {
        throw new ApiError(400, "Group description not mentioned");
    }
    const chat = await Chat.findById(chatId).select("-password -refreshToken");
    if (!chat) {
        throw new ApiError(404, "chat not found");
    }
    if (chat.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    const isParticipant = chat.participants.some(
        id => id.equals(req.user._id)
    )
    if (!isParticipant) {
        throw new ApiError(404, "You are  not allowed to change to group name you are not group member");
    }
    chat.groupDescription = groupDescription;
    await chat.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, chat, "group descrtiption Changed Successfully "));
})

const exitFromGroup = asyncHandler(async (req, res, next) => {

    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "chat not found");
    }
    if (chat.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    const isParticipant = chat.participants.some(
        id => id.equals(req.user._id)
    )
    if (!isParticipant) {
        throw new ApiError(403, "you are not group member");
    }
    const newParticipants = chat.participants.filter(
        id => !id.equals(req.user._id)
    );
    const newGroupAdmins = chat.groupAdmins.filter(
        id => !id.equals(req.user._id)
    );
    if (newGroupAdmins.length <= 0) {
        throw new ApiError(403, "Atleast one admin should be there ")
    }
    chat.participants = newParticipants;
    chat.groupAdmins = newGroupAdmins;
    await chat.save({ validateBeforeSave: true });
    return res.status(200).json(new ApiResponse(200, { newParticipants, newGroupAdmins }, "exit from group Successfully "));
})

const addMembersIntoGroup = asyncHandler(async (req, res, next) => {
    console.log("ok", req.body.participantsIds);
    let { participantsIds } = req.body;

    const { chatId } = req.params;
    console.log("chatid", chatId);
    if (participantsIds.length <= 0) {
        throw new ApiError(400, "You cannot create group with no participants");
    }
    const group = await Chat.findById(chatId);
    if (!group) {
        throw new ApiError(400, "Group Not Found");
    }
    if (group.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    let visit = new Set(
        group.participants.map(id => id.toString())
    );
    for (let id of participantsIds) {
        if (visit.has(id.toString())) {
            throw new ApiError(400, "Enter Only WHo are not in Group");
        }
        visit.add(id.toString());
    }
    group.participants.push(...participantsIds);
    await group.save();
    return res.status(200).json(
        new ApiResponse(200, group, "Participants addedd Succesfully")
    )
})

const addAdminsIntoGroup = asyncHandler(async (req, res, next) => {
    const { groupAdmins } = req.body;
    const { chatId } = req.params;
    if (!groupAdmins || groupAdmins.length <= 0) {
        throw new ApiError(400, "You are not adding participants");
    }
    const group = await Chat.findById(chatId);
    if (!group) {
        throw new ApiError(400, "Group Not Found");
    }
    if (group.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    if (!group.groupAdmins.includes(req.user._id)) {
        throw new ApiError(403, "Only group admins can add new admins");
    }

    let participants = new Set(
        group.participants.map(id => id.toString())
    );

    for (let id of groupAdmins) {
        if (!participants.has(id.toString())) {
            throw new ApiError(400, "Only Make admin Who are  in Group");
        }
    }
    let admins = new Set(
        group.groupAdmins.map(id => id.toString())
    );

    for (let id of groupAdmins) {
        if (admins.has(id.toString())) {
            throw new ApiError(400, "Only participants can only become Admin");
        }
    }
    group.groupAdmins.push(...groupAdmins);
    await group.save();
    return res.status(200).json(
        new ApiResponse(200, group, "Participants addedd Succesfully")
    )
})

const removeFromGroup = asyncHandler(async (req, res, next) => {
    let { participantsIds } = req.body;
    const { chatId } = req.params;
    console.log(req.body.participantsIds);
    console.log(typeof (req.body.participantsIds));
    console.log("ok", participantsIds, chatId);
    if (!participantsIds || participantsIds.length <= 0) {
        throw new ApiError(400, "You cannot create group with no participants");
    }
    const group = await Chat.findById(chatId);
    if (!group) {
        throw new ApiError(400, "Group Not Found");
    }
    if (group.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can change Group Icon only");
    }
    console.log("ok", group.participants);

    let participants = new Set(
        group.participants.map(id => id.toString())
    );
    console.log("ok", participants);
    let admins = new Set(
        group.groupAdmins.map(id => id.toString())
    );

    for (let id of participantsIds) {
        if (!participants.has(id.toString())) {
            console.log("ok error", id.toString(), "this is participants", participants);
            throw new ApiError(400, "Remove Only WHo are in Group");
        }
        if (admins.has(id.toString())) {
            throw new ApiError(403, "You cannot Remove who are admins");
        }
    }
    group.participants = group.participants.filter(
        participant => !participantsIds.includes(participant.toString())
    );
    await group.save();
    return res.status(200).json(
        new ApiResponse(200, group, "Participants removed Succesfully")
    )
})
const filterByGroups = asyncHandler(async (req, res, next) => {
    const chats = await Chat.find({
        chatType: "group",
        participants: {
            $in: [req.user._id]
        }
    });
    return res.status(200).json(
        new ApiResponse(200, chats, "Chat Fetched Succeesfully")
    )

})
const joinGroup = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Chat not Found");
    }
    if (chat.participants.some(
        id => id.toString() === req.user._id.toString()
    )) {
        throw new ApiError(400, "You are already  a Member");
    }
    chat.participants.push(req.user._id);
    await chat.save();
    return res.status(200).json(
        new ApiResponse(200, chat, "Joinined in the group Successfully")
    )
})
const getJoinLink = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(400, "Chat not Found");
    }
    if (chat.participants.some(
        id => id.toString() === req.user._id.toString()
    )) {
        return res.status(200).json(
            new ApiResponse(200, chat.groupInviteLink, "Link Generated Successfully")
        )
    }
    throw new ApiError(404, "You are not A participant to get the link");

})
const deleteGroup = asyncHandler(async (req, res, next) => {
    const { chatType } = req.query;
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) {
        throw new ApiError(404, "Group not found");
    }
    if (chat.chatType.toLowerCase() !== "group") {
        throw new ApiError(403, "You can delete Group only");
    }
    const isParticipant = chat.participants.some(
        id => id.equals(req.user._id)
    )
    if (!isParticipant) {
        throw new ApiError(403, "you are not group member");
    }
    const isAdmin = chat.groupAdmins.some(
        id => id.equals(req.user._id)
    )

    if (chat.participants.length > 1) {
        throw new ApiError(403, "Group Can be deleted if No members in the group other than ou")
    }
    if (!isAdmin) {
        throw new ApiError(403, "Only the group admin can delete the group");
    }
    await Message.deleteMany({
        chat: chatId
    });
    await chat.deleteOne();
    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            "Group and messages deleted successfully"
        )
    );
})
const getGroupProfile = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    const group = await Chat.findById(chatId)
        .populate("groupAdmins", "username profileImage")
        .populate("createdBy", "username profileImage");

    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    if (group.chatType !== "group") {
        throw new ApiError(400, "This is not a group");
    }

    const isParticipant = group.participants.some(
        participant => participant.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
        throw new ApiError(403, "You are not a member of this group");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                _id: group._id,
                groupName: group.groupName,
                groupDescription: group.groupDescription,
                groupImage: group.groupImage,
                createdAt: group.createdAt,
                createdBy: group.createdBy,
                admins: group.groupAdmins,
                totalMembers: group.participants.length
            },
            "Group profile fetched successfully"
        )
    );
});

const getGroupMembers = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const group = await Chat.findById(chatId)
        .populate("participants", "username profileImage bio");
    if (!group) {
        throw new ApiError(404, "Group not found");
    }
    const isParticipant = group.participants.some(
        user => user._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
        throw new ApiError(403, "You are not a member of this group");
    }
    let members = group.participants;
    if (cursor) {
        const index = members.findIndex(
            member => member._id.toString() === cursor
        );

        if (index !== -1) {
            members = members.slice(index + 1);
        }
    }
    const paginatedMembers = members.slice(0, limit);
    const hasMore = members.length > limit;
    const nextCursor = hasMore
        ? paginatedMembers[paginatedMembers.length - 1]._id
        : null;
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                members: paginatedMembers,
                nextCursor,
                hasMore
            },
            "Members fetched successfully"
        )
    );
});

const searchGroups = asyncHandler(async (req, res) => {
    const { search = "", cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const query = {
        chatType: "group",
        groupName: {
            $regex: search,
            $options: "i"
        }
    };

    if (cursor) {
        query._id = { $gt: cursor };
    }
    const groups = await Chat.find(query)
        .select("groupName groupImage groupDescription participants createdAt")
        .sort({ _id: 1 })
        .limit(limit + 1);
    const hasMore = groups.length > limit;
    if (hasMore) {
        groups.pop();
    }
    const nextCursor = hasMore
        ? groups[groups.length - 1]._id
        : null;
    const formattedGroups = groups.map(group => ({
        _id: group._id,
        groupName: group.groupName,
        groupImage: group.groupImage,
        groupDescription: group.groupDescription,
        totalMembers: group.participants.length
    }));
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                groups: formattedGroups,
                nextCursor,
                hasMore
            },
            "Groups fetched successfully"
        )
    );
});

export {
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
}