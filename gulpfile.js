var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');

function webpackConfig(debug) {
  return {
    watch: true,
    devtool: debug ? 'inline-source-map' : null,
    entry: debug ? [
      'webpack-dev-server/client?http://localhost:8888',
      'webpack/hot/dev-server',
      './js/main'
    ] : undefined,
    module: {
      loaders: [
        {test: /\.js$/, loaders: debug ? ['react-hot', 'jsx?harmony=true'] : ['jsx?harmony=true']},
        {test: /\.css$/, loaders: debug ? ['style', 'css'] : []}
      ]
    },
    resolve: {
      extensions: ['', '.js']
    },
    externals: {
      'react': 'window.React'
    },
    output: {
      path: __dirname + '/build/js',
      filename: 'main.js',
      pathinfo: true,
      publicPath: 'http://localhost:8888/js/'
    },
    plugins: debug ? [
      new webpack.HotModuleReplacementPlugin()
    ] : []
  };
}

function buildJs(debug) {
  gulp.src('js/ace/**/*.js')
    .pipe(gulp.dest('build/js/ace'));
  gulp.src('js/highlight.js')
    .pipe(gulp.dest('build/js'));
  return gulp.src('js/main.js')
    .pipe($.webpack(webpackConfig(debug)));
}

gulp.task('devserver', function(callback) {
  new WebpackDevServer(webpack(webpackConfig(true)), {
    contentBase: 'http://localhost:8080',
    hot: true,
    publicPath: '/js/',
    stats: {colors: true}
  }).listen(8888, 'localhost', function(err) {
    if(err) throw new $.util.PluginError('devserver', err);
    $.util.log('[devserver]', 'http://localhost:8888/webpack-dev-server/index.html');
    // callback();
  });
});

gulp.task('build', function() {
  return buildJs(false)
    .on('error', $.util.log)
    .pipe($.uglify())
    .on('error', $.util.log)
    .pipe(gulp.dest('build/js'))
    .on('error', $.util.log);
});

gulp.task('default', ['devserver', 'build']);
