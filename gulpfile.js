var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('gulp-browserify');

gulp.task('js', function() {
  gulp.src('js/main.js')
    .pipe(browserify({
      insertGlobals: false,
      debug: false,
      transform: ['reactify']
    }))
    .on('error', gutil.log)
    .pipe(gulp.dest('build/js'))
    .on('error', gutil.log);
  gulp.src('js/ace/**/*.js')
    .pipe(gulp.dest('build/js/ace'));
  gulp.src('js/highlight.js')
    .pipe(gulp.dest('build/js'));
});

gulp.task('watch', function () {
  gulp.watch('js/**/*.js', ['js']);
});

gulp.task('default', ['js', 'watch']);
