const express = require('express');
const router = express.Router({});
const jwt = require('jsonwebtoken');
const check = require('../policies/check');
const toObjectID = require('mongoose').Types.ObjectId;


module.exports = (passport) => {
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
				id: req.user._id,
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


    //  Retrieves the current logged user score for each level
    //
    // 	GET /api/users/current/score
    // 	input-type: None
    //  output-type: JSON
    //
    //
    //  output-structure: {
    //  	levels: [
    // 			{
    // 				_id: Number,
    // 				score: Number
    // 			}
    // 		]
    //	}
    router.get('/current/score',
        passport.isLoggedIn,
        check.schema({
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.users.getScorePerLevels(req.user._id, req.data.language, (err, levels) => {
                if (err) {
                    return next(err);
                }

                res.status(200);
                res.json({
                    levels: levels
                });
            });
        });


    //  Save word test results
    //
    // 	POST /api/users/current/word_result
    // 	input-type: JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //		results: [
    //          {
    //              word: String,
    //              value: Boolean
    //          }
    //      ]
    //	}
    //
    //  output-structure: {
    //  	done: Boolean
    //	}
    router.post('/current/word_result',
        passport.isLoggedIn,
        check.schema({
            'results.*.word': {
                exists: true,
                errorMessage: 'word parameter not provided',
                in: 'body',
                custom: { options: (value) => typeof value === 'string' }
            },
            'results.*.value': {
                exists: true,
                errorMessage: 'value parameter not provided',
                in: 'body',
                custom: { options: (value) => typeof value === 'boolean' }
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.users.wordResults[req.data.language].saveResult(req.data.results, req.user._id, (err, result) => {
                if (err) {
                    return next(err);
                }

                res.status(200);
                res.json({
                    done: true,
                    result: result
                });
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
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
		}),
		(req, res, next) => {
			req.models.users.getWordsPerDay(req.user._id, req.data.language, parseInt(req.data.limit), (err, result) => {
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
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
		(req, res, next) => {
			req.models.users.getNewWordsPerDay(req.user._id, req.data.language, req.data.limit, (err, result) => {
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
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
		(req, res, next) => {
			req.models.users.getRecentNewWords(req.user._id, req.data.language, req.data.limit, (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					words: result
				});
			});
		});


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
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
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

            req.models.users.addWords(words, req.user._id, req.data.language, (err, result) => {
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
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            const words = req.data.words
                .map((word) => {
                    return word.toLowerCase();
                })
                .filter((word) => {
                    return word !== ''
                });

            req.models.users.addWords(words, req.data.uid, req.data.language, (err, result) => {
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


    //  Saves a reading feedback for a user and a text
    //
    // 	POST /api/users/current/feedback
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	feedback: String,
    //      uri: String,
    //      dataset: String,
    //      language: String
    //	}
    //
    //  output-structure: {
    //  	success: Boolean
    //	}
    router.post('/current/feedback',
        passport.isLoggedIn,
        check.schema({
            feedback: {
                in: 'body',
                errorMessage: 'feedback parameter provided is incorrect',
                custom: { options: (value) => ['easy', 'medium', 'hard'].includes(value) }
            },
            uri: {
                in: 'body',
                errorMessage: 'uri parameter provided is incorrect'
            },
            dataset: {
                in: 'body',
                errorMessage: 'dataset parameter provided is incorrect'
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.feedbacks.saveFeedback(
                req.user._id,
                req.data.uri,
                req.data.feedback,
                req.data.dataset,
                req.data.language,
                (err) => {
                    if (err) {
                        return next(err);
                    }

                    res.status(200);
                    res.json({
                        success: true
                    });
                })
        });


	router.get('/quiz',
        passport.isLoggedIn,
        check.schema({
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
	        req.models.users.getQuiz(req.data.language, (err, result) => {
	            if (err) {
	                return next(err);
                }

                res.status(200);
                res.json(result);
            });
        });

	return router;
};