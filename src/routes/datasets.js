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

        subRouter.get('/recommendation',
            passport.isLoggedIn,
            check.schema({
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

                recommender(req.models.users, req.user._id, req.models.datasets[module.name], 6, (err, texts) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        out: texts
                    })
                });
            });

        router.use('/' + key, subRouter);
    });

    return router;
};