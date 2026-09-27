import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        
        type: {
            type: String,
            enum: [
                "message",
                "group_message",
                "group_created",
                "group_added",
                "group_removed",
                "group_left",
            ],
            required: true,
        },

        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            default: null,
        },

        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },

        message: {
            type: String,
            required: true,
            trim: true,
        },

        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);


notificationSchema.index({ receiverId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;