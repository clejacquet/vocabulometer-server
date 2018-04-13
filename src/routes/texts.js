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
		skip: skip,
		limit: limit
	}, cb);
}

module.exports = (passport) => {
	router.get('/', passport.isLoggedIn, (req, res, next) => {
		const page = parseInt(req.query.page);

		req.models.texts.count((err, count) => {
			if (err) {
				return next(err);
			}

			const lastPage = Math.ceil(count / 20) - 1;

			getTextOnPage(req.models.texts, page, (err, result) => {
				if (err) {
					return next(err);
				}

				res.status(200);
				res.json({
					lastPage: lastPage,
					texts: result
				});
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
					lastPage: page,
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

	router.get('/:id', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.findOne({ _id: req.params.id }, (err, result) => {
			if (err) {
				return next(err);
			}

			if (!result) {
				return next(new Error('Not Found'));
			}

			const text = result.toObject().text;

			res.status(200);
			res.json({
				body: text.body,
				title: text.title
			});
		});
	});

	router.post('/', (req, res, next) => {
		req.models.texts.loadAndCreateTexts(req.body.texts, (err, text) => {
			if (err) {
				return next(err);
			}
			res.json(text);
		});
	});

	return router;
};