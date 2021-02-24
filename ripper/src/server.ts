import { exec, execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import * as process from 'process';
import { join } from 'path';

enum DriveStatus {
    Open = 'drive_open',
    Loading = 'drive_not_ready',
    Ready = 'drive_ready',
    Empty = 'drive_empty'
}

// function createIso(outputPath: string) {
//     // Call dd command
//     const dd = spawn('/bin/dd', ['if=', 'of']);
//     // If dd doesn't return data in 10s, kill it
//     const timeout = setTimeout(function(){
//         console.log('Command timed out...killing.');
//         dd.kill();
//     }, 10000);

//     dd.stdout.on('data', data => {
//         clearTimeout(timeout);
//         console.log(`stdout: ${data}`);
//     });

//     dd.stderr.on('data', data => {
//         clearTimeout(timeout);
//         console.log(`stderr: ${data}`);
//     });

//     dd.on('error', (error) => {
//         clearTimeout(timeout);
//         console.log(`error: ${error.message}`);
//     });

//     dd.on('close', code => {
//         clearTimeout(timeout);
//         console.log(`child process exited with code ${code}`);
//     });

//     return dd;
// };

// var volumeName = getVolumeId();

// volumeName.then(console.log, console.error);

// Drive status

function delay(ms: number): Promise<void> {
    return new Promise(function (resolve, _) {
        setTimeout(resolve, ms);
    });
}

function createIsoImage(outputPath: string, blockSize: number, volumeSize: number): Promise<boolean> {
    return new Promise(function (resolve, reject) {
        const device = '/dev/sr0';

        // Open VLC for a short amount of time to allow access to the DVD
        execSync(`cvlc --run-time 6 --start-time 16 ${device} vlc://quit`);

        // Call dd command
        const dd = spawn('/bin/dd', [`if=${device}`, `of=${outputPath}`, `bs=${blockSize}`, `count=${volumeSize}`]);

        // If dd doesn't return data in 10s, kill it
        const timeout = setTimeout(function () {
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
            reject(error);
        });

        dd.on('close', code => {
            clearTimeout(timeout);
            console.log(`child process exited with code ${code}`);
            resolve(code === 0);
        });
    });
}

function getDriveStatus(device: string = null): Promise<DriveStatus> {
    return new Promise<DriveStatus>(function (resolve, reject) {
        exec(`setcd -i ${device || '/dev/sr0'}`, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }

            const status = stdout || '';

            if (status.indexOf('CD tray is open') !== -1) {
                resolve(DriveStatus.Open);
            } else if (status.indexOf('Drive is not ready') !== -1) {
                resolve(DriveStatus.Loading);
            } else if (status.indexOf('Disc found in drive') !== -1) {
                resolve(DriveStatus.Ready);
            } else if (status.indexOf('No disc is inserted') !== -1) {
                resolve(DriveStatus.Empty);
            } else {
                reject(new Error(`Unrecognized drive status: ${status}`));
            }
        });
    });
}

function getVolumeLogicalBlockSize(): Promise<number> {
    return new Promise(function (resolve, reject) {
        const filter = 'Logical block size is:';
        exec(`isoinfo -d -i /dev/sr0 | grep "${filter}"`, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }

            var size = parseInt((stdout || '').replace(filter, '').trim(), 10);

            resolve(size);
        });
    });
}

function getVolumeName(): Promise<string> {
    return new Promise(function (resolve, reject) {
        const filter = 'Volume id:';
        exec(`isoinfo -d -i /dev/sr0 | grep "${filter}"`, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }

            var name = (stdout || '').replace(filter, '').trim();

            resolve(name);
        });
    });
}

function getVolumeSize(): Promise<number> {
    return new Promise(function (resolve, reject) {
        const filter = 'Volume size is:';
        exec(`isoinfo -d -i /dev/sr0 | grep "${filter}"`, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }

            var size = parseInt((stdout || '').replace(filter, '').trim(), 10);

            resolve(size);
        });
    });
}

function openDrive(): Promise<void> {
    return new Promise(function (resolve, reject) {
        exec('eject', function (err, _, __) {
            if (err) {
                reject(err);
            }

            resolve();
        });
    });
}

function waitForDrive(): Promise<void> {
    const delay = 5000;

    return new Promise(function (resolve, reject) {
        let running = false;
        var interval = setInterval(function () {
            if (running) return;

            running = true;
            getDriveStatus()
                .then((status) => {
                    if (status == DriveStatus.Ready) {
                        clearInterval(interval);
                        resolve();
                    }
                })
                .catch(reject)
                .finally(() => {
                    running = false;
                });
        }, delay);
    });
}

async function runProgram(): Promise<void> {
    const outputDir = '/data/iso';

    var exit = false;

    process.on('SIGINT', function () {
        console.log('Exiting...please wait.');
        exit = true;
    });

    // Create output folder if it doesn't exist
    if (!existsSync(outputDir)) {
        console.log('Creating output directory.');
        mkdirSync(outputDir);
    }

    let attempt = 0;

    while (!exit) {
        try {
            await waitForDrive();
            console.log('Drive is ready for ripping.');

            const blockSize = await getVolumeLogicalBlockSize();
            const volumeName = await getVolumeName();
            const volumeSize = await getVolumeSize();
            const outputPath = join(outputDir, `${volumeName}.iso`);
            console.log(`Creating ISO at: '${outputPath}'.`);

            const success = await createIsoImage(outputPath, blockSize, volumeSize);
            if (success) {
                console.log(`Success: Finished creating ISO.`);
            } else {
                console.log(`Finished creating ISO.`);
            }
    
            // TODO: Notify other process of ISO image

            console.log('Ejecting DVD drive.');
            await openDrive();
        } catch (error) {
            console.error(error);
            exit = true;
        }

        await delay(30000);
    }
}

runProgram();