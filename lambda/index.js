// Copyright (c) 2018, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

'use strict';

const props = require('../lib/properties');
props.initialize('config', ['defaults', 'lambda']);

const aws = require('aws-sdk');
const fs = require('fs');
const s3 = new aws.S3({apiVersion: '2006-03-01'});
const exec = require('../lib/exec');

function fetchFromS3(bucket, key, localName) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(localName)) {
            resolve(localName);
            return;
        }
        const tempFile = localName + ".tmp";
        const file = fs.createWriteStream(tempFile);
        file.on('close', () => {
            fs.renameSync(tempFile, localName);
            resolve(localName);
        });
        s3.getObject({
            Bucket: bucket,
            Key: key
        }).createReadStream().on('error', function (err) {
            reject(err);
        }).pipe(file);
    });
}

// TODO: proper logging
// TODO: code sharing with main project
// TODO: configurable key to unpack, and executable to run
// TODO: clean up directory after
// TODO: move as much code into non-lambda code as possible, share with local implementation, for testing.
// TODO: restrict the IAM policy to only get s3 objects in the storage bucket
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const bucket = "storage.godbolt.org"; // TODO get from config
    const sha = event.pathParameters.sha; // TODO sanitize and check sha
    const key = `cache/binary/${sha}.tar.gz`; // TODO get from config
    const tempDir = fs.mkdtempSync('/tmp/exec');
    const localFile = `/tmp/${sha}`;
    fetchFromS3(bucket, key, localFile)
        .then(() => exec.execute('tar', ['zxf', localFile, '-C', tempDir]))
        .then(() => exec.execute(tempDir + '/test', [], {customCwd: tempDir, timeoutMs: 5000}))
        .then((result) => {
            const response = {
                statusCode: 200,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(result)
            };
            callback(null, response);
        })
        .catch((err) => {
            console.log(`Zoiks ${err} ::: ${err.code}`);
            if (err.code === "AccessDenied") {
                callback(null, {statusCode: 404, headers: {}, body: "Not found"});
            } else {
                callback(err);
            }
        });
};