const similarity = require('./similarity');

module.exports = (userId, usersModel, dataset, language, limit, cb) => {
    similarity(userId, usersModel, dataset, language, 1, limit, cb);
};