var path = require('path');
var webpack = require('webpack');
var BundleTracker = require('webpack-bundle-tracker');


frontend_src_path = path.join(__dirname, 'src');

module.exports = {
  context: __dirname,
  devtool: 'eval',
  entry: [
    'whatwg-fetch',
    'webpack-dev-server/client?http://d.excentrics.ru:3000',
    'webpack/hot/only-dev-server',
    './src/index'
  ],
  output: {
    path: path.resolve('../backend/edw/static/js/'),
    filename: "bundle.js",
    publicPath: 'http://d.excentrics.ru:3000/assets/bundles/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new BundleTracker({filename: './webpack-stats.json'})
  ],
  resolve: {
    alias: {
      'react': path.join(__dirname, 'node_modules', 'react'),
    },
    extensions: ['', '.js']
  },
  resolveLoader: {
    'fallback': path.join(__dirname, 'node_modules')
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['react-hot', 'babel'],
      exclude: /node_modules/,
      include: __dirname
    }, {
      test: /\.js$/,
      loaders: ['react-hot', 'babel'],
      include: frontend_src_path
    }, {
      test: /\.css?$/,
      loaders: ['style', 'raw'],
      include: __dirname
    }, {
      test: /\.less?$/,
      loaders: ["less", "css"],
      include: path.join(__dirname, 'less')
    }, {
      test: /\.less?$/,
      loaders: ["less", "css"],
      include: path.join(frontend_src_path, 'less')
    }]
  }
};
