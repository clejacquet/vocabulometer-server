const express = require('express');
const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});

const check = require('../policies/check');

module.exports = (passport, models) => {
    Object.keys(models.modules).forEach((key) => {
        const subRouter = express.Router({
            caseSensitive: false,
            mergeParams: false,
            strict: false
        });

        const module = models.modules[key];

        //  Indexes given URI of documents for the recommender system
        //  Path parameter :dataset should be the dataset module name
        //
        // 	POST /api/datasets/:dataset
        // 	input-type: body, JSON
        //  output-type: JSON
        //
        //  input-structure: {
        //		uri: String[]
        //	}
        //
        //  output-structure: {
        // 		result: [
        // 			{
        //              words: String[],
        // 				uri: String,
        // 				title: String
        // 			}
        // 		]
        // }
        subRouter.post('/',
            passport.isLoggedIn,
            check.schema({
                uri: {
                    in: 'body',
                    errorMessage: 'URI parameter not provided',
                    exists: true,
                    custom: { options: (value) => typeof value === 'string' || Array.isArray(value) },
                    sanitizer: value => (Array.isArray(value)) ? value : [value]
                }
            }),
            (req, res, next) => {
                module.save(req.data.uri, (err, result) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        result: result
                    });
                })
            });

        //  Recommends some texts (maximum retrieved = limit)
        //  Path parameter :dataset should be the dataset module name
        //
        // 	GET /api/datasets/:dataset/recommendation
        // 	input-type: url_encoded
        //  output-type: JSON
        //
        //  input-structure: {
        //		limit: Number,
        //      recommender: String
        //	}
        //
        //  output-structure: {
        //		texts: [
        // 			{
        // 				uri: String,
        // 				title: String,
        //				score: Number
        // 			}
        // 		]
        // }
        subRouter.get('/recommendation',
            passport.isLoggedIn,
            check.schema({
                limit: {
                    in: 'query',
                    errorMessage: 'limit parameter provided is incorrect',
                    isInt: true,
                    custom: { options: (value) => parseInt(value) > 0 },
                    sanitizer: value => parseInt(value)
                },
                recommender: {
                    in: 'query',
                    errorMessage: 'Recommender parameter not provided or not existing',
                    exists: true,
                    custom: { options: (value) => models.recommenders.hasOwnProperty(value) },
                    sanitizer: value => models.recommenders[value]
                }
            }),
            (req, res, next) => {
                const recommender = req.data.recommender;

                recommender(req.models.users, req.user._id, req.models.datasets[module.name], req.data.limit, (err, texts) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        texts: texts
                    })
                });
            });

        router.use('/' + key, subRouter);
    });

    return router;
};