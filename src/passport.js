const passport = require('passport');
const LocalStrategy = require('passport-local');

const authenticate = require('express-jwt')({secret : 'efe5s3fs5f4e5s5c55e5segrgrg2s3'});

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
