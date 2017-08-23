const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const LocalStrategy = require('passport-local');

const authenticate = require('express-jwt')({secret : 'efe5s3fs5f4e5s5c55e5segrgrg2s3'});

const GOOGLE_CONSUMER_KEY = '776219373924-g37o5k82bcjc2lac1tb0068kkeidv1hc.apps.googleusercontent.com';
const GOOGLE_CONSUMER_SECRET = 'k1MLbfGe70et6KIrrx5pgDpm';

function deserialize(req, res, next) {
	req.models.users
		.findOne({ name: req.user.id })
		.select({
			name: 1,
			_id: 1
		})
		.exec((err, result) => {
			if (err) {
				return next(err);
			}
			req.user = result;
			next();
		});
}

module.exports = (models) => {
	passport.serializeUser(function(user, done) {
		done(null, {
			name: user.name
		});
	});

	passport.deserializeUser(function(user, done) {
		models.users
			.findOne({ name: user.name })
			.select({
				name: 1,
				_id: 1
			}).exec(done);
	});

	passport.use(new GoogleStrategy({
			clientID: GOOGLE_CONSUMER_KEY,
			clientSecret: GOOGLE_CONSUMER_SECRET,
			callbackURL: "http://localhost:4100/api/users/auth/google/callback"
		},
		function(token, tokenSecret, profile, done) {
			models.users.findOneOrCreate({ name: profile.displayName }, { name: profile.displayName }, function (err, user) {
				return done(err, user);
			});
		}
	));

	passport.use(new LocalStrategy((username, password, done) => {
		models.users.findOne({ name: username }, (err, user) => {
			if (err) { return done(err); }
			if (!user) {
				return models.users.storeUser(username, password, done);
			}
			user.validPassword(password, (err, valid) => {
				if (err) {
					return done(err);
				}
				if (!valid) {
					return done(null, false, { message: 'Incorrect password.' });
				}
				return done(null, {
					_id: user._id,
					name: user.name
				});
			});
		});
	}));

	passport.isLoggedIn = (req, res, next) => {
		authenticate(req, res, (err) => {
			if (err) {
				return next(err);
			}

			deserialize(req, res, next);
		});
	};

	return passport;
};

