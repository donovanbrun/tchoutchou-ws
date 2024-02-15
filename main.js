const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const map = [];
for (let i = 0; i < 100; i++) {
    map.push([]);
    for (let j = 0; j < 100; j++) {
        map[i].push({
            tile: null,
            rotation: 0.0
        });
    }
}

const clients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');
    const name = "client-" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    clients.push({
        name,
        color: (Math.random() * 0xFFFFFF << 0).toString(16),
    });
    console.log("Total clients: ", clients.length);
    sendClients();

    const data = {
        type: "map",
        data: map
    }
    ws.send(JSON.stringify(data));

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());

        switch (data.type) {
            case "tile":
                handleSetTile(ws, data);
                break;
            case "delete":
                handleDeleteTile(ws, data);
                break;
            default:
                return;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        const index = clients.findIndex((client) => client.name === name);
        clients.splice(index, 1);
        console.log("Total clients: ", clients.length);
        sendClients();
    });
});

const handleSetTile = (ws, data) => {
    const tile = data.data;
    if (!tile) return;

    map[tile.y][tile.x] = {
        tile: tile.tile,
        rotation: tile.rotation
    };

    wss.clients.forEach((client) => {
        if (client != ws)
            client.send(JSON.stringify(data));
    });
}

const handleDeleteTile = (ws, data) => {
    const tile = data.data;
    console.log("delete ", tile);
    if (!tile) return;

    map[tile.y][tile.x] = {
        tile: null,
        rotation: 0.0
    };

    wss.clients.forEach((client) => {
        if (client != ws)
            client.send(JSON.stringify(data));
    });
}

const sendClients = () => {
    const data = {
        type: "clients",
        data: JSON.stringify(clients)
    }
    wss.clients.forEach((client) => {
        client.send(
            JSON.stringify(data)
        );
    });
}