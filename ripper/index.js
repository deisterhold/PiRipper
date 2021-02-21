const { exec, spawn } = require('child_process');
const { stderr } = require('process');


function getVolumeId() {
    var promise = new Promise(function(resolve, reject) {
        exec('ls;isoinfo -d -i /dev/sr0 | grep "Volume id"', function(err, stdout, stderr) {
            if (err) {
                console.error(stderr);
                reject(err);
            }

            resolve(stdout);
        });
    });

    return promise;
}

function createIso() {
    exec('');
    // Call dd command
    const dd = spawn('/bin/dd', ['if=', 'of']);
    // If dd doesn't return data in 10s, kill it
    const timeout = setTimeout(function(){
        console.log('Command timed out...killing.');
        dd.kill();
    }, 10000);

    dd.stdout.on('data', data => {
        clearTimeout(timeout);
        console.log(`stdout: ${data}`);
    });
    
    dd.stderr.on('data', data => {
        clearTimeout(timeout);
        console.log(`stderr: ${data}`);
    });
    
    dd.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`error: ${error.message}`);
    });
    
    dd.on('close', code => {
        clearTimeout(timeout);
        console.log(`child process exited with code ${code}`);
    });

    return dd;
};

var volumeName = await getVolumeId();

console.log(volumeName);
