const fs = require('fs');
const parse = require('./ext/parse');
const winston = require('winston');
const async = require('async');
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
const TOKEN_DIR = '.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

function srt2text(srt) {
    try {
        return parse(srt)
            .map(srt => srt.text)
            .join('. ')
            .replace(/\r?\n/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\*[^*]*\*/g, '')
            .replace(/([!?.])\./g, "$1 ")
            .replace(/ + /g, ' ')
            .replace(/ +\./g, '.');
    } catch (e) {
        console.error(e);
        return ''
    }
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} tokens The token to store to disk.
 * @param {Function} cb
 */
function storeToken(tokens, cb) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            return cb(err);
        }
    }

    fs.readFile(TOKEN_PATH, 'utf8', (err, file) => {
        let toWriteTokens;
        if (!err) {
            toWriteTokens = JSON.parse(file);
            Object.keys(tokens).forEach((key) => toWriteTokens[key] = tokens[key]);
        } else {
            toWriteTokens = tokens;
        }

        fs.writeFile(TOKEN_PATH, JSON.stringify(toWriteTokens), (err) => {
            if (err) {
                return cb(err);
            }
            console.log('Token stored to ' + TOKEN_PATH);
            cb();
        });
    });
}

class YoutubeModel {
    constructor() {
        /**
         * auth
         * @type {google.auth.OAuth2} auth
         */
        this.auth = null;
        this.service = null;

        this.active = () => this.service !== null;
        this.authenticated = () => this.auth !== null;


        this.captions = {
            download: ((subtitleId, cb) => {
                if (!this.active() || !this.authenticated()) {
                    return cb({
                        status: 503,
                        error: 'Youtube service not active'
                    });
                }

                let done = false;
                this.service.captions.download({
                    id: subtitleId,
                    tfmt: 'srt'
                }, (err, response) => {
                    if (done) {
                        return;
                    }

                    done = true;

                    if (err) {
                        return cb(err);
                    }

                    cb(undefined, response.data);
                });
            }),

            list: ((videoId, cb) => {
                if (!this.active() || !this.authenticated()) {
                    return cb({
                        status: 503,
                        error: 'Youtube service not active'
                    });
                }

                this.service.captions.list({
                    videoId: videoId,
                    part: 'snippet'
                }, (err, response) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(undefined, response
                        .data
                        .items
                        .filter((item) => item.snippet.language === 'en')
                        .map((item) => ({
                            id: item.id,
                            trackKind: item.snippet.trackKind
                        }))
                    );
                });
            })
        };

        this.videos = {
            info: ((videoId, cb) => {
                if (!this.active() || !this.authenticated()) {
                    return cb({
                        status: 503,
                        error: 'Youtube service not active'
                    });
                }

                this.service.videos.list({
                    part: 'snippet',
                    id: videoId
                }, (err, response) => {
                    if (err) {
                        return cb(err);
                    }

                    if (response.data.pageInfo.totalResults < 1) {
                        return cb('No video with this ID exist');
                    }

                    const info = response.data.items[0].snippet;

                    return cb(null, {
                        title: info.title,
                        channel: info.channelTitle
                    });
                })
            }),
        }
    }

    content(uri, cb) {
        if (!this.active() || !this.authenticated()) {
            return cb({
                status: 503,
                error: 'Youtube service not active'
            });
        }

        const idMatch = /v=([^&]+)&?/.exec(uri);
        if (idMatch === null) {
            return cb('Invalid URI: ' + uri);
        }

        const id = idMatch[1];

        async.parallel([
            (cb1) => {
                async.seq(
                    (id, cb2) => {
                        this.captions.list(id, (err, list) => {
                            if (err) {
                                if (err.code === "403") {
                                    return cb2({
                                        status: 403,
                                        error: 'This video\'s owners do not allow us to retrieve the captions'
                                    });
                                }
                                return cb2(err);
                            }

                            cb2(undefined, list);
                        });
                    },
                    (list, cb2) => {
                        const asrSubtitles = list.filter((subtitle) => subtitle.trackKind === 'ASR');
                        const standardSubtitles = list.filter((subtitle) => subtitle.trackKind === 'standard');

                        if (standardSubtitles.length > 0) {
                            cb2(null, standardSubtitles[0].id);
                        } else if (asrSubtitles.length > 0) {
                            cb2(null, asrSubtitles[0].id);
                        } else {
                            cb2({
                                status: 400,
                                error: 'No english subtitles for this video'
                            });
                        }
                    },
                    (subId, cb2) => {
                        this.captions.download(subId, (err, subtitles) => {
                            if (err) {
                                if (err.code === "403") {
                                    return cb2({
                                        status: 403,
                                        error: 'This video\'s owners do not allow us to retrieve the captions'
                                    });
                                }
                                return cb2(err);
                            }

                            cb2(undefined, subtitles);
                        });
                    }
                )(id, cb1);
            },
            (cb1) => this.videos.info(id, cb1)
        ], (err, results) => {
            if (err) {
                return cb(err);
            }

            const srt = results[0];
            const info = results[1];

            const text = srt2text(srt);
            const title = info.channel + ' - ' + info.title;

            cb(undefined, {
                text: text,
                title: title
            });
        });
    }

    saveClientSecret(credentials, cb) {
        fs.writeFile('client_secret.json', JSON.stringify(credentials), cb);
    }

    authenticate(redirectUri, cb) {
        fs.readFile('client_secret.json', (err, content) => {
            if (err) {
                return cb(undefined, false);
            }

            const credentials = JSON.parse(content);

            const clientSecret = credentials.web.client_secret;
            const clientId = credentials.web.client_id;

            if (!credentials.web.redirect_uris.includes(redirectUri)) {
                return cb({
                    status: 400,
                    error: 'Provided redirectUri is invalid'
                });
            }

            this.auth = new OAuth2(clientId, clientSecret, redirectUri);

            cb(undefined, true);
        });
    }

    activate(cb) {
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) {
                winston.log('info', 'Could not automatically activate Youtube API. Please refer to an admin');
                return cb(undefined, false);
            }

            this._setActive(JSON.parse(token), cb);
        });
    }

    getAuthUrl() {
        return this.auth.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
    }

    processAccessCode(authCode, cb) {
        this.auth.getToken(authCode, (err, tokens) => {
            if (err) {
                return cb(err);
            }

            this._setActive(tokens, cb);
            storeToken(tokens, () => {});
        });
    }

    _setActive(tokens, cb) {
        this.auth.setCredentials(tokens);

        this.auth.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
                storeToken(tokens, () => {
                });
                this.auth.setCredentials({
                    refresh_token: tokens.refresh_token
                });
            }
        });

        this.auth.apiKey = 'AIzaSyDOQLB0bV_JjN2kgphLl9X5zb4FK6vDB9M';

        this.service = google.youtube({
            version: 'v3',
            auth: this.auth
        });

        cb();
    }
}

module.exports = new YoutubeModel();