import { exec, execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
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
    return new Promise(function(resolve, _) {
        setTimeout(resolve, ms);
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

function getVolumeName(): Promise<string> {
    return new Promise(function (resolve, reject) {
        exec('isoinfo -d -i /dev/sr0 | grep "Volume id"', function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }

            var name = (stdout || '').replace('Volume id: ', '').trim();

            resolve(name);
        });
    });
}

function openDrive(): Promise<void> {
    return new Promise(function (resolve, reject) {
        exec('eject', function (err, _, stderr) {
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

async function process(): Promise<void> {
    const outputDir = '/data/iso';

    var exit = false;

    // Create output folder if it doesn't exist
    if (!existsSync(outputDir)) {
        console.log('Creating output directory.');
        mkdirSync(outputDir);
    }

    while (!exit) {
        try {
            await waitForDrive();
            console.log('Drive is ready for ripping.');

            const volumeName = await getVolumeName();
            const outputPath = join(outputDir, `${volumeName}.iso`);

            console.log(`Creating ISO at: '${outputPath}'.`);
            
            // TODO: Create ISO image and send off for processing

            console.log('Ejecting DVD drive.');
            await openDrive();
        } catch (error) {
            console.error(error);
            exit = true;
        }

        await delay(30000);
    }
}

process();