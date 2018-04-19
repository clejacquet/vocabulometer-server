const winston = require('winston');
const utils = require('./../routes/routeUtils');

function existsRule(value) {
    return value !== undefined && value !== null;
}

existsRule.errorMessage = (path) => '\'' + path + '\' parameter not provided';

function numberRule(value) {
    return existsRule(value) && !isNaN(parseInt(value));
}

function strictPositiveRule(value) {
    return numberRule(value) && value > 0;
}

function stringRule(value) {
    return existsRule(value) && typeof(value) === 'string';
}

function objectRule(value) {
    return typeof(value) === 'object';
}

const rules = {
    object: objectRule,
    exists: existsRule,
    number: numberRule,
    string: stringRule,
    strictPositive: strictPositiveRule
};



function checkExists(field, parameter) {
    if (!existsRule(parameter)) {
        winston.log('info', '\'%s\' parameter not provided', field);

        return utils.generateError(400, '\'' + field + '\' parameter not provided')
    }

    return null;
}

function checkNumber(field, parameter) {
    const err = checkExists(field, parameter);
    if (err !== null) {
        return err;
    }

    if (!numberRule(parameter)) {
        winston.log('info',
            '\'%s\' parameter provided is not an integer number (\'%s\')',
            field, parameter);

        return utils.generateError(400,
            '\'' + field + '\' parameter provided is not an integer number (\'' + parameter + '\')');
    }

    return null;
}

function checkStrictPositive(field, parameter) {
    const err = checkNumber(field, parameter);
    if (err !== null) {
        return err;
    }

    const number = parseInt(parameter);
    if (!strictPositiveRule(number)) {
        winston.log('info',
            '\'%s\' parameter provided is not a strictly positive integer number (\'%s\')',
            field, parameter);

        return utils.generateError(400,
            '\'' + field + '\' parameter provided is not a strictly positive integer number (\'' + parameter + '\')');
    }
}

function checkType(type) {
    if (!['body', 'query', 'params'].includes(type)) {
        winston.error('Unknown provided type \'%s\'', type);

        throw '\'' + type + '\' is not a valid type';
    }
}

function checkRecursively(validator, document, path) {
    const neededKeys = Object.keys(validator);
    const keysSet = new Set(Object.keys(document));

    const missingKeys = neededKeys.filter((neededKey) => !keysSet.has(neededKey));
    if (missingKeys.length > 0) {
        const errorMessages = missingKeys.map((key) => {
            winston.log('info', '\'' + path + '.' + key + '\' is missing');
            return '\'' + path + '.' + key + '\' is missing';
        });

        return utils.generateError(400, errorMessages);
    }

    const valueDescriptions = neededKeys
        .map((neededKey) => ({
            key: neededKey,
            value: document[neededKey],
            rule: validator[neededKey]
        }));

    const incorrectTypeValues = valueDescriptions
        .filter((valueDescription) => {
            if (typeof(valueDescription.rule) === 'object') {
                return typeof(valueDescription.value) !== 'object';
            }

            return !valueDescription.rule(valueDescription.value)
        });

    if (incorrectTypeValues.length > 0) {
        const errorMessages = incorrectTypeValues.map((valueDescription) => {
            winston.log('info', '\'' + path + '.' + valueDescription.key + '\' is not correct');
            return '\'' + path + '.' + valueDescription.key + '\' is not correct';
        });

        return utils.generateError(400, errorMessages);
    }

    const subDocuments = valueDescriptions
        .filter((valueDescription) => typeof(valueDescription.rule) === 'object');

    return subDocuments
        .map((subDoc) => checkRecursively(validator[subDoc.key], subDoc.value, path + '.' + subDoc.key))
        .reduce((acc, subResult) => {
            if (acc === null) {
                return subResult;
            }
            if (subResult === null) {
                return acc;
            }

            return acc.concat(subResult);
        }, null);
}

module.exports = {
    rules: rules,

    exists: (type, field) => {
        checkType(type);

        return (req, res, next) => {
            const parameter = req[type][field];

            let err;
            if ((err = checkExists(field, parameter)) !== null) {
                return next(err);
            }

            next();
        }
    },

    number: (type, field) => {
        checkType(type);

        return (req, res, next) => {
            const parameter = req[type][field];

            let err;
            if ((err = checkNumber(field, parameter)) !== null) {
                return next(err);
            }

            next();
        }
    },

    strictPositive: (type, field) => {
        checkType(type);

        return (req, res, next) => {
            const parameter = req[type][field];

            let err;
            if ((err = checkStrictPositive(field, parameter)) !== null) {
                return next(err);
            }

            next();
        }
    },

    body: (validator) => {
        return (req, res, next) => {
            let err;

            if ((err = checkRecursively(validator, req.body, '$')) !== null) {
                return next(err);
            }

            next();
        };
    }
};