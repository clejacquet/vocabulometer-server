const request = require('request');
const fs = require('fs');
const path = require('path');
const async = require('async');

const sourceDir = [
    '../../../../doc/texts/bbc/business',
    '../../../../doc/texts/bbc/entertainment',
    '../../../../doc/texts/bbc/politics',
    '../../../../doc/texts/bbc/sport',
    '../../../../doc/texts/bbc/tech',
];

const CHUNK_SIZE = 10;

const tasks = sourceDir.map((dir) => {
    return cb => {
        fs.readdir(dir, (err, files) => {
            async.map(files, (file, cb2) => {
                fs.readFile(path.join(dir, file), 'utf8', (err, data) => {
                    if (err) {
                        cb2(err);
                    }

                    const lines = data.split('\n\n');
                    const title = lines.splice(0, 1)[0];
                    const text = lines.join('\n');

                    cb2(null, {
                        title: title,
                        body: text,
                        source: 'BBC'
                    });
                });
            }, cb);
        });
    };
});

async.parallel(tasks, (err, result) => {
    if (err) {
        return console.error(err);
    }

    const texts = [].concat.apply([], result);

    const textChunks = texts.reduce((acc, text) => {
        if (acc[acc.length - 1].length >= CHUNK_SIZE) {
            acc.push([]);
        }
        acc[acc.length - 1].push(text);
        return acc;
    }, [[]]);

    console.log('Sending ' + textChunks.length + ' chunk(s) of ' + CHUNK_SIZE + ' texts!');

    const chunkTasks = textChunks.map((textChunk, i) => {
        return cb => {
            const options = {
                url: 'http://localhost:4100/api/texts',
                json: { texts: textChunk },
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IkNsw6ltZW50IiwiaWF0IjoxNTI2NTMxNzI1LCJleHAiOjE1MjcxMzY1MjV9.QG_IomhnWZq56zFYpqML-BDk2tfTwCiLNSVFNgbjZxc'
                }
            };

            request.post(options, (err, response, body) => {
                if (err) {
                    cb(err);
                } else if (!(response.statusCode >= 200 && response.statusCode < 300)) {
                    cb(body);
                } else {
                    console.log('Chunk ' + (i + 1) + ' / ' + textChunks.length + ' sent');
                    cb(null);
                }
            });
        }
    });


    async.series(chunkTasks, (err, result) => {
        if (err) {
            return console.error(err);
        }

        console.log('Success');
    });
});