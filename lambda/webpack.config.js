const path = require('path'),
    CopyWebpackPlugin = require('copy-webpack-plugin');

const outputPathRelative = 'dist/';
const staticRelative = '../static/';
const staticPath = path.resolve(__dirname, staticRelative);
const distPath = path.join(staticPath, outputPathRelative);

module.exports = [
    // The lambda function
    {
        entry: './lambda/index.js',
        target: 'node',
        output: {
            libraryTarget: 'commonjs',
            path: path.join(distPath, 'lambda'),
            filename: 'index.js'
        },
        externals: [
            'aws-sdk' // aws-sdk included in Lambda
        ],
        plugins: [
            new CopyWebpackPlugin([{
                from: 'etc/config',
                to: path.join(distPath, 'lambda', 'config')
            }])
        ]
    }
];
