import { exec, execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import * as process from 'process';
import { join } from 'path';

enum DriveStatus {
    Open = 'drive_open',
    Loading = 'drive_not_ready',
    Ready = 'drive_ready',
    Empty = 'drive_empty'
}

function delay(ms: number): Promise<void> {
    return new Promise(function (resolve, _) {
        setTimeout(resolve, ms);
    });
}

function createMpg(outputPath: string): Promise<boolean> {
    return new Promise(function (resolve, reject) {
        console.log('Starting mplayer...');
        const mplayer = spawn('/usr/bin/mplayer', ['-dumpstream', 'dvd://', '-nocache', '-noidx', '-dumpfile', outputPath]);
             
        // If dd doesn't return data in 10s, kill it
        const timeout = setTimeout(function () {
            console.log('Command timed out...killing.');
            mplayer.kill();
        }, 30_000);

        mplayer.stdout.on('data', data => {
            clearTimeout(timeout);
            console.log(data);
        });

        mplayer.stderr.on('data', data => {
            clearTimeout(timeout);
            console.error(data);
        });

        mplayer.on('error', (error) => {
            clearTimeout(timeout);
            console.log(`mplayer error: ${error.message}`);
            reject(error);
        });

        mplayer.on('close', code => {
            clearTimeout(timeout);
            console.log(`mplayer exited with code ${code}`);
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
    const outputDir = '/data/mpg';

    var exit = false;

    // process.on('SIGINT', function () {
    //     console.log('Exiting...please wait.');
    //     exit = true;
    // });

    // Create output folder if it doesn't exist
    if (!existsSync(outputDir)) {
        console.log('Creating output directory.');
        mkdirSync(outputDir);
    }

    let attempt = 0;

    while (!exit) {
        exit = true;
        try {
            await waitForDrive();
            console.log('Drive is ready for ripping.');

            const volumeName = await getVolumeName();
            const outputPath = join(outputDir, `${volumeName}.mpg`);
            console.log(`Creating MPG at: '${outputPath}'.`);

            if (existsSync(outputPath)) {
                console.log('File already exists. Deleting...');
                unlinkSync(outputPath);
            }

            const success = await createMpg(outputPath);
            if (success) {
                console.log(`Success: Finished creating MPG.`);
                await delay(1000);
                // TODO: Notify other process of MPG image
                console.log('Ejecting DVD drive.');
                await openDrive();
            } else {
                console.log(`Failed: Finished creating MPG.`);
            }
        } catch (error) {
            console.error(error);
            exit = true;
        }

        await delay(30000);
    }
}

runProgram();