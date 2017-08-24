const gulp = require('gulp');
const nodemon = require('gulp-nodemon');
const git = require('gulp-git');
const exec = require('child_process').exec;

gulp.task('launch', () => {
	nodemon({
		script: 'src/bin/www',
		watch: ['src/'],
		ext: 'js'
	});
});

// Just a test comment
gulp.task('deploy', () => {
	exec('git rebase master heroku', (err, stdout, stderr) => {
		console.log(stdout);
		console.log(stderr);
		
		if (err) {
			console.log('==> Error while deploying, coming back to master branch!');
			git.checkout('master', (err) => {
				if (err) throw err;
			});
			return;
		}

		git.push('heroku', 'master', { args: '-f' }, (err) => {
			if (err) throw err;

			git.checkout('master', (err) => {
				if (err) throw err;

				console.log('Vocabulometer successfully deployed on Heroku!');
			});
		})
	})
});