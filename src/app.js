import express from "express";
import dotenv from "dotenv";
import cors from "cors"
import cookieParser from "cookie-parser";
dotenv.config();



const app=express();
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(express.json())
app.use(express.static("public"));
app.use(cookieParser())
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import groupRoutes from "./routes/group.routes.js";
import statusRoutes from "./routes/status.routes.js";

app.use("/api/v1/user",userRoutes);
app.use("/api/v1/message",messageRoutes);
app.use("/api/v1/group",groupRoutes);
app.use("/api/v1/status",statusRoutes);

export {app}