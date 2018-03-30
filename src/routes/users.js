const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');


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

	router.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));

	router.get('/auth/google/callback',
		passport.authenticate('google', { failureRedirect: '/login' }),
		(req, res) => {
			res.redirect('/');
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

	router.get('/current',
		passport.isLoggedIn,
		(req, res) => {
			res.json({
				user: req.user
			});
		});

	router.get('/current/stats/words_read',
		passport.isLoggedIn,
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

	router.get('/current/stats/new_words_read',
		passport.isLoggedIn,
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

	router.get('/current/stats/new_recent_words_read',
		passport.isLoggedIn,
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

	router.get('/current/hard_texts',
		passport.isLoggedIn,
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

	router.get('/current/easy_texts',
		passport.isLoggedIn,
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

	router.get('/current/recommend',
		passport.isLoggedIn,
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

	router.get('/:uid/stats/words_read', (req, res, next) => {
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

	router.get('/:uid/stats/new_words_read', (req, res, next) => {
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

	router.get('/:uid/stats/new_recent_words_read', (req, res, next) => {
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

	router.get('/:uid/hard_texts', (req, res, next) => {
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

	router.get('/:uid/easy_texts', (req, res, next) => {
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

	router.get('/:uid/recommend', (req, res, next) => {
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


	return router;
};