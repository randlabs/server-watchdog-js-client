# server-watchdog-nodejs

NodeJS library for interacting with the [Server monitoring](https://github.com/randlabs/server-watchdog) tool.

# Installation

To install the library, use the following command inside your NodeJS project:
```sh
$ npm install @randlabs/server-watchdog-nodejs --save
```

# Usage sample

```javascript
const ServerWatchdogClient = require('@randlabs/server-watchdog-nodejs');

//...

let swdClient = ServerWatchdogClient.create({
		host: '127.0.0.1',
		port: 3004,
		apiKey: 'my-access-key',
		defaultChannel: 'default'
});
	
swdClient.info('This is a sample information message').then(() => {
    console.log('Success');
}).catch((err) => {
    console.log('Unable to deliver notification');
});
```

# Documentation

To create the client instance use:

#### `swdClient = ServerWatchdogClient.create(options);`

##### `options`

###### `options.host`

Specifies the server host address.

###### `options.port`

Specifies the server port.

###### `options.useSsl`

Indicates if the connection to server must use a secure channel.

###### `options.apiKey`

Sets the key used to access the server. This is intended to be secret. The key must match the string configured in the server configuration.

###### `options.defaultChannel`

Sets the default channel to use when a channel is not specified on notification methods. Read the server documentation for details about channels.

###### `options.timeout` (optional)

Establishes the maximum time to use when sending messages to the server in millisecond units. A default value of ten (10) seconds is used if this option is not specified.

## Methods

###### `swdClient.error(message[, channel])`

Sends an error message to the server using the specified or default channel.

Returns a promise to indicate when delivery completes.

###### `swdClient.warn(message[, channel])`

Sends a warning message to the server using the specified or default channel.

Returns a promise to indicate when delivery completes.

###### `swdClient.info(message[, channel])`

Sends an information message to the server using the specified or default channel.

Returns a promise to indicate when delivery completes.

###### `swdClient.processWatch(pid, name[, severity[, channel]])`

Informs the server to monitor the specified process. `severity` can be `error`, `warn` or `info`. If not specified, `error` is used.

If the process is killed or exits with an exit code different than zero, the server will send the proper notification to the specified or default channel.

Returns a promise to indicate when delivery completes.

###### `swdClient.processUnwatch(pid[, channel])`

Informs the server to stop monitoring the specified process.
Returns a promise to indicate when delivery completes.

## License

See [LICENSE](LICENSE) file.
