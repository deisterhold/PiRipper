const { exec, spawn } = require('child_process');
var udev = require('udev');

function getVolumeId() {
    return new Promise(function(resolve, reject) {
        exec('isoinfo -d -i /dev/sr0 | grep "Volume id"', function(err, stdout, stderr) {
            if (err) {
                console.error(stderr);
                reject(err);
            }

            resolve(stdout);
        });
    });
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

// var volumeName = getVolumeId();

// volumeName.then(console.log, console.error);

// Lists every device in the system.
console.log(udev.list()); // this is a long list :)

// Monitor events on the input subsystem until a device is added.
var monitor = udev.monitor("input");
monitor.on('add', function (device) {
    console.log('added ' + device);
    monitor.close() // this closes the monitor
});
monitor.on('remove', function (device) {
    console.log('removed ' + device);
});
monitor.on('change', function (device) {
    console.log('changed ' + device);
});