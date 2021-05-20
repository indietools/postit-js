const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './lib/index.js',
  output: {
    library: 'PostItModeler',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
    filename: 'postit.js',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.xml$/,
        use: 'raw-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: ['file-loader'],
      },
      {
        test: /\.less$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'less-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      }
    ],
  },
  plugins: [
    new CopyWebpackPlugin({ patterns: [{ from: '**/*.{html,css,woff,ttf,eot,svg,woff2}', context: 'assets/' }] }),
  ],
};
