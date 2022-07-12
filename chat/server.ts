import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server, Socket } from 'socket.io';


const app = express();
app.set('view engine', 'pug');
app.set('views',__dirname +'/views');
app.use("/public", express.static(__dirname + "/public"));
app.get('/', (_, res) => {
    res.render('home');
});
app.get('/*', (req: Request, res: Response, next: NextFunction) => res.redirect('/'));

interface CustomSocket extends Socket {
    nickname?: string;
}

const server = http.createServer(app);
const wsServer: Server  = new Server(server);

function getPublicRooms() {
    const publicRooms: { [key:string]: number } = {}
    const {
        sockets: {
            adapter: {
                rooms, sids
            }
        }
    } = wsServer;
    rooms.forEach((room, roomId) => {
        if (sids.get(roomId) === undefined) {
            publicRooms[roomId] = room.size;
        }
    });
    return publicRooms;
}


wsServer.on("connection", (socket: CustomSocket) => {
    console.log('Connected to browser ✅'); 
    socket['nickname'] = 'Anonymous';
    socket.onAny((e) => {
        console.log(`event: ${e}`);
    })

    socket.on("get_room_info", () => {
        wsServer.sockets.emit("room_change", getPublicRooms());
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        socket.to(roomName).emit("welcome", socket.nickname);
        wsServer.sockets.emit("room_change", getPublicRooms());
        done();
    });
    socket.on("disconnecting", () => {
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname));
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", getPublicRooms());
    });
    socket.on("new_message", (msg, roomName, done) => {
        socket.to(roomName).emit("new_message", msg, socket.nickname);
        done();
    });
    socket.on("nickname", (nickname, done) => {
        socket['nickname'] = nickname;
        done();
    });
});
 
server.listen(3000, "0.0.0.0", () => {
    console.log('listening on 3000')
});