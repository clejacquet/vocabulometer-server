const path = require('path');


const constants = require('../constants');

module.exports = {
    notFound: notFound,
    normalizeError: normalizeError,
    formatError: formatError,
    sendError: sendError
};

function notFound(req, res, error) {
    // If it is an API call, send a JSON error message
    if (req.originalUrl.startsWith('/api/')) {
        if (error === undefined) {
            error = normalizeError(req, {
                status: 404,
                error: 'Error 404: Path provided not bound to any services'
            });
        } else {
            error = normalizeError(req, error);
        }

        return sendError(req, res, error);
    }

    // If it's not an API call, then just redirect to the Angular web app
    res.sendFile(path.resolve(path.join(constants.publicDirectory, 'index.html')));
}

function normalizeError(req, error) {
    if (error.status === undefined) {
        error.status = 500;
    }

    if (error.message !== undefined && error.error === undefined) {
        error.error = error.message;
    }

    if (error.error === undefined) {
        error.error = 'Server responded with error ' + error.status;
    }

    if (error.inner !== undefined) {
        error.stack = error.inner.stack;
    }

    return {
        status: error.status,
        error: error.error,
        details: (error.stack !== undefined) ?
            error.stack.toString().split('\n')
            : error.details,
        provided: req.method + ' ' + req.originalUrl
    }
}

function formatError(req, error) {
    error.details = (error.status !== 500 || req.app.get('env') !== 'production') ?
    error.details
        : undefined;

    return error;
}

function sendError(req, res, error) {
    res.status(error.status);
    res.json(formatError(req, error));
}