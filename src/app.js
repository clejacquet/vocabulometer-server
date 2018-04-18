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


const authPath = [
	'/text'
];

module.exports = (cb) => {
	// HTTP UTILS MIDDLEWARES LOADING

	const publicDirectory = process.env.VCBM_DIST_PATH || './dist';

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

	app.use((req, res, next) => {
		res.sendError = (error) => {
            res.status(error.status);
            res.json(formatError(req, error));
		};
		next();
	});

	app.use(express.static(publicDirectory));

  	// MODELS LOADING

	require('./models')((models) => {
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


    // ROUTES LOADING

		const router = express.Router({});

		const users = require('./routes/users')(passport);
		const texts = require('./routes/texts')(passport);

		router.use('/users', users);
		router.use('/texts', texts);
		app.use('/api/', router);


    // ERROR MIDDLEWARE LOADING

    // catch 404
		app.use((req, res) => {
            const dummy = null;
            dummy();

			// If it is an API call, send a JSON error message
			if (req.originalUrl.startsWith('/api/')) {
				const error = normalizeError(req, {
					status: 404,
					error: 'Error 404: Path provided not bound to any services'
				});

				return res.sendError(error)
			}

			// If it's not an API call, then just redirect to the Angular web app
			res.sendFile(path.resolve(path.join(publicDirectory, 'index.html')));
		});

    // error handler
		app.use((error, req, res, next) => {
			error = normalizeError(req, error);

			// If it is a server error, VERY BAD
			if (error.status === 500) {
                winston.log('error', error);
			}

			return res.sendError(error);
		});

		cb(app);
	});
};

function normalizeError(req, error) {
	if (error.status === undefined) {
		error.status = 500;
	}

	if (error.message === undefined) {
		error.message = 'Server responded with error 500'
	}

	if (error.inner !== undefined) {
		error.stack = error.inner.stack;
	}

	return {
		status: error.status,
		error: error.message,
		details: (error.stack !== undefined) ?
            error.stack.toString().split('\n')
            : error.details,
        provided: req.method + ' ' + req.originalUrl
	}
}

function formatError(req, error) {
	error.details = req.app.get('env') === 'development' ?
        error.details
        : undefined;

	return error;
}