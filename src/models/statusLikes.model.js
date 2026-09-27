import mongoose from "mongoose";
const statusLikeSchema = new mongoose.Schema(
    {
        statusId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Status",
            required: true,
        },
        likedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);
statusLikeSchema.index(
    { statusId: 1, likedBy: 1 },
    { unique: true }
);
export default mongoose.model("StatusLike", statusLikeSchema);