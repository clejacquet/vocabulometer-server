const { validationResult, checkSchema } = require('express-validator/check');


function strip(schema, field, cb) {
    const newSchema = {};

    Object.keys(schema).forEach((key) => {
        const entryCopy = {... schema[key]};
        if (entryCopy.hasOwnProperty(field)){
            delete entryCopy[field];
        }
        newSchema[key] = entryCopy;
    });

    return cb(newSchema);
}

function findObject(storage, path, id, sanitizer, output) {
    if (id === path.length - 1) {
        if (path[id] !== '*') {
            if (storage.hasOwnProperty(path[id])) {
                output[path[id]] = sanitizer(storage[path[id]]);
            }
        } else {
            if (Array.isArray(storage)) {
                storage.forEach(value => output.push(sanitizer(value)));
            } else {
                Object.keys(storage).forEach(key => output[key] = sanitizer(storage[key]));
            }
        }

        return;
    }

    if (path[id] === '*') {
        if (Array.isArray(storage)) {
            storage.forEach((entry, i) => {
                let subOutput = null;

                if (output.length === storage.length) {
                    subOutput = output[i];
                } else {
                    subOutput = Array.isArray(entry) ? [] : {};
                    output.push(subOutput);
                }

                findObject(entry, path, id + 1, sanitizer, subOutput);
            });
        } else {
            Object.keys(storage).forEach((property) => {
                if (!output.hasOwnProperty(property)) {
                    output[property] = Array.isArray(storage[property]) ? [] : {};
                }
                findObject(storage[property], path, id + 1, sanitizer, output[property]);
            })
        }
    } else {
        if (!storage.hasOwnProperty(path[id])) {
            return;
        }

        if (!output.hasOwnProperty(path[id])) {
            output[path[id]] = Array.isArray(storage[path[id]]) ? [] : {};
        }

        findObject(storage[path[id]], path, id + 1, sanitizer, output[path[id]]);
    }
}

function sanitize(req, schema) {
    if (Object.keys(schema).length === 0) {
        return {};
    }

    const firstElem = schema[Object.keys(schema)[0]];
    const firstStorage = req[firstElem.in];

    let output = undefined;
    if (Array.isArray(firstStorage)) {
        output = [];
    } else {
        output = {};
    }

    Object
        .keys(schema)
        .map((key) => {
            const path = key.split('.');
            const storage = schema[key].in;
            const sanitizer = (schema[key].sanitizer ? schema[key].sanitizer : value => value);

            findObject(req[storage], path, 0, sanitizer, output);
        });

    return output;
}

function policy(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next({
            status: 422,
            details: errors.mapped()
        });
    }

    next();
}

module.exports = {
    policy: policy,

    schema: (schema) => {
        return [
            strip(schema, 'sanitizer', checkSchema),
            policy,
            (req, res, next) => {
                req.data = sanitize(req, schema);
                next();
            }
        ];
    }
};