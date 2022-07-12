const socket = io();
const myFace = document.getElementById("myFace");
const peerFace = document.getElementById("peerFace");
const muteBtn = document.getElementById('mute');
const cameraBtn = document.getElementById('camera');
const msgSendBtn = document.getElementById("msgSendBtn");
const cameraSelect = document.getElementById("cameras");
const chatList = document.getElementById("chatList");
const closeBtn = document.getElementById("close");

const call = document.getElementById("call");

call.style.display = "none";

let myStream;
let muted = false;
let cameraOff = false;
let roomName; 
let myPeerConnection;
let myDataChannel;


async function getMedia(deviceId) {
    const defaultConstraint = {
        audio: true,
        video: {
            facingMode: "user"
        }
    };
    const cameraConstraint = {
        audio: true,
        video: {
            exact: deviceId
        }
    };
    myStream = await navigator.mediaDevices.getUserMedia(
        deviceId ? cameraConstraint : defaultConstraint
    );
    console.log("mine", myStream)
    if (!deviceId) {
        await getCameras();
    }
    myFace.srcObject = myStream;
}

muteBtn.addEventListener("click", hadleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        cameras.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.deviceId;
            opt.innerText = c.label;
            cameraSelect.appendChild(opt);
        });
    } catch(e) {
        console.log(e);
    }
}

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().filter(s => s.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }

}

function hadleMuteClick() {
    myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    switch(muted) {
        case true:
            muted = false;
            muteBtn.innerText = 'Mute'
            break
        default:
            muted = true;
            muteBtn.innerText = 'Unmute'
    } 
}

function handleCameraClick() {
    myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    switch(cameraOff) {
        case true:
            cameraOff = false;
            cameraBtn.innerText = 'Turn off the camera'
            break
        default:
            cameraOff = true;
            cameraBtn.innerText = 'Turn on the camera'
    }
}


const welcome = document.getElementById("welcome");
const chatRoom = document.getElementById("chatRoom");
const welcomeForm = welcome.querySelector("form");
const chatRoomForm = chatRoom.querySelector("form");


async function initCall() {
    call.style.display = "flex";
    welcome.style.display = "none";
    await getMedia();
    makeConnection();
}

welcomeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inp = welcome.querySelector("input");
    await initCall();
    socket.emit("join_room", inp.value);
    roomName = inp.value;
    document.querySelector("h2").innerText = roomName;
    inp.value = "";
});

function makeConnection() {
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", (data) => {
        socket.emit("ice", data.candidate, roomName);
    });
    myPeerConnection.addEventListener("track", async (data) => {
        console.log("stream", data.streams);
        const [remoteStream] = data.streams;
        peerFace.srcObject = remoteStream;
    });

    myPeerConnection.addEventListener("connectionstatechange", (e) => {
        switch(myPeerConnection.connectionState) {
            case "disconnected":
            case "closed":
                peerFace.remove();
                const peerContainer = document.getElementById("peerFaceContainer");
                const closeDiv = document.getElementById("closeDiv");
                closeDiv.style.display = 'flex';
                break
        }
    });

    myPeerConnection.addEventListener("negotiationneeded", (e) => {
        console.log("nego event", e);
    })

    closeBtn.addEventListener("click", (e) => {
        myPeerConnection.getSenders().forEach(s => myPeerConnection.removeTrack(s));
        myPeerConnection.close();
    });
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

chatRoomForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = chatRoomForm.querySelector("input");
    const msg = inp.value;
    const li = createList('You: ' + msg);
    chatList.appendChild(li);
    myDataChannel.send(msg);
    inp.value = "";
});

/**
 * 
 * Socket Part 
 * 
 */

 socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("open", (e) => {
        document.getElementById("sendBtn").disabled = false;
    });
    myDataChannel.addEventListener("message", (e) => {
            const li = document.createElement("li");
            li.innerText = 'Partner: ' + e.data;
            chatList.appendChild(li);
    });
    myDataChannel.addEventListener("close", (e) => {
        document.getElementById("sendBtn").disabled = true;
    });
    const offer = await myPeerConnection.createOffer();
    console.log("offer", offer);
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (e) => {
        myDataChannel = e.channel;
        myDataChannel.addEventListener("open", (e) => {
            document.getElementById("sendBtn").disabled = false;
        });
        myDataChannel.addEventListener("message", (e) => {
            const li = createList('Partner: ' + e.data);
            chatList.appendChild(li);
        });
        myDataChannel.addEventListener("close", (e) => {
            document.getElementById("sendBtn").disabled = true;
        });
    })
    myPeerConnection.setRemoteDescription(offer);
    console.log("received offer");
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    console.log("asnwer", answer);
    socket.emit("answer", answer, roomName);
});


socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
    console.log("received answer");
});

socket.on("ice", (ice) => {
    myPeerConnection.addIceCandidate(ice);
});


function createList(msg) {
    const li = document.createElement('li');
    li.innerText = msg;
    li.style.display = "block";
    li.style.display =  'block';
    li.style.whiteSpace =  'nowrap';
    li.style.width =  '250px';
    li.style.overflow =  'auto';

    return li;
}