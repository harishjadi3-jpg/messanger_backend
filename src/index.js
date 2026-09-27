import "dotenv/config";
import {app} from "./app.js"
import connectDB from "./db/index.js"
import { ApiError } from "./utils/ApiError.js";
import http from "http";
import { initializeSocket } from "./socket.js";

const startServer=async()=>{
    try {
        const server=http.createServer(app);
        initializeSocket(server);
        await connectDB();
        server.listen(process.env.PORT || 5000 ,()=>{
            console.log(`Server Started Successfully ${process.env.PORT}`);
        })
        
    } catch (error) {
        console.error(400,"Error while starting server");
    }

}
startServer()
// there meight be error in display chats