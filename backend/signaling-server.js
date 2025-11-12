/**
 * Lightweight WebSocket signaling server for WebRTC coordination
 * Run: node signaling-server.js
 * Use ngrok (ngrok http 3001) to expose it as wss:// for testing
 */

const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = process.env.SIGNALING_PORT || 3001;
const PATH = process.env.SIGNALING_PATH || '/ws';

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MAX miniapp signaling server\n');
});

const wss = new WebSocket.Server({ server, path: PATH });
const rooms = new Map(); // roomId -> Set of sockets

function log(...args) {
    console.log(new Date().toISOString(), '-', ...args);
}

function joinRoom(socket, roomId) {
    leaveRoom(socket);

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(socket);
    socket.meta.roomId = roomId;

    log(`Client ${socket.meta.id} joined room ${roomId} (size=${rooms.get(roomId).size})`);
    socket.send(JSON.stringify({ type: 'system', message: `joined:${roomId}` }));
}

function leaveRoom(socket) {
    const { roomId } = socket.meta;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.delete(socket);
    if (room.size === 0) {
        rooms.delete(roomId);
        log(`Room ${roomId} removed (empty)`);
    } else {
        log(`Client ${socket.meta.id} left room ${roomId} (size=${room.size})`);
    }

    socket.meta.roomId = null;
}

function broadcast(socket, message) {
    const { roomId } = socket.meta;
    if (!roomId) {
        return;
    }

    const room = rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify({
        type: message.type,
        payload: message.payload,
        senderId: socket.meta.id,
        roomId
    });

    room.forEach(client => {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on('connection', socket => {
    socket.meta = {
        id: crypto.randomUUID(),
        roomId: null,
        isAlive: true
    };

    socket.on('pong', () => {
        socket.meta.isAlive = true;
    });

    socket.on('message', raw => {
        let data;
        try {
            data = JSON.parse(raw.toString());
        } catch (err) {
            log('Invalid JSON from client', err);
            return;
        }

        if (data.type === 'join' && data.roomId) {
            joinRoom(socket, data.roomId);
            return;
        }

        if (!socket.meta.roomId) {
            socket.send(JSON.stringify({ type: 'error', message: 'join room first' }));
            return;
        }

        if (typeof data.type !== 'string') {
            return;
        }

        broadcast(socket, data);
    });

    socket.on('close', () => {
        leaveRoom(socket);
    });
});

const interval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.meta) return;

        if (!ws.meta.isAlive) {
            ws.terminate();
            return;
        }

        ws.meta.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

server.listen(PORT, () => {
    log(`Signaling server running on http://localhost:${PORT}${PATH}`);
});

