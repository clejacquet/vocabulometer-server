const express = require('express');
const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});
const check = require('../policies/check');
const toObjectID = require('mongoose').Types.ObjectId;


module.exports = (passport) => {
    //  Sends the ID of a random text
    //
    // 	GET /api/texts/sample
    // 	input-type: None
    // 	output-type: JSON
    //
    //	output-structure: {
    //		sample: String
    //  }
    router.get('/sample',
        check.schema({
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].getSample((err, sample) => {
                if (err) {
                    return next(err);
                }

                res.json({
                    sample: sample
                });
            });
        });


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
	router.get('/:id',
        passport.isLoggedIn,
        check.schema({
            id: {
                in: 'params',
                errorMessage: 'Missing or incorrect id parameter',
                custom: { options: (value) => { try { return toObjectID(value); } catch (e) { return false } } },
                sanitizer: value => toObjectID(value)
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
		req.models.texts[req.data.language].findOne({ _id: req.data.id }, (err, result) => {
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
	// 	input-structure: {
    //      texts: [
	// 		    {
	// 			    title: String,
	// 			    body: String,
	// 			    source: String
	// 		    }
	// 	    ]
    //  }
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
	router.post('/',
        passport.isLoggedIn,
        check.schema({
            'texts.*.title': {
                in: 'body',
                errorMessage: 'Title parameter missing',
                exists: true
            },
            'texts.*.body': {
                in: 'body',
                errorMessage: 'Body parameter missing',
                exists: true
            },
            'texts.*.source': {
                in: 'body',
                errorMessage: 'Source parameter missing',
                exists: true
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].loadAndCreateTexts(req.data.texts, (err, texts) => {
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
    router.put('/:id/text',
        passport.isLoggedIn,
        check.schema({
            text: {
                in: 'body',
                errorMessage: 'Text parameter missing',
                exists: true
            },
            id: {
                in: 'params',
                errorMessage: 'ID parameter missing',
                exists: true
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].loadAndModifyText(req.data.id, req.data.text, (err) => {
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
    router.put('/:id/title',
        passport.isLoggedIn,
        check.schema({
            title: {
                in: 'body',
                errorMessage: 'Title parameter missing',
                exists: true
            },
            id: {
                in: 'params',
                errorMessage: 'ID parameter missing',
                exists: true
            },
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].modifyTitle(req.data.id, req.data.title, (err) => {
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
    router.delete('/:id',
        passport.isLoggedIn,
        check.schema({
            id: {
                in: 'params',
                errorMessage: 'ID parameter missing',
                exists: true
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].deleteOne({ _id: req.data.id }, (err) => {
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
    router.get('/',
        passport.isLoggedIn,
        check.schema({
            page: {
                in: 'query',
                errorMessage: 'Page parameter missing',
                exists: true,
                isInt: true,
                custom: { options: (value) => parseInt(value) >= 0 },
                sanitizer: value => parseInt(value)
            },
            language: {
                in: 'query',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            const page = parseInt(req.data.page);

            req.models.texts[req.data.language].count((err, count) => {
                if (err) {
                    return next(err);
                }

                const lastPage = Math.ceil(count / 20) - 1;

                getTextOnPage(req.models.texts[req.data.language], page, (err, result) => {
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
    router.get('/last',
        passport.isLoggedIn,
        check.schema({
            language: {
                in: 'body',
                errorMessage: 'language parameter provided is incorrect',
                custom: { options: (value) => ['english', 'japanese'].includes(value) }
            }
        }),
        (req, res, next) => {
            req.models.texts[req.data.language].count((err2, count) => {
                if (err2) {
                    return next(err2);
                }

                const page = Math.ceil(count / 20) - 1;
                getTextOnPage(req.models.texts[req.data.language], page, (err, result) => {
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