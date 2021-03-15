import express from 'express';

export const app = express();

app.get('/', (req, res) => {
    res.sendFile(__dirname + 'html/index.html');
});

app.get('/api', (req, res) => {
    res.json({ msg: 'Hello, World!' });
});
