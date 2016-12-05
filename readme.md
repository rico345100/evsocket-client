# EvSocket Client
Client module of [evsocket](https://www.npmjs.com/package/evsocket).
Abstracted WebSocket module with event driven interface and rich functionalities.


## Why use this?
There is well-known alternative for this module, Socket.io, but unfortunately Socket.io doesn't support React Native, because it uses Node.js features inside.
This module built for provide highly abstracted WebSocket interface without any Node.js related features, only used pure JavaScript features.
When I was used WebSocket with vanila JS, it was really hard to make something rich.
EvSocket provides similar interface like Socket.io with only uses WebSocket + JavaScript features so it is safe to use any WebSocket supporting JavaScript platform.


## Features
- Event Driven Interface
- Easy Authentication
- Binary Transmission
- Middlewares
- Channel system(like Room in Socket.io)
- Socket Broadcasting
- And more...!


## API
### constructor EvSocket(string uri, object options)
Create new EvSocket. Available options are:
- string protocol: Set protocol

```javascript
var socket = new EvSocket('ws://localhost:3000');
socket.on('open', function() {
	console.log('Connected as ' + socket.id);
});
```

### EvSocket.prototype.close(void)
Close WebSocket.

```javascript
var socket = new EvSocket('ws://localhost:3000');
socket.on('open', function() {
	console.log('Connected as ' + socket.id);
	socket.close();
});
```

### EvSocket.prototype.send(string evName, object data)
Send the data with event name to client.

```javascript
var socket = new EvSocket('ws://localhost:3000');
...
socket.send('some-server-event', { a: 1, b: 2});
```

### EvSocket.prototype.sendBinary(string evName, ArrayBuffer data)
### EvSocket.prototype.sendBinary(string evName, TypedArray data)
Send the binary data with event name to client.

```javascript
var socket = new EvSocket('ws://localhost:3000');
...
socket.sendBinary('some-server-event', new Uint8Array([1,2,3,4,5,6,7,8]));
```
### EvSocket.prototype.on(string evName, function fn)
Add event listener.

### EvSocket.prototype.once(string evName, function fn)
Add event listener that execute only once and delete itself automatically.

### EvSocket.prototype.off(string evName[, function fn])
Remove event listener. If fn argument is undefined, remove all listeners in specified event name.

### EvSocket.prototype.emit(string evName[, object data])
Fires event of server socket.

### EvSocket.prototype.join(string channelName)
Join the specified channel.

```javascript
var socket = new EvSocket('ws://localhost:3000');

socket.on('channeljoin', (channelName) {
	console.log(channelName);
	socket.leave();
});

socket.on('channelleave', () => {
	console.log('Channel left.');
});

socket.join('channel1');
```

### EvSocket.prototype.leave(void)
Leave the current channel.

```javascript
var socket = new EvSocket('ws://localhost:3000');

socket.on('channeljoin', (channelName) {
	console.log(channelName);
	socket.leave();
});

socket.on('channelleave', () => {
	console.log('Channel left.');
});

socket.join('channel1');
```

### EvSocket.prototype.broadcast(string evName[, object data])
Broadcast message to users who currently in same channel.

```javascript
var socket = new EvSocket('ws://localhost:3000');
socket.on('open', () => {
	socket.join('channel1');
});
socket.on('channeljoin', (channelName) => {
	socket.broadcast('chat', `User ${socket.id} joined to ${channelName}.`);
});
```

## Events
You can use any name of the event, except these default events. These default events are triggering by EvSocket directly.

### onopen
Fired on EvSocket is ready.

### onauthenticated
Fired on EvSocket passed authentication.

### onunauthorized
Fired on EvSocket failed authentication. After this event occurs, socket will close.

### onclose
Fired on socket closed. Arguments are code and reason, please check this: [https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes)

### onerror
Fired on error occured. Has one argument, error object.

### onchanneljoin
Fired on user joined channel.

### onchannelleave
Fired on user left channel.