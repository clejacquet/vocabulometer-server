const express = require('express');
const compression = require('compression');
const path = require('path');
const cors = require('cors');
const favicon = require('serve-favicon');
const winston = require('winston');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');

const app = express();

const log = require('./logUtils')(winston);
const loggerMiddleware = log.middleware;

const publicDirectory = process.env.VCBM_DIST_PATH || './dist';

const authPath = [
	'/text'
];

// IMPORTANT
// This file implements the backbone of the Express app. Not so interesting,
// only important to dig into it in case of a massive refactor

module.exports = (cb) => {
	// Checking for the favicon
    let faviconMiddleware = null;
	try {
        faviconMiddleware = favicon(path.join(publicDirectory, 'favicon.ico'));
	} catch (ex) {
		return winston.log('error', 'Can\'t find the favicon file. Please be sure the ' +
			'DIST folder has been found and has been produced with \'ng ' +
			'build\' and not \'ng serve\'.\nSorry, we have no choice but to kill the app.');
    }

	app.use(compression());
	app.use(faviconMiddleware);
	app.use(loggerMiddleware);
	app.use(cors({credentials: true}));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.use(cookieSession({
		name: 'session',
		secret: 'efe5s3fs5f4e5s5c55e5segrgrg2s3',
		maxAge: 24 * 60 * 60 * 1000,
		resave: false,
		saveUnitialized: false
	}));

	app.use(express.static(publicDirectory));

  	// MODELS LOADING

	require('./models')((err, models) => {
		if (err) {
			return winston.log('error', err);
		}

		app.use((req, res, next) => {
			req.models = models;
			next();
		});

		// PASSPORT LOADING

		const passport = require('./passport')(models);
		app.use(passport.initialize());
		app.use(passport.session());


		// AUTH PROTECTION

		app.use((req, res, next) => {
			if (authPath.includes(req.path) && !req.isAuthenticated()) {
				return res.redirect('/');
			}

			next();
		});

		app.use((req, res, next) => {
			res.sendError = (err) => {
				sendError(req, res, err);
			};
			next();
		});


    // ROUTES LOADING

		const router = express.Router({});

		const users = require('./routes/users')(passport);
		const texts = require('./routes/texts')(passport);
		const admin = require('./routes/admin')(passport);
		const datasets = require('./routes/datasets')(passport, models);

		router.use('/users', users);
		router.use('/texts', texts);
		router.use('/admin', admin);
		router.use('/datasets', datasets);
		app.use('/api/', router);


    // ERROR MIDDLEWARE LOADING

    // catch 404
		app.use((req, res) => {
			notFound(req, res);
		});

    // error handler
		app.use((error, req, res, next) => {
			if (error.status && error.status === 404) {
				return notFound(req, res, error);
			}

			error = normalizeError(req, error);

			// If it is a server error, VERY BAD
			if (error.status === 500) {
                winston.log('error', error);
			}



			return sendError(req, res, error);
		});

		cb(app);
	});
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

        return res.sendError(error);
    }

    // If it's not an API call, then just redirect to the Angular web app
    res.sendFile(path.resolve(path.join(publicDirectory, 'index.html')));
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