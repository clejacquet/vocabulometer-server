const { matchedData } = require('express-validator/filter');
const { validationResult } = require('express-validator/check');

module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({
            status: 422,
            details: errors.mapped()
        });
    }

    req.data = matchedData(req);
    next();
};