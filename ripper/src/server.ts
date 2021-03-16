import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { app } from './app';
import path from 'path';

export const server = createServer(app);
const io = new SocketServer(server, {});

app.get('/', (req, res) => {
    const index = path.normalize('../html/index.html');

    res.sendFile(index);
});

app.get('/api', (req, res) => {
    res.json({ msg: 'Hello, World!' });
});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
