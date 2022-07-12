const socket = io();
const welcome = document.getElementById("welcome");
const room = document.getElementById("room");
const msgForm = room.querySelector("#msg");
const nicknameForm = document.getElementById("nickname");

socket.emit("get_room_info");

room.hidden = true;

let roomName;

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector('h3');
    h3.innerText = `Room ${roomName}`;
}

function addMessage(message) {
    const ul = room.querySelector('ul');
    const li = document.createElement('li');
    li.innerText = message;
    ul.appendChild(li);
}

welcome.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = welcome.querySelector("input");
    roomName = inp.value;
    socket.emit("enter_room", inp.value, showRoom);
});

msgForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = msgForm.querySelector("input");
    const msg = inp.value;
    socket.emit("new_message", msg, roomName, () => {
        addMessage(`You: ${msg}`);
    });
    inp.value = "";
});

nicknameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = nicknameForm.querySelector("input");
    socket.emit("nickname", inp.value, () => {
        const strong = document.querySelector("strong");
        strong.innerText = `your nickname is ${inp.value}`;
        nicknameForm.hidden = true;
    });
})


socket.on("welcome", (user) => {
    addMessage(`${user} Joined!`);
});

socket.on("bye", (user) => {
    addMessage(`${user} left T.T`);
});

socket.on("new_message", (msg, user) => {
    addMessage(`${user}: ${msg}`);
});

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector('ul');
    roomList.innerText = "";
    if(Object.keys(rooms).length) {
        Object.keys(rooms).forEach((roomId) => {
            const li = document.createElement('li');
            li.innerText = `${roomId} (${rooms[roomId]})`;
            roomList.append(li);
        });
    }
});