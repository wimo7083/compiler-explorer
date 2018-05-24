'use strict';

console.log('Loading function');

const aws = require('aws-sdk');
const fs = require('fs');
const s3 = new aws.S3({apiVersion: '2006-03-01'});
const child_process = require('child_process');

// TODO: proper logging
// TODO: code sharing with main project
// TODO: configurable key to unpack, and executable to run
// TODO: clean up directory after
// TODO: move as much code into non-lambda code as possible, share with local implementation, for testing.
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Get the object from the event and show its content type
    // const bucket = event.Records[0].s3.bucket.name;
    // const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    const bucket = "storage.godbolt.org";
    const key = "test.tar.gz";
    const params = {
        Bucket: bucket,
        Key: key
    };
    const tempDir = fs.mkdtempSync('/tmp/exec');
    const file = fs.createWriteStream('/tmp/test.tar.gz');
    file.on('close', () => {
        console.log('file gotten');  //prints, file created
        const ls = child_process.spawn('tar', ['zxf', '/tmp/test.tar.gz', '-C', tempDir]);
        ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        ls.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });

        ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            const execced = child_process.execFile(tempDir + '/test', [], {cwd: tempDir, timeout: 500},
                (error, stdout, stderr) => {
                    const response = {
                        statusCode: 200,
                        headers: {
                            "x-custom-header": "my custom header value"
                        },
                        body: JSON.stringify({
                            error: error,
                            stdout: stdout,
                            stderr: stderr
                        })
                    };
                    callback(null, response);
                });
        });
    });
    s3.getObject(params).createReadStream().on('error', function (err) {
        console.log(err);
    }).pipe(file);
};
