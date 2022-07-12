import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server, Socket } from 'socket.io';


const app = express();
app.set('view engine', 'pug');
app.set('views',__dirname +'/views');
app.use("/public", express.static(__dirname + "/public"));
app.get('/', (_, res) => {
    res.sendFile(__dirname + '/index.html')
});
app.get('/*', (req: Request, res: Response, next: NextFunction) => res.redirect('/'));

interface CustomSocket extends Socket {
    nickname?: string;
}

const server = http.createServer(app);
const wsServer: Server  = new Server(server);

wsServer.on("connection", (socket: CustomSocket) => {
    console.log('Connected to browser ✅');
    socket.on("join_room", (roomName) => {
        socket.join(roomName);
        socket.to(roomName).emit("welcome");
    });
    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });
    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });
    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    });
});
 
server.listen(3000, () => {
    console.log('listening on 3000')
});