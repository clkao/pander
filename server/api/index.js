import { Router } from 'express';
import { execFile } from 'child_process';
import multiparty from 'multiparty';
import fs from 'fs';

function eval_api(res, script, opts) {
	const child = execFile('/bin/bash', ['--norc', '-c', script], opts, (error, stdout, stderr) => {
		res.json({stdout, stderr, error});
	});
	if (opts.input) {
		opts.input.pipe(child.stdin);
		child.stdin.on('error', (e) => console.error('pipe error', e));
	}
	else {
		child.stdin.end();
	}
}

export default function() {
	var api = Router();
	for (let key of Object.keys(process.env)) {
		if (key.match(/^PANDER_API_/)) {
			let method = key.replace(/^PANDER_API_/, '').toLowerCase();
			let script = process.env[key];
			api.all(`/${method}`, (req, res) => {
				let env = Object.assign({}, req.query);
				if (req.method === 'POST') {
					var form = new multiparty.Form();
					form.parse(req, function(err, fields, files) {
						env = Object.assign(env, fields);
						var input;
						if (files.STDIN) {
							input = fs.createReadStream(files.STDIN[0].path);
						}
						return eval_api(res, script, {env, input});
					});
				}
				else {
					return eval_api(res, script, {env});
				}
			});
		}
	}

	return api;
}
