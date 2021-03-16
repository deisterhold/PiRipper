import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { app } from './app';

export const server = createServer(app);
const io = new SocketServer(server, {});

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
