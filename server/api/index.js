import { Router } from 'express';
import { execFile } from 'child_process';
import multiparty from 'multiparty';
import fs from 'fs';

export default function() {
	var api = Router();
	for (let key of Object.keys(process.env)) {
		if (key.match(/^PANDER_API_/)) {
			let method = key.replace(/^PANDER_API_/, '').toLowerCase();
			let script = process.env[key];
			api.all(`/${method}`, (req, res) => {
				let env = Object.assign({}, req.query);
				var form = new multiparty.Form();
				form.parse(req, function(err, fields, files) {
					env = Object.assign(env, fields);
					var input;
					for (let name of Object.keys(files)) {
						if (name === 'STDIN') {
							input = fs.createReadStream(files[name][0].path);
						}
					}
					var child;
					try {
						console.log('doing', script);
						child = execFile('/bin/bash', ['--norc', '-c', script], {
							env
						}, (error, stdout, stderr) => {
							res.json({stdout, stderr, error});
						});
					}
					catch (e) {
						console.log('wtf', e);
					}
					if (input) {
						input.pipe(child.stdin);
						child.stdin.on('error', ()=> console.log('zzz'));
					}
					else {
						child.stdin.end();
					}
				});
			});
		}
	}

	return api;
}
