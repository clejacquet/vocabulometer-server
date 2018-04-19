const express = require('express');
const router = express.Router({});
const jwt = require('jsonwebtoken');
const utils = require('./routeUtils');
const winston = require('winston');
const checkParameter = require('../policies/check-parameter');


module.exports = (passport) => {
	router.post('/:uid/word', (req, res, next) => {
		const words = req.body.words || [req.body.word]
			.map((word) => {
				return word.replace(/[^a-zA-Z0-9-']/g, "").toLowerCase();
			})
			.filter((word) => {
				return word !== ''
			});

		req.models.users.addWords(words, req.params.uid, (err, result) => {
			if (err) {
				return next(err);
			}

			if (!result) {
				res.status(404);
				return res.json({
					error: 'No user with provided id exists (id: \'' + req.params.uid + '\')'
				});
			}

			res.status(201);
			res.json({
				status: 'success'
			});
		});
	});


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

	router.post('/auth/logout', (req, res, next) => {
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
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getWordsPerDay(req.user._id, parseInt(req.query.limit), (err, result) => {
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
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getNewWordsPerDay(req.user._id, parseInt(req.query.limit), (err, result) => {
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
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getRecentNewWords(req.user._id, parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					words: result
				});
			});
		});


    //  Retrieves some hard texts for the current logged user ID (maximum retrieved = limit)
    //
    // 	GET /api/users/current/hard_texts
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
	router.get('/current/hard_texts',
		passport.isLoggedIn,
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getHardTexts(req.user._id, parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					texts: result
				});
			});
		});


    //  Retrieves some easy texts for the current logged user ID (maximum retrieved = limit)
    //
    // 	GET /api/users/current/easy_texts
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
	router.get('/current/easy_texts',
		passport.isLoggedIn,
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getEasyTexts(req.user._id, parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					texts: result
				});
			});
		});


    //  Retrieves some easy texts for the current logged user ID (maximum retrieved = limit)
    //
    // 	GET /api/users/current/recommend
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
	router.get('/current/recommend',
		passport.isLoggedIn,
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
		req.models.scores.compute(req.models.toObjectID(req.user._id), parseInt(req.query.limit), (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json({
				texts: result
			});
		})
	});

	router.get('/:uid/similartexts', (req, res, next) => {
		req.models.users.getSimilarTexts(req.models.toObjectID(req.params.uid), (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json({
				texts: result
			});
		});
	});

	router.get('/:uid/stats/words_read',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getWordsPerDay(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					days: result
				});
			});
		});

	router.get('/:uid/stats/new_words_read',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getNewWordsPerDay(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					words: result
				});
			});
		});

	router.get('/:uid/stats/new_recent_words_read',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getRecentNewWords(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					words: result
				});
			});
		});

	router.get('/:uid/hard_texts',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getHardTexts(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					texts: result
				});
			});
		});

	router.get('/:uid/easy_texts',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.users.getEasyTexts(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					texts: result
				});
			});
		});

	router.get('/:uid/recommend',
        checkParameter.strictPositive('query', 'limit'),
		(req, res, next) => {
			req.models.scores.compute(req.models.toObjectID(req.params.uid), parseInt(req.query.limit), (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					texts: result
				});
			})
		});

	router.post('/test',
		checkParameter.body({
			text: {
				title: checkParameter.rules.string,
				year: checkParameter.rules.strictPositive
			}
		}), (req, res) => {
			res.json({
				status: 'success'
			});
		});


	return router;
};