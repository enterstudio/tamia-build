#!/usr/bin/env node
'use strict';

var program = require('commander');
var chalk = require('chalk');
var Table = require('easy-table');
var gzipSize = require('gzip-size');
var _ = require('lodash');
var pkg = require('../package.json');

/* eslint-disable no-console */

program
	.version(pkg.version)
	.description(pkg.description)
	.option('-v, --verbose', 'print debug information')
	.option('-h, --host <host>', 'dev server host (localhost)', 'localhost')
	.option('-p, --port <port>', 'dev server port (6601)', 6601)
	.option('-w, --webpack-port <port>', 'webpack dev server port (6602)', 6602)
	.option('-u, --no-compress', 'disable compression for production build')
;

program
	.command('init')
	.description('initialize project')
	.action(function() {
		console.log('Initializing project...');
		console.log();
		require('../lib/init').default(function(err) {
			if (err) {
				console.log(err);
			}
			else {
				console.log();
				console.log('Done.');
			}
		});
	})
;

program
	.command('bundle')
	.description('bundle assets')
	.action(function() {
		process.env.NODE_ENV = 'production';

		console.log('Bundling assets...');
		console.log();
		require('../lib/bundle').default(program, function(err, stats) {
			if (err) {
				console.log(err);
				process.exit(1);
			}

			if (stats.hasErrors()) {
				var error = stats.compilation.errors[0];
				console.log();
				console.log(chalk.red(error.toString()));
				process.exit(1);
			}

			if (stats.hasWarnings()) {
				stats.compilation.warnings.forEach(function(item) {
					console.log();
					console.log(chalk.yellow('Warning: ', item.message));
				});
			}

			// Print time
			var time = (stats.endTime - stats.startTime) / 1000;
			console.log('Done in', time, 's');
			console.log();

			// Print stats
			var table = new Table();
			Object.keys(stats.compilation.assets).forEach(function(name) {
				var asset = stats.compilation.assets[name];
				var code = asset._value;
				if (!code && asset.children) {
					code = asset.children.reduce(function(concatenated, child) {
						return concatenated + child._value;
					}, '');
				}

				var size = code.length;
				var gzipped = gzipSize.sync(code);

				table.cell('File', chalk.bold(name));
				table.cell('Size, KB', size / 1024, Table.number(2));
				table.cell('Gzipped, KB', gzipped / 1024, Table.number(2));
				table.cell('Ratio', _.padStart(Math.round((gzipped / size) * 100) + '%', 5));
				table.newRow();
			});
			console.log(table.toString());
		});
	})
;

program
	.command('server')
	.description('start dev server')
	.action(function() {
		process.env.NODE_ENV = 'development';

		require('../lib/server').default(program, function(err) {
			if (err) {
				console.log(err);
			}
			else {
				console.log('Listening at', chalk.underline('http://' + program.host + ':' + program.port));
				console.log();
			}
		});
	})
;

program.parse(process.argv);

if (!process.argv.slice(2).length) {
	program.outputHelp();
}