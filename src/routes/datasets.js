const express = require('express');
const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});

const check = require('../policies/check');

module.exports = (passport, recommenders, modules) => {
    Object.keys(modules).forEach((key) => {
        const subRouter = express.Router({
            caseSensitive: false,
            mergeParams: false,
            strict: false
        });

        module = modules[key];

        subRouter.post('/',
            passport.isLoggedIn,
            check.schema({
                uri: {
                    in: 'body',
                    errorMessage: 'URI parameter not provided',
                    exists: true
                }
            }),
            (req, res, next) => {
                module.save([req.data.uri], (err, result) => {
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
                    custom: { options: (value) => recommenders.hasOwnProperty(value) },
                    sanitizer: value => recommenders[value]
                }
            }),
            (req, res, next) => {
                const recommender = req.data.recommender;

                recommender(key, (err, text) => {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        out: text
                    })
                })
            });

        router.use('/' + key, subRouter);
    });

    return router;
};