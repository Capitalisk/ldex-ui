const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const environment = process.env.NODE_ENV || 'development';
const isProd = environment === 'production';

module.exports = {
  mode: environment,
  entry: './src/index.js',

  devtool: isProd ? false : 'source-map',

  performance: false,

  output: {
    path: path.resolve(__dirname, 'build/'),
    filename: 'bundle.js',
  },

  resolve: {
    alias: {
      'buffer': 'buffer',
    },
    extensions: ['.js', '.jsx'],
    fallback: {
      'os': false,
      'path': require.resolve('path-browserify'),
      'fs': false,
      'querystring': require.resolve('querystring-es3'),
      'crypto': require.resolve('crypto-browserify'),
      'url': require.resolve('url/'),
      'stream': require.resolve('stream-browserify'),
      'assert': require.resolve('assert/'),
      'util': require.resolve('util/'),
      'http': false,
      'https': false,
      'process': false,
    },
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules/
      },
    ],
  },

  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^@chainsafe\/blst(\/|$)/,
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      publicPath: './',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/public',
          to: '',
          globOptions: {
            dot: true,
          },
        }
      ]
    })
  ],

  devServer: {
    static: path.join(__dirname, 'build'),
    compress: true,
    port: 9000,
    open: true,
  },
};
