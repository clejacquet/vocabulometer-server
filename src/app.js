const express = require('express');
const path = require('path');
const cors = require('cors');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');

const app = express();


const authPath = [
	'/text'
];

module.exports = (cb) => {
	// HTTP UTILS MIDDLEWARES LOADING

	const publicDirectory = '../../vocabnalyze-client/dist';

	app.use(favicon(path.join(__dirname, publicDirectory, 'favicon.ico')));
	app.use(logger('dev'));
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
		next();
	});

	app.use(express.static(path.join(__dirname, publicDirectory)));

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

		const router = express.Router();

		const users = require('./routes/users')(passport);
		const texts = require('./routes/texts')(passport);

		router.use('/users', users);
		router.use('/texts', texts);
		app.use('/api/', router);


    // ERROR MIDDLEWARE LOADING

    // catch 404
		app.use((req, res) => {
			res.sendFile(path.join(__dirname, publicDirectory, '/index.html'));
		});

    // error handler
		app.use((err, req, res, next) => {
			if (err.status === 401) {
				res.status(401);
				return res.json(err.inner);
			}

			// set locals, only providing error in development
			console.error(err);
			res.locals.message = err.message;
			res.locals.error = req.app.get('env') === 'development' ? err : {};

			// render the error page
			res.status(err.status || 500);
			res.json({error: err});
		});

		cb(app);
	});
};
