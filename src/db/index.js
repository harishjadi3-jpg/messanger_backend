import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const connectDB=async ()=>{
    try {
        const connectionInstance=await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongo DB Connected Successfully");
    } catch (error) {
        throw new ApiError(400,"Error while Connecting to Db");
    }
}

export default connectDB