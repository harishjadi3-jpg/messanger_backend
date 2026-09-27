import mongoose from "mongoose";
const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        messageType: {
            type: String,
            enum: [
                "text",
                "image",
                "video",
                "audio",
                "file",
                "location",
                "emoji",
            ],
            required: true,
            default: "text",
        },

        text: {
            type: String,
            default: "",
            trim: true,
        },

        mediaUrl: [{
            type: String,
            default: null,
        }],

        thumbnail: {
            type: String,
            default: null,
        },

        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },

        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
        },

        deletedForEveryone: {
            type: Boolean,
            default: false,
        },

        deletedForMe: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        reactions: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                emoji: String,
            },
        ],

        isEdited: {
            type: Boolean,
            default: false,
        },

        editedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ status: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;