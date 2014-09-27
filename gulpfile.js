var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

function buildJs(debug) {
  gulp.src('js/ace/**/*.js')
    .pipe(gulp.dest('build/js/ace'));
  gulp.src('js/highlight.js')
    .pipe(gulp.dest('build/js'));
  return gulp.src('js/main.js')
    .pipe($.webpack({
      watch: debug,
      devtool: debug ? 'inline-source-map' : null,
      module: {
        loaders: [
          {test: /\.js$/, loader: 'jsx-loader', query: {harmony: true}}
        ]
      },
      resolve: {
        modulesDirectories: [],
        alias: {
          'react': __dirname + '/ui/contrib/react'
        }
      },
      output: {
        filename: '[name].js',
        pathinfo: true
      }
    }));
}

gulp.task('dev', function() {
  return buildJs(true)
    .on('error', $.util.log)
    .pipe(gulp.dest('build/js'))
    .on('error', $.util.log);
});

gulp.task('deploy', function() {
  return buildJs(false)
    .on('error', $.util.log)
    .pipe(uglify())
    .on('error', $.util.log)
    .pipe(gulp.dest('build/js'))
    .on('error', $.util.log);
});

gulp.task('default', ['dev']);
