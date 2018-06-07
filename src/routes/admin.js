const fs = require('fs');
const express = require('express');
const multer = require('multer');
const winston = require('winston');
const router = express.Router({});
const check = require('../policies/check');


module.exports = (passport) => {
    //  Returns the Auth URL for activating Youtube service
    //
    // 	POST /api/admin/launchYoutube
    // 	input-type: None
    //  output-type: JSON
    //
    //  output-structure: {
    //  	url: String
    //	}
    router.get('/youtubeAuthUrl',
        passport.isLoggedIn,
        (req, res) => {
            if (req.models.youtube.active()) {
                res.status(400);
                return res.json({
                    status: 'up',
                    result: 'Youtube service already active'
                });
            }

            if (!req.models.youtube.authenticated()) {
                res.status(400);
                return res.json({
                    status: 'unauthenticated',
                    result: 'Not authenticated to Youtube'
                });
            }

            const url = req.models.youtube.getAuthUrl();
            res.status(200);
            res.json({
                url: url
            });
        });


    //  Launch the Youtube service
    //
    // 	POST /api/admin/launchYoutube
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	authCode: String
    //	}
    //
    //  output-structure: {
    //  	url: String
    //	}
    router.post('/launchYoutube',
        passport.isLoggedIn,
        check.schema({
            authCode: {
                in: 'body',
                errorMessage: 'Auth token parameter missing',
                exists: true,
            }
        }),
        (req, res, next) => {
            if (req.models.youtube.active()) {
                return next({
                    status: 400,
                    error: {
                        state: 'up',
                        result: 'Youtube service already active'
                    },
                });
            }

            if (!req.models.youtube.authenticated()) {
                return next({
                    status: 400,
                    error: {
                        state: 'unauthenticated',
                        result: 'Not authenticated to Youtube'
                    },
                });
            }

            req.models.youtube.processAccessCode(req.data.authCode, (err) => {
                if (err) {
                    return next({
                        status: 400,
                        error: err.toString()
                    });
                }

                res.status(200);
                res.json({
                    result: ((req.models.youtube.active) ? 'up' : 'failure')
                });
            });
        });

    router.post('/credentials',
        passport.isLoggedIn,
        multer({ dest: '/tmp/'}).single('credentials'),
        (req, res, next) => {
            if (!req.file) {
                return next({
                    status: 400,
                    error: 'Please provide a file with the credentials'
                });
            }

            fs.readFile(req.file.path, 'utf8', (err, content) => {
                if (err) {
                    return next({
                        status: 400,
                        error: 'Please provide a file with the credentials'
                    });
                }

                const credentials = JSON.parse(content);
                req.models.youtube.saveClientSecret(credentials, (err) => {
                    if (err) {
                        return next(err);
                    }

                    req.models.youtube.authenticate(process.env.YT_REDIRECT_URI || 'http://vocabulometer.herokuapp.com/admin', (err, result) => {
                        if (err) {
                            return next(err);
                        }

                        if (result === false) {
                            winston.log('info', 'Cannot authenticate on Youtube API. Please check if "client_secret.json" file exists and is correct');
                        }

                        req.models.youtube.activate((err) => {
                            if (err) {
                                return next(err);
                            }

                            if (req.models.youtube.active()) {
                                return res.json({
                                    status: 'up'
                                });
                            }

                            if (req.models.youtube.authenticated()) {
                                return res.json({
                                    status: 'down'
                                });
                            }

                            return res.json({
                                status: 'unauthenticated'
                            });
                        });
                    })
                })
            })
        });


    //  Returns the status of the Youtube service
    //
    // 	GET /api/admin/youtubeState
    // 	input-type: None
    //  output-type: JSON
    //
    //  output-structure: {
    //  	status: String
    //	}
    router.get('/youtubeState', passport.isLoggedIn, (req, res) => {
        res.status(200);

        if (req.models.youtube.active()) {
            return res.json({
                status: 'up'
            });
        }

        if (req.models.youtube.authenticated()) {
            return res.json({
                status: 'down'
            });
        }

        return res.json({
            status: 'unauthenticated'
        });
    });


    return router;
};