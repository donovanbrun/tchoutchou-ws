const Message = require("./Message.js");
const MessageType = require("./MessageType.js");

const fs = require('fs');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let map = [];
const mapSaveRep = "data";
const mapSavePath = mapSaveRep + "/map.json";

const initMap = () => {
    if (fs.existsSync(mapSavePath)) {
        const data = fs.readFileSync(mapSavePath, 'utf8');
        map = JSON.parse(data);
        return;
    }

    for (let i = 0; i < 100; i++) {
        map.push([]);
        for (let j = 0; j < 100; j++) {
            map[i].push(null);
        }
    }
}
initMap();

const saveMap = () => {
    if (wss.clients.size === 0) return;
    if (!fs.existsSync(mapSaveRep)) {
        fs.mkdirSync(mapSaveRep);
    }
    fs.writeFileSync(mapSavePath, JSON.stringify(map));
    console.log("Map saved");
}

setInterval(saveMap, 60000);

const clients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');
    const name = "client-" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    const client = {
        name,
        color: (Math.random() * 0xFFFFFF << 0).toString(16).slice(-6),
    };
    clients.push(client);
    console.log("Total clients: ", clients.length);
    sendName(ws, name);
    sendClients();

    const data = {
        type: "map",
        data: map
    }
    ws.send(JSON.stringify(data));

    ws.on('message', (event) => {
        const { type, data } = JSON.parse(event.toString());

        switch (type) {
            case MessageType.tile:
                handleSetTile(ws, data);
                break;
            case MessageType.delete:
                handleDeleteTile(ws, data);
                break;
            case MessageType.viewport:
                const client = clients.find(client => client.name === name);
                handleViewportUpdate(ws, data, client)
                break;
            default:
                return;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        const index = clients.findIndex(client => client.name === name);
        clients.splice(index, 1);
        console.log("Total clients: ", clients.length);
        sendClients();
    });
});

function handleSetTile(ws, data) {
    const { x, y, name, rotation } = data;

    map[y][x] = { name, rotation };

    sendToOthers(ws, new Message(MessageType.tile, data));
}

function handleDeleteTile(ws, data) {
    map[data.y][data.x] = null;

    sendToOthers(ws, new Message(MessageType.delete, data));
}

function handleViewportUpdate(ws, data, client) {
    client.viewport = data;

    sendToOthers(ws, new Message(MessageType.viewport, { viewport: data, clientId: client.name }));
}

function sendClients() {
    sentToAll(new Message(MessageType.clients, clients));
}

function sendName(ws, name) {
    ws.send(new Message(MessageType.name, name).json);
}

function sentToAll(message) {
    for (wsClient of wss.clients) {
        wsClient.send(message.json);
    }
}

function sendToOthers(ws, message) {
    for (const wsClient of wss.clients) {
        if (wsClient != ws)
            wsClient.send(message.json)
    }
}
