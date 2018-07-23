const express = require('express');
const compression = require('compression');
const path = require('path');
const cors = require('cors');
const favicon = require('serve-favicon');
const winston = require('winston');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');

const constants = require('./constants');
const httperror = require('./http/httperror');
const log = require('./logUtils')(winston);
const loggerMiddleware = log.middleware;

// IMPORTANT
// This file implements the backbone of the Express app. Not so interesting,
// only important to dig into it in case of a massive refactor

module.exports = (cb) => {
    const app = express();

	initApp(app);

  	// MODELS LOADING

	require('./models')((err, models) => {
		if (err) {
			return winston.log('error', err);
		}

		app.use((req, res, next) => {
			req.models = models;
			next();
		});

    	loadRoutes(app, models);
        loadErrorHandler(app);

		cb(app);
	});
};

function initApp(app) {
    // Checking for the favicon
    let faviconMiddleware = null;
    try {
        faviconMiddleware = favicon(path.join(constants.publicDirectory, 'favicon.ico'));
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
        maxAge: 7 * 24 * 60 * 60 * 1000,
        resave: false,
        saveUnitialized: false
    }));

    app.use(express.static(constants.publicDirectory));
}

function loadRoutes(app, models) {
    // PASSPORT LOADING
    const passport = require('./passport')(models);
    app.use(passport.initialize());
    app.use(passport.session());

    // ROUTES LOADING
    const router = express.Router({});

    const users = require('./routes/users')(passport);
    const texts = require('./routes/texts')(passport);
    const news = require('./routes/news')(passport);
    const srs = require('./routes/srs')(passport);
    const admin = require('./routes/admin')(passport);
    const datasets = require('./routes/datasets')(passport, models);

    router.use('/users', users);
    router.use('/texts', texts);
    router.use('/news', news);
    router.use('/srs', srs);
    router.use('/admin', admin);
    router.use('/datasets', datasets);

    app.use('/api/', router);
}

function loadErrorHandler(app) {
    // ERROR MIDDLEWARE LOADING

    // catch 404
    app.use((req, res) => {
        httperror.notFound(req, res);
    });

    // error handler
    app.use((error, req, res, next) => {
        if (error.status && error.status === 404) {
            return httperror.notFound(req, res, error);
        }

        error = httperror.normalizeError(req, error);

        // If it is a server error, VERY BAD
        if (error.status === 500) {
            winston.log('error', error);
        }

        return httperror.sendError(req, res, error);
    });
}