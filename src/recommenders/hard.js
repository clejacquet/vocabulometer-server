const similarity = require('./similarity');

module.exports = (usersModel, userId, dataset, limit, cb) => {
    similarity(usersModel, userId, dataset, 1, limit, cb);
};