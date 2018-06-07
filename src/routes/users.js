const express = require('express');
const router = express.Router({});
const jwt = require('jsonwebtoken');
const check = require('../policies/check');
const toObjectID = require('mongoose').Types.ObjectId;


module.exports = (passport) => {
    //  Save a list of words for the user currently logged
    //
    // 	POST /api/users/current/word
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	words: String[]
    //	}
    //
    //  output-structure: {
    //  	success: Boolean
    //	}
    router.post('/current/word',
        passport.isLoggedIn,
        check.schema({
            words: {
                in: 'body',
                errorMessage: 'words list parameter missing or incorrect',
                exists: true,
                isArray: true
            },
            'words.*': {
                in: 'body',
                sanitizer: value => value.toLowerCase()
            }
        }),
        (req, res, next) => {
            const words = req.data.words
                .map((word) => {
                    return word.replace(/[^a-zA-Z0-9-']/g, "").toLowerCase();
                })
                .filter((word) => {
                    return word !== ''
                });

            req.models.users.addWords(words, req.user._id, (err, result) => {
                if (err) {
                    return next(err);
                }

                if (!result) {
                    res.status(404);
                    return res.json({
                        error: 'No user with provided id exists (id: \'' + req.data.uid + '\')'
                    });
                }

                res.status(201);
                res.json({
                    status: 'success'
                });
            });
        });

    //  Save a list of words for the currently logged user
    //
    // 	POST /api/users/:uid/word
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	words: String[]
    //	}
    //
    //  output-structure: {
    //  	success: Boolean
    //	}
	router.post('/:uid/word',
        check.schema({
            words: {
                in: 'body',
                errorMessage: 'words list parameter missing or incorrect',
                exists: true,
                isArray: true
            },
            'words.*': {
                in: 'body',
                sanitizer: value => value.toLowerCase()
            },
            uid: {
                in: 'params',
                errorMessage: 'uid parameter provided is incorrect',
                custom: { options: (value) => { try { return toObjectID(value); } catch (e) { return false } } },
                sanitizer: value => toObjectID(value)
            }
        }),
        (req, res, next) => {
            const words = req.data.words
                .map((word) => {
                    return word.replace(/[^a-zA-Z0-9-']/g, "").toLowerCase();
                })
                .filter((word) => {
                    return word !== ''
                });

            req.models.users.addWords(words, req.data.uid, (err, result) => {
                if (err) {
                    return next(err);
                }

                if (!result) {
                    res.status(404);
                    return res.json({
                        error: 'No user with provided id exists (id: \'' + req.data.uid + '\')'
                    });
                }

                res.status(201);
                res.json({
                    status: 'success'
                });
            });
	    });


    //  Authenticate the user with a pair username / password
    //
    // 	POST /api/users/auth/local
    // 	input-type: body, JSON
    //  output-type: JSON
	//
    //  input-structure: {
	//  	username: String,
	//  	password: String
	//	}
	//
    //  output-structure: {
    //  	user: {
    // 			name: String,
    // 			_id: String
    // 		},
	//  	token: String
    //	}
	router.post('/auth/local',
		passport.authenticate('local', { session: false }),
		(req, res, next) => {
			req.token = jwt.sign({
				id: req.user.name,
			}, 'efe5s3fs5f4e5s5c55e5segrgrg2s3', {
				expiresIn: '7d'
			});
			next();
		},
		(req, res) => {
			res.json({
				user: req.user,
				token: req.token
			});
		});


    //  Log out the user
    //
    // 	POST /api/users/auth/logout
    // 	input-type: none
    //  output-type: none
	router.post('/auth/logout', (req, res) => {
		req.logOut();
		res.status(200).end();
	});


    //  Retrieves the current logged user ID
    //
    // 	GET /api/users/current
    // 	input-type: None
    //  output-type: JSON
    //
    //  output-structure: {
    //  	user: {
	// 			name: String,
	// 			_id: String
	// 		}
    //	}
    router.get('/current',
		passport.isLoggedIn,
		(req, res) => {
			res.json({
				user: req.user
			});
		});


    //  Retrieves the current logged user ID count of read words every day since the two last weeks
    //
    // 	GET /api/users/current/stats/words_read
    // 	input-type: url_encoded
    //  output-type: JSON
	//
	//  input-structure: {
	//		limit: Number
	//	}
    //
    //  output-structure: {
    //  	days: [
	// 			{
    // 				_id: Date,
    // 				count: Number
    // 			}
	// 		]
    //	}
	router.get('/current/stats/words_read',
		passport.isLoggedIn,
        check.schema({
            limit: {
                in: 'query',
                errorMessage: 'limit parameter provided is incorrect',
                isInt: true,
                custom: { options: (value) => parseInt(value) > 0 },
                sanitizer: value => parseInt(value)
            }
		}),
		(req, res, next) => {
			req.models.users.getWordsPerDay(req.user._id, parseInt(req.data.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					days: result
				});
			});
	});

    //  Retrieves the current logged user ID count of new read words every day (maximum day count retrieved = limit)
    //
    // 	GET /api/users/current/stats/new_words_read
    // 	input-type: url_encoded
    //  output-type: JSON
    //
    //  input-structure: {
    //		limit: Number
    //	}
    //
    //  output-structure: {
    //  	days: [
    // 			{
    // 				_id: Date,
    // 				count: Number
    // 			}
    // 		]
    //	}
	router.get('/current/stats/new_words_read',
		passport.isLoggedIn,
        check.schema({
            limit: {
                in: 'query',
                errorMessage: 'limit parameter provided is incorrect',
                isInt: true,
                custom: { options: (value) => parseInt(value) > 0 },
                sanitizer: value => parseInt(value)
            }
        }),
		(req, res, next) => {
			req.models.users.getNewWordsPerDay(req.user._id, req.data.limit, (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					days: result
				});
			});
	});


    //  Retrieves the new recently read words by the current logged user (maximum retrieved = limit)
    //
    // 	GET /api/users/current/stats/new_recent_words_read
    // 	input-type: url_encoded
    //  output-type: JSON
    //
    //  input-structure: {
    //		limit: Number
    //	}
    //
    //  output-structure: {
    //  	words: [
    // 			{
    // 				_id: String,
    // 				time: Date
    // 			}
    // 		]
    //	}
	router.get('/current/stats/new_recent_words_read',
		passport.isLoggedIn,
        check.schema({
            limit: {
                in: 'query',
                errorMessage: 'limit parameter provided is incorrect',
                isInt: true,
                custom: { options: (value) => parseInt(value) > 0 },
                sanitizer: value => parseInt(value)
            }
        }),
		(req, res, next) => {
			req.models.users.getRecentNewWords(req.user._id, req.data.limit, (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					words: result
				});
			});
		});


	router.get('/current/quiz',
        passport.isLoggedIn,
        (req, res, next) => {
	        req.models.users.getQuiz((err, result) => {
	            if (err) {
	                return next(err);
                }

                res.status(200);
                res.json(result);
            });
        });


    //  Save words list according to the quiz result provided
    //
    // 	POST /api/users/current/quiz_result
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //		result: String // among the following values: 'Z', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
    //	}
    //
    //  output-structure: {
    //		success: Boolean
    // }
    router.post('/current/quiz_result',
        passport.isLoggedIn,
        check.schema({
            result: {
                in: 'body',
                errorMessage: 'result parameter provided is incorrect',
                exists: true,
                custom: { options: (value) => ['Z', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(value) }
            }
        }),
        (req, res, next) => {
            const cefr210 = {
                'Z':  0,
                'A1': 1,
                'A2': 1,
                'B1': 2,
                'B2': 3,
                'C1': 6,
                'C2': 10
            };

            const level = cefr210[req.data.result];

            req.models.users.saveWordsFromQuizResult(req.user._id, level, (err) => {
                if (err) {
                    return next(err);
                }

                res.status(201);
                res.json({
                    status: 'success'
                });
            });
        });

	return router;
};