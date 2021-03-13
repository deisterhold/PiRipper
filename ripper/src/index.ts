import { Ripper } from './server';
import { app } from './app';

const port = process.env.port || 8080;
const ripper = new Ripper();

app.listen(port, function () {
    console.log('Example app listening on port ', port);
});

Promise.all([ripper.run()]);
