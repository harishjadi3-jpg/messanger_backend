import express from "express";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const verifyJWT = asyncHandler(async (req, res, next) => {
    
    const token = req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
   
    if (!token) {
        throw new ApiError(401, "Unauthorized");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    if (!decodedToken) {
        throw new ApiError("Token is not Matching", 401);
    }
    const user = await User.findById(decodedToken.id).select("-password -refreshtoken");
    
    if (!user) {
        throw new ApiError("User not matched", 404)
    }
    req.user = user;
    next();
})
