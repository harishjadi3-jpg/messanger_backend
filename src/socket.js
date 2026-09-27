import { Server } from "socket.io";

let io;

// userId -> number of active socket connections
const onlineUsers = new Map();

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("Socket Connected:", socket.id);

        // ==========================================
        // USER JOIN
        // ==========================================
        socket.on("join", (userId) => {
            if (!userId) {
                console.log("Join failed: userId missing");
                return;
            }

            const userIdString = userId.toString();

            // Join user's personal room
            socket.join(userIdString);

            // Store userId inside socket
            socket.userId = userIdString;

            // Get existing connection count
            const currentConnections =
                onlineUsers.get(userIdString) || 0;

            // Increase connection count
            onlineUsers.set(
                userIdString,
                currentConnections + 1
            );

            console.log(
                `User ${userIdString} joined room ${userIdString}`
            );

            console.log(
                `Active connections for ${userIdString}: ${
                    currentConnections + 1
                }`
            );

            // ==========================================
            // SEND CURRENT ONLINE USERS TO THIS USER
            // ==========================================

            socket.emit("onlineUsers", {
                users: Array.from(onlineUsers.keys()),
            });

            // ==========================================
            // USER JUST BECAME ONLINE
            // ==========================================

            if (currentConnections === 0) {
                io.emit("userOnline", {
                    userId: userIdString,
                });

                console.log(
                    `User ${userIdString} is ONLINE`
                );
            }
        });

        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on("disconnect", () => {
            console.log(
                "Socket Disconnected:",
                socket.id
            );

            const userId = socket.userId;

            // Socket never joined
            if (!userId) {
                return;
            }

            const currentConnections =
                onlineUsers.get(userId) || 0;

            // ==========================================
            // LAST CONNECTION CLOSED
            // ==========================================

            if (currentConnections <= 1) {
                onlineUsers.delete(userId);

                io.emit("userOffline", {
                    userId,
                });

                console.log(
                    `User ${userId} is OFFLINE`
                );
            }

            // ==========================================
            // OTHER TAB / DEVICE STILL CONNECTED
            // ==========================================

            else {
                onlineUsers.set(
                    userId,
                    currentConnections - 1
                );

                console.log(
                    `User ${userId} still has ${
                        currentConnections - 1
                    } active connection(s)`
                );
            }

            console.log(
                "Currently online:",
                Array.from(onlineUsers.keys())
            );
        });
    });
};

// Export socket instance
export { io };

// Optional helper
export const getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
};