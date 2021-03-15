import { Ripper } from './ripper';
import { server } from './server';

const device = process.env.device || '/dev/sr0'
const outputDirectory = process.env.outputDirectory || '/data/mpg'
const port = process.env.port || 80;
const ripper = new Ripper(device, outputDirectory);

server.listen(port, function () {
    console.log('Example app listening on port ', port);
});

Promise.all([ripper.run()]);
