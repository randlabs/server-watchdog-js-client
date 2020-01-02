const process = require('process');
const fetch = require('node-fetch');

//------------------------------------------------------------------------------

class ClientRequestError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.name = "ClientRequestError";
		this.statusCode = statusCode;
	}
}

//------------------------------------------------------------------------------

/**
 * Creates a Server Watcher client module
 * @param {object}  options The configuration settings for the client module.
 * @property {string}  options.host The hostname where the server is running.
 * @property {number}  options.port The port number where the server is running.
 * @property {boolean} [options.useSsl] Boolean value indicating if the connection must be encrypted.
 * @property {string}  options.apiKey The API key for accessing the server.
 * @property {string}  options.defaultChannel The default channel to use if not specified.
 * @property {number}  [options.timeout] Timeout in milliseconds for notification delivery.
 * @returns {object}  Returns the client object.
 */
function create(options) {
	//validate options
	if (typeof options !== 'object' || Array.isArray(options)) {
		throw new Error('Invalid options');
	}

	//make a copy
	options = { ...options };

	//check host
	if (typeof options.host !== 'string' || options.host.length == 0) {
		throw new Error('Invalid host');
	}

	//check port
	if (typeof options.port !== 'number') {
		throw new Error('Invalid port');
	}
	if (options.port < 1 || options.port > 65535 || (options.port % 1) != 0) {
		throw new Error('Invalid port');
	}

	//check use ssl
	if (typeof options.useSsl === 'number') {
		options.useSsl = !!+options.useSsl;
	}
	else if (typeof options.useSsl === 'undefined') {
		options.useSsl = false;
	}
	else if (typeof options.useSsl !== 'boolean') {
		throw new Error('Invalid use ssl');
	}

	//check api key
	if (typeof options.apiKey !== 'string' || options.apiKey.length == 0) {
		throw new Error('Invalid API key');
	}

	//check default channel
	if (typeof options.defaultChannel !== 'string' || options.defaultChannel.length == 0) {
		throw new Error('Invalid default channel');
	}

	//check timeout
	if (typeof options.timeout === 'number') {
		if (options.timeout < 1 || (options.timeout % 1) != 0) {
			throw new Error('Invalid timeout');
		}
	}
	else if (typeof options.timeout !== 'undefined') {
		throw new Error('Invalid timeout');
	}
	else {
		options.timeout = 30000;
	}

	return new Client(options);
}

function Client(client_options) {
	//private variables
	let url_base = 'http' + (client_options.useSsl ? 's' : '') + '://' + client_options.host + ':' + client_options.port.toString() + '/';
	let api_key = client_options.apiKey;
	let default_channel = client_options.defaultChannel;
	let timeout = client_options.timeout;

	//public methods

	/**
	 * Get the default channel name.
	 * @return {string} Returns the channel name.
	 */
	this.getDefaultChannel = function () {
		return default_channel;
	};

	/**
	 * Notifies about an error event.
	 * @param {string} message - The string containing the message to deliver.
	 * @param {string} channel - The channel to use for the notification.
	 * @return {Promise<void>} Returns a promise that signals delivery completion.
	 */
	this.error = async function (message, channel) {
		await notify(message, channel, 'error');
	};

	/**
	 * Notifies about a warning event.
	 * @param {string} message - The string containing the message to deliver.
	 * @param {string} channel - The channel to use for the notification.
	 * @return {Promise<void>} Returns a promise that signals delivery completion.
	 */
	this.warn = async function (message, channel) {
		await notify(message, channel, 'warn');
	};

	/**
	 * Notifies an information.
	 * @param {string} message - The string containing the message to deliver.
	 * @param {string} channel - The channel to use for the notification.
	 * @return {Promise<void>} Returns a promise that signals delivery completion.
	 */
	this.info = async function (message, channel) {
		await notify(message, channel, 'info');
	};

	/**
	 * Monitors the specified process.
	 * @param {number} pid - The process id number.
	 * @param {string} name - The string containing a description of the process.
	 * @param {string} severity - The severity of the event if the process being monitored is killed or crashes.
	 * @param {string} channel - The channel to use for the notification.
	 * @return {Promise<void>} Returns a promise that signals process tracking completion.
	 */
	this.processWatch = async function (pid, name, severity, channel) {
		if (!pid) {
			pid = process.pid;
		}
		if (typeof pid !== 'number' || pid < 1 || (pid % 1) != 0) {
			throw new Error('Invalid process id');
		}
		if (!name) {
			name = process.execPath;
		}
		severity = validateSeverity(severity);
		channel = validateChannel(channel);

		await sendRequest('process/watch', {
			pid, name, channel, severity
		}, {
			no_response: true
		});
	};

	/**
	 * Stops monitoring the specified process.
	 * @param {number} pid - The process id number.
	 * @param {string} channel - The channel used for the notification.
	 * @return {Promise<void>} Returns a promise that signals process un-tracking completion.
	 */
	this.processUnwatch = async function (pid, channel) {
		if (!pid) {
			pid = process.pid;
		}
		if (typeof pid !== 'number' || pid < 1 || (pid % 1) != 0) {
			throw new Error('Invalid process id');
		}
		channel = validateChannel(channel);

		await sendRequest('process/unwatch', {
			pid, channel
		}, {
			no_response: true
		});
	};

	//------------------------------------------------------------------------------

	//private methods
	function validateChannel(channel) {
		if (channel && typeof channel !== 'string') {
			throw new Error('Invalid channel');
		}
		return channel ? channel : default_channel;
	}

	function validateSeverity(severity) {
		if (!severity) {
			return 'error';
		}
		if (typeof severity !== 'string' || (severity != 'error' && severity != 'warn' && severity != 'info')) {
			throw new Error('Invalid severity');
		}
		return severity;
	}

	async function notify(message, channel, severity) {
		if (typeof message !== 'string') {
			throw new Error('Invalid message');
		}
		if (message.length == 0) {
			return;
		}
		channel = validateChannel(channel);

		await sendRequest('notify', {
			message, channel, severity
		}, {
			no_response: true
		});
	}

	async function sendRequest(url, body, options) {
		let opts = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'X-Api-Key': api_key
			},
			timeout: timeout,
			body: JSON.stringify(body)
		};

		let response = await fetch(url_base + url, opts);
		if (response.status != 200) {
			let text;

			try {
				text = await response.text();
			}
			catch (err) {
				//keep ESLint happy
			}
			if (typeof text !== 'string' || text.length == 0) {
				text = 'Unsuccessful response from node.';
			}
			throw new ClientRequestError(text + ' [Status: ' + response.status.toString() + ']', response.status);
		}

		if (options) {
			if (options.no_response) {
				return;
			}
		}

		let json = await response.json();
		return json;
	}
}

//------------------------------------------------------------------------------

module.exports = {
	create,
	ClientRequestError
};
