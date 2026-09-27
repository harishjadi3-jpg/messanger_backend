import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        chatType: {
            type: String,
            enum: ["private", "group"],
            required: true,
        },

        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],

        lastMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        groupName: {
            type: String,
            default: null,
            trim: true,
        },

        groupImage: {
            type: String,
            default: null,
        },

        groupAdmins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            }
        ],
        groupDescription: {
            type: String,
            default: "",
        },

        groupCreatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        groupInviteLink: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;