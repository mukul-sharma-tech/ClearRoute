import { Server } from "socket.io";
import { Meeting } from "../models/meetingmodel.js";


let connections = {}
let messages = {}
let timeOnline = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED");

        socket.on("join-call", async (path, role) => {

            const code = path.split('/').pop() || path;
            let existing = await Meeting.findOne({ meetingCode: code, status: 'Active' });

            if (!existing) {
                if (role === 'Agent') {
                    // Agent creates the session
                    try {
                        let newMeeting = new Meeting({
                            meetingCode: code,
                            status: 'Active'
                        });
                        await newMeeting.save();
                    } catch(e) {
                        console.log("Error saving meeting:", e);
                    }
                } else {
                    // Customer tries to join invalid or ended session
                    socket.emit('call-error', 'Invalid Invite: This session does not exist or has already ended.');
                    return; // Prevent joining
                }
            }

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)

            timeOnline[socket.id] = new Date();

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", async (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                // Save chat to MongoDB
                try {
                    const code = matchingRoom.split('/').pop() || matchingRoom;
                    await Meeting.updateOne(
                        { meetingCode: code, status: 'Active' },
                        { $push: { chatHistory: { sender: sender, message: data } } }
                    );
                } catch (e) {
                    console.log("Error saving chat:", e);
                }

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        socket.on("disconnect", async () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                            // Mark meeting as ended in DB
                            try {
                                const code = key.split('/').pop() || key;
                                await Meeting.updateOne(
                                    { meetingCode: code, status: 'Active' },
                                    { $set: { status: 'Ended', endTime: new Date() } }
                                );
                            } catch (e) {
                                console.log("Error ending meeting:", e);
                            }
                        }
                    }
                }

            }


        })


    })


    return io;
}

