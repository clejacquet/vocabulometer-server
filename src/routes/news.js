const express = require('express');
const router = express.Router({
    caseSensitive: false,
    mergeParams: false,
    strict: false
});


module.exports = (passport) => {
    //  Get news
    //
    // 	GET /api/news
    // 	input-type: None
    // 	output-type: JSON
    //
    //	output-structure: {
    //		news: {
    //         srcId: String,
    //         title: String,
    //         section: String,
    //         text: String,
    //         date: Date
    //      }
    //  }
    router.get('/',
        (req, res, next) => {
            req.models.news.get((err, news) => {
                if (err) {
                    return next(err);
                }

                res.json({
                    news: news
                });
            });
        });


    //  Renew the news in the database
    //
    // 	POST /api/news
    // 	input-type: None
    //  output-type: JSON
    //
    //  output-structure: {
    //  	successCount: Number
    //	}
    router.post('/',
        (req, res, next) => {
            req.models.news.renew((err, result) => {
                if (err) {
                    return next(err);
                }

                const successCount = result.status.filter(status => status === true).length;

                res.status(200);
                res.json({
                    successCount: successCount
                });
            });
        });

    return router;
};