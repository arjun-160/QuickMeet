import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET","POST"],
            allowHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        console.log("New user connected");

        socket.on("join-call", (path) => {
    
            // 1. If this is the first time someone is joining this room (path),
            // create an empty array to store socket IDs of users in this room
            if (connections[path] == undefined) {
                connections[path] = [];
            }

            // 2. Add the current user's socket ID to the list of connections for this room
            connections[path].push(socket.id);

            // 3. Save the current time the user joined — useful to calculate how long they stayed later
            timeOnline[socket.id] = new Date();

            // 4. Notify **everyone already in the room** that a new user has joined
            for (let a = 0; a < connections[path].length; a++) {
                // Emit a "user-joined" event to each user in the room,
                // passing the new user's ID and the list of all users in the room
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
            }

            // 5. If there are existing messages in this room (chat history), send them to the new user
            if (messages[path] != undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    // Send each old chat message one by one to the newly joined user
                    io.to(socket.id).emit(
                        "chat-message", 
                        messages[path][a]["data"],              // Message text
                        messages[path][a]["sender"],            // Who sent it
                        messages[path][a]["socket-id-sender"]   // Their socket ID
                    );
                }
            }

        });

        //  Listen for a "signal" event from a user (used in WebRTC calls)
        socket.on("signal", (toId, message) => {
            
            // ⏩ Relay that signal message to the user with socket ID `toId`
            // Also include the sender's socket ID, so the receiver knows who it's from
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            // 1. Find which room this user belongs to by searching connections
            const [matchingRoom, found] = Object.entries(connections).reduce(
                ([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true]; // Found the room where this user exists
                    }
                    return [room, isFound]; // Continue searching
                },
                ["", false] // initial values for room and isFound
            );

            // 2. If a matching room is found
            if (found == true) {

                // 3. If no messages exist for this room yet, initialize the message array
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                // 4. Add the new message to the room's chat history
                messages[matchingRoom].push({
                    "sender": sender,
                    "data": data,
                    "socket-id-sender": socket.id
                });

                // 5. Print message to console (for debug)
                console.log("message", matchingRoom, ":", sender, data);

                // 6. Broadcast this chat message to everyone in the room
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });


        socket.on("disconnect", () => {
            // Calculate how long the user was online
            var diffTime = Math.abs(timeOnline[socket.id] - new Date());

            var key; // This will store the room name the socket belongs to

            // Loop through all active rooms (deep copy to avoid mutation issues)
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                // v is the array of socket IDs in room 'k'
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] == socket.id) {
                        // Found the room this user belongs to
                        key = k;
                                                                                           
                        // Notify everyone in this room that the user has left
                        for (let i = 0; i < connections[key].length; ++i) {
                            io.to(connections[key][i]).emit("user-left", socket.id);
                        }

                        // Remove this user from the room
                        var index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        // If the room is now empty, delete it to clean up
                        if (connections[key].length === 0) {
                            delete connections[key];
                        }

                        break; // Exit once the user is found and processed
                    }
                }
            }

            // Optionally, you can delete the timeOnline data too
            delete timeOnline[socket.id];
        });
    
    });

    return io;

}