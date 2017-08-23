const express = require('express');
const router = express.Router();
const fs = require('fs');

function getTextOnPage(model, page, cb) {
	let skip, limit;
	if (!isNaN(page)) {
		skip = page * 20;
		limit = 20;
	}

	model.find({}, ['text.title'], {
		sort: {
			'text.title': 1
		},
		skip: skip,
		limit: limit
	}, cb);
}

module.exports = (passport) => {
	router.get('/', passport.isLoggedIn, (req, res, next) => {
		const page = parseInt(req.query.page);
		getTextOnPage(req.models.texts, page, (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json({
				texts: result
			});
		});
	});

	router.get('/last', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.count((err2, count) => {
			if (err2) {
				return next(err2);
			}

			const page = Math.ceil(count / 20) - 1;
			getTextOnPage(req.models.texts, page, (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					page: page,
					texts: result
				});
			});
		});
	});

	router.get('/sample', (req, res, next) => {
		req.models.texts.getSample((err, sample) => {
			if (err) {
				return next(err);
			}

			res.json({
				sample: sample
			});
		});
	});

	router.get('/:id', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.findOne({ _id: req.params.id }, (err, result) => {
			if (err) {
				return next(err);
			}

			if (!result) {
				return next(new Error('Not Found'));
			}

			res.status(200);
			res.json({
				text: result.text
			});
		});
	});

	router.put('/:id/text', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.loadAndModifyText(req.params.id, req.body.text, (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json(result);
		})
	});

	router.put('/:id/title', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.modifyTitle(req.params.id, req.body.title, (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json(result);
		})
	});

	router.delete('/:id', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.deleteOne({ _id: req.params.id }, (err, result) => {
			if (err) {
				return next(err);
			}

			res.status(200);
			res.json(result);
		});
	});

	router.post('/', (req, res, next) => {
		req.models.texts.loadAndCreateText(req.body.title, req.body.text, (err, results) => {
			if (err) {
				return next(err);
			}
			res.json({
				result: results.map(paragraph => paragraph.map(token => token.value)),
				text: results
			});
		});
	});

	return router;
};