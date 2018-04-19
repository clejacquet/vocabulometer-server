const express = require('express');
const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});
const utils = require('./routeUtils');
const checkParameter = require('../policies/check-parameter');


module.exports = (passport) => {
    //  Retrieves the specified text
    //
    // 	GET /api/texts/:id
    // 	input-type: None
    //  output-type: JSON
	//
	//  output-structure: {
	//  	body: [
	//   		{
	//				interWords: String[],
	//				words: [
	// 					{
	// 						"raw": String,
	// 						"lemma": String | OPTIONAL
	// 					}
	// 				]
	//			}
	//		]
	//	}
	router.get('/:id', passport.isLoggedIn, (req, res, next) => {
        const check = utils.checkId(
            req,
            'GET /api/texts/:id',
            (id) => '\'' + id + '\' is not a valid value for \':id\' query parameter'
        );

        if (!check.success) {
            return next(check.error);
        }

	    const id = check.id;

		req.models.texts.findOne({ _id: id }, (err, result) => {
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


	//  Adds a list of texts to the database
	//
	// 	POST /api/texts
	// 	input-type: body, JSON
	//  output-type: JSON
	//
	// 	input-structure: [
	// 		{
	// 			title: String,
	// 			body: String,
	// 			source: String
	// 		}
	// 	]
	//
    // 	output-structure: [
    // 		{
    // 			text: {
	// 				words: String[],
    // 				title: String,
    // 				source: String,
	//				body: [
	//					{
	//						interWords: String[],
	//						words: [
	//							{
	//								"raw": String,
	//								"lemma": String | OPTIONAL
	//							}
	//						]
	//					}
	//				]
	//			},
	//			_id: String
    // 		}
    // 	]
	router.post('/', passport.isLoggedIn, (req, res, next) => {
		req.models.texts.loadAndCreateTexts(req.body.texts, (err, texts) => {
			if (err) {
				return next(err);
			}
			res.json(texts);
		});
	});


    //  Modifies the specified text's body
    //
    // 	PUT /api/texts/:id/text
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	text: String
    //  }
    //
    //	output-structure: {
    //		success: Boolean
    //  }
    router.put('/:id/text', passport.isLoggedIn, (req, res, next) => {
        req.models.texts.loadAndModifyText(req.params.id, req.body.text, (err) => {
            if (err) {
                return next(err);
            }

            res.status(200);
            res.json({
                success: true
            });
        })
    });


    //  Modifies the specified text's title
    //
    // 	PUT /api/texts/:id/title
    // 	input-type: body, JSON
    //  output-type: JSON
    //
    //  input-structure: {
    //  	title: String
    //  }
    //
    //	output-structure: {
    //		success: Boolean
    //  }
    router.put('/:id/title', passport.isLoggedIn, (req, res, next) => {
        req.models.texts.modifyTitle(req.params.id, req.body.title, (err) => {
            if (err) {
                return next(err);
            }

            res.status(200);
            res.json({
                success: true
            });
        })
    });


    //  Deletes the specified text
    //
    // 	DELETE /api/texts/:id
    // 	input-type: None
    //  output-type: JSON
    //
    //  output-structure: {
    //		success: Boolean
    //  }
    router.delete('/:id', passport.isLoggedIn, (req, res, next) => {
        req.models.texts.deleteOne({ _id: req.params.id }, (err) => {
            if (err) {
                return next(err);
            }

            res.status(200);
            res.json({
                success: true
            });
        });
    });


    //  Sends the IDs and titles of the texts in the specified page
    //
    // 	GET /api/texts/last
    // 	input-type: query, url-encoded
    // 	output-type: JSON
    //
    //	input-structure: {
    //		page: Number
    //  }
    //
    //	output-structure: {
    //		lastPage: Number,
    //		texts: [
    //			{
    //				text: {
    //					title: String
    //				},
    //				_id: String
    //			}
    //		]
    //  }
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


    //  Sends the IDs and titles of the texts in the last page
    //
    // 	GET /api/texts/last
    // 	input-type: None
    // 	output-type: JSON
    //
    //	output-structure: {
    //		lastPage: Number,
    //		texts: [
    //			{
    //				text: {
    //					title: String
    //				},
    //				_id: String
    //			}
    //		]
    //  }
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


    //  Sends the ID of a random text
    //
    // 	GET /api/texts/sample
    // 	input-type: None
    // 	output-type: JSON
    //
    //	output-structure: {
    //		sample: String
    //  }
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

	return router;
};

// UTILS

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