import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["text", "image", "video", "audio"],
            required: true,
        },

        caption: {
            type: String,
            default: "",
            trim: true,
        },

        mediaUrl: {
            type: String,
            default: null,
        },
        statusText:{
            type: String,
            default: null,
        },
        viewers: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                viewedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, 
        },
    },
    {
        timestamps: true,
    }
);

statusSchema.index({ userId: 1, createdAt: -1 });

const Status = mongoose.model("Status", statusSchema);

export default Status;