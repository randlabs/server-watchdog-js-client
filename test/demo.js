const process = require('process');
const { spawn } = require('child_process');
const colors = require('colors');
const fkill = require('fkill');
const ServerWatchdogClient = require('../index');

//------------------------------------------------------------------------------

main().then(() => {
	console.log("Done!");
	process.exit(0);
}).catch((err) => {
	process.stdout.write(colors.brightRed('ERROR') + "\n");
	if (err.stack) {
		console.log(err.stack);
	}
	else {
		console.log(err.toString());
	}
	process.exit(1);
});

async function main() {
	let swdClient = ServerWatchdogClient.create({
		host: '127.0.0.1',
		port: 3004,
		apiKey: 'set-some-key',
		defaultChannel: 'default'
	});
	let childProc;

	process.stdout.write("Sending an error message thru channel '" + swdClient.getDefaultChannel() + "'... ");
	await swdClient.error('This is a sample error message from the Server Watchdog test application');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	//--------

	process.stdout.write("Sending a warning message thru channel '" + swdClient.getDefaultChannel() + "'... ");
	await swdClient.warn('This is a sample warning message from the Server Watchdog test application');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	//--------

	process.stdout.write("Sending an information message thru channel '" + swdClient.getDefaultChannel() + "'... ");
	await swdClient.info('This is a sample information message from the Server Watchdog test application');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	//--------

	process.stdout.write("Launching a child NodeJS process... ");
	childProc = spawnNodeJs();
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Sending watch process for process #" + childProc.pid.toString() + "... ");
	await swdClient.processWatch(childProc.pid, 'Child NodeJS exit 0', 'error');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Exiting gracefully from child process... ");
	childProc.stdin.write('process.exit(0);\n');
	childProc.stdin.end();
	process.stdout.write(colors.brightGreen('OK') + "\n");

	//--------

	process.stdout.write("Launching again a child NodeJS process... ");
	childProc = spawnNodeJs();
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Sending watch process for process #" + childProc.pid.toString() + "... ");
	await swdClient.processWatch(childProc.pid, 'Child NodeJS exit 1', 'error');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Exiting from child process with exit code different than 0... ");
	childProc.stdin.write('process.exit(1);\n');
	childProc.stdin.end();
	process.stdout.write(colors.brightGreen('OK') + "\n");

	//--------

	process.stdout.write("Launching a third child NodeJS process... ");
	childProc = spawnNodeJs();
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Sending watch process for process #" + childProc.pid.toString() + "... ");
	await swdClient.processWatch(childProc.pid, 'Child NodeJS kill', 'error');
	process.stdout.write(colors.brightGreen('OK') + "\n");

	process.stdout.write("Killing the child process with exit code different than 0... ");
	await fkill(childProc.pid, {
		force: true
	});
	process.stdout.write(colors.brightGreen('OK') + "\n");
}

function spawnNodeJs() {
	const ls = spawn(process.execPath, []);

	ls.stdout.on('data', (/*data*/) => {
		//keep ESLint happy
		//const s = String.fromCharCode.apply(null, new Uint8Array(data));
	});

	ls.stderr.on('data', (/*data*/) => {
		//keep ESLint happy
		//const s = String.fromCharCode.apply(null, new Uint8Array(data));
	});

	ls.on('close', (/*exitcode*/) => {
		//keep ESLint happy
	});

	ls.stdin.setEncoding('utf-8');

	return ls;
}
