import { exec, spawn } from 'child_process';
import { platform } from 'os';

let udev: any;
if (platform() == 'linux'){
    udev = require('udev');
}

function getDriveStatus(device: string = null) {
    const OPEN = 'drive_open';
    const EMPTY = 'drive_empty';
    const LOADING = 'drive_not_ready';
    const READY = 'drive_ready';

    return new Promise(function(resolve, reject) {
        exec(`setcd -i ${device || '/dev/sr0'}`, function(err, stdout, stderr) {
            if (err) {
                console.error(stderr);
                reject(err);
            }
            
            stdout = stdout || '';

            if (stdout.indexOf('CD tray is open') !== -1){
                resolve(OPEN);
            } else if (stdout.indexOf('Drive is not ready') !== -1){
                resolve(LOADING);
            } else if (stdout.indexOf('Disc found in drive') !== -1){
                resolve(READY);
            } else if (stdout.indexOf('No disc is inserted') !== -1){
                resolve(EMPTY);
            } else {
                resolve(null);
            }

            resolve(stdout);
        });
    });
}

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

// Drive status
var driveCheck = setInterval(function () {
    var driveStat = getDriveStatus();

    driveStat.then(console.log, console.error);
}, 30000);

// Lists every device in the system.
console.log(udev.list()); // this is a long list :)

// Monitor events on the input subsystem until a device is added.
var monitor = udev.monitor("input");

monitor.on('add', function(device: any) {
    console.log('added ' + device);
    monitor.close() // this closes the monitor
});

monitor.on('remove', function (device: any) {
    console.log('removed ' + device);
});

monitor.on('change', function (device: any) {
    console.log('changed ' + device);
});