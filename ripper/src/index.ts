import { Ripper } from './ripper';
import { app } from './server';

const port = process.env.port || 80;
const ripper = new Ripper();

app.listen(port, function () {
    console.log('Example app listening on port ', port);
});

Promise.all([ripper.run()]);
