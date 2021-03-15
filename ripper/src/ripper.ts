import { exec, spawn } from 'child_process';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { interval, from, Observable } from 'rxjs';
import { switchMapTo } from 'rxjs/operators';

export enum DriveStatus {
    Open = 'drive_open',
    Loading = 'drive_not_ready',
    Ready = 'drive_ready',
    Empty = 'drive_empty'
}

export class Ripper {
    public readonly driveStatus$: Observable<DriveStatus> = interval(5000).pipe(
        switchMapTo(from(this.getDriveStatus())),
    );

    constructor(
        private readonly device: string = '/dev/sr0',
        private readonly outputDirectory: string = '/data/mpg',
    ) {}

    public delay(ms: number): Promise<void> {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }
    
    public createMpg(outputPath: string): Promise<boolean> {
        return new Promise(function (resolve, reject) {
            console.log('Starting mplayer...');
            const mplayer = spawn('/usr/bin/mplayer', ['-dumpstream', 'dvd://', '-nocache', '-noidx', '-dumpfile', outputPath]);
    
            // If dd doesn't return data in 10s, kill it
            const timeout = setTimeout(function () {
                console.log('Command timed out...killing.');
                mplayer.kill();
            }, 30_000);
    
            mplayer.stdout.on('data', (data: Buffer | string) => {
                clearTimeout(timeout);
                if (Buffer.isBuffer(data)) {
                    console.log(data.toString('utf8'));
                } else {
                    console.log(data);
                }
            });
    
            mplayer.stderr.on('data', (data: Buffer | string) => {
                clearTimeout(timeout);
                if (Buffer.isBuffer(data)) {
                    console.log(data.toString('utf8'));
                } else {
                    console.log(data);
                }
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
    
    public getDriveStatus(): Promise<DriveStatus> {
        return new Promise<DriveStatus>(function (resolve, reject) {
            exec(`setcd -i ${this.device}`, function (err, stdout) {
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
    
    public getVolumeName(): Promise<string> {
        return new Promise(function (resolve, reject) {
            const filter = 'Volume id:';
            exec(`isoinfo -d -i ${this.device} | grep "${filter}"`, function (err, stdout) {
                if (err) {
                    reject(err);
                }
    
                const name = (stdout || '').replace(filter, '').trim();
    
                resolve(name);
            });
        });
    }
    
    public openDrive(): Promise<void> {
        return new Promise(function (resolve, reject) {
            exec('eject', function (err) {
                if (err) {
                    reject(err);
                }
    
                resolve();
            });
        });
    }
    
    public waitForDrive(): Promise<void> {
        const delay = 5000;
    
        return new Promise(function (resolve, reject) {
            let running = false;
            const interval = setInterval(function () {
                if (running) return;
    
                running = true;
                this.getDriveStatus()
                    .then((status: DriveStatus) => {
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

    public async run(): Promise<void> {
        let exit = false;

        // Create output folder if it doesn't exist
        if (!existsSync(this.outputDirectory)) {
            console.log('Creating output directory.');
            mkdirSync(this.outputDirectory);
        }

        while (!exit) {
            exit = true;
            try {
                await this.waitForDrive();
                console.log('Drive is ready for ripping.');

                const volumeName = await this.getVolumeName();
                const outputPath = join(this.outputDirectory, `${volumeName}.mpg`);
                console.log(`Creating MPG at: '${outputPath}'.`);

                if (existsSync(outputPath)) {
                    console.log('File already exists. Deleting...');
                    unlinkSync(outputPath);
                }

                const success = await this.createMpg(outputPath);
                if (success) {
                    console.log(`Success: Finished creating MPG.`);
                    await this.delay(1000);
                    // TODO: Notify other process of MPG image
                    console.log('Ejecting DVD drive.');
                    await this.openDrive();
                } else {
                    console.log(`Failed: Finished creating MPG.`);
                }
            } catch (error) {
                console.error(error);
                exit = true;
            }

            await this.delay(30000);
        }
    }
}
