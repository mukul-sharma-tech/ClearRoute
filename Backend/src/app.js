import express from "express";

import { createServer } from "node:http";

import { Server } from "socket.io";

import { mongoose } from "mongoose";

import cors from "cors";
import { connectToSocket } from "./controllers/socketManger.js"
import router from "./routes/usersroutes.js";
import { env } from "node:process";
import dns from "node:dns";
import dotenv from "dotenv";

dotenv.config();

// Force Node.js to use Google Public DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

const server = createServer(app);
const io = connectToSocket(server);


app.set("port", (process.env.PORT || 8000))


app.use("/api/v1/users", router);



// app.get("/home", (req,res)=>{
//   return res.json({"hello" : "World" });

// });


const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

const start = async () => {
    const connectionDb = await mongoose.connect(MONGO_URI, {
        family: 4 // Force IPv4 DNS resolution
    });

    console.log(`MONGO Connected DB Host : ${connectionDb.connection.host}`)
    server.listen(app.get("port"), () => {
        console.log("listeing on port 8000")
    })

    // Start TURN server for media routing
    const Turn = (await import('node-turn')).default;
    const turnServer = new Turn({
        authMech: 'long-term',
        credentials: {
            "atomquest": "hackathon123"
        },
        listeningPort: 3478,
    });
    turnServer.start();
    console.log("TURN server listening on port 3478");
}


start();
