import express from 'express';
import path from 'path';

export const app = express();

app.get('/', (req, res) => {
    const index = path.resolve(__dirname, '../html/index.html');

    res.sendFile(index);
});

app.get('/api', (req, res) => {
    res.json({ msg: 'Hello, World!' });
});