(function() {
	"use strict";

	// from string-binary-attacher
	function attachStringToBinary(buffer, string) {
		if(!buffer instanceof ArrayBuffer) {
			throw new Error('First argument must be an ArrayBuffer instance.');
		}
		else if(!string) {
			return buffer;
		}

		var dv = new DataView(buffer);

		// [0]: Length of string(literally, length of string, not byte length)
		// [1 ~ string length * 2]: String Data
		// [...After...]: Original Data
		var newBufferSize = 1 + (string.length * 2) + buffer.byteLength;
		var newBuffer = new ArrayBuffer(newBufferSize);
		var ndv = new DataView(newBuffer);
		ndv.setUint8(0, string.length, true);
		
		// write string as Uint16
		for(var i = 0; i < string.length; i++) {
			var offset = 1 + (i*2);
			ndv.setUint16(offset, string.charCodeAt(i), true);
		}

		// write rest of data
		for(var i = 0; i < buffer.byteLength; i++) {
			var offset = 1 + (string.length * 2) + i;
			ndv.setUint8(offset, dv.getUint8(i));
		}

		return newBuffer;
	}
	function detachStringFromBinary(buffer) {
		if(!buffer instanceof ArrayBuffer) {
			throw new Error('First argument must be an ArrayBuffer instance.');
		}

		var dv = new DataView(buffer);
		var strLen = dv.getUint8(0, true);
		var extraRange = 1 + strLen * 2;
		var newBuffer = new ArrayBuffer(buffer.byteLength - (extraRange));
		var ndv = new DataView(newBuffer);
		var idx = 0;

		for(var i = extraRange; i < buffer.byteLength; i++) {
			ndv.setUint8(idx++, dv.getUint8(i));
		}

		return newBuffer;
	}
	function extractStringFromBinary(buffer) {
		if(!buffer instanceof ArrayBuffer) {
			throw new Error('First argument must be an ArrayBuffer instance.');
		}

		var dv = new DataView(buffer);
		var strLen = dv.getUint8(0, true);
		var str = '';

		for(var i = 0; i < strLen; i++) {
			var offset = 1 + (i*2);
			str += String.fromCharCode(dv.getUint16(offset, true));
		}

		return str;
	}

	function parseMetaData(recv) {
		try {
			recv = JSON.parse(recv);
		}
		catch(err) {
			throw new Error(err);
		}

		return {
			evName: recv.event,
			data: recv.data
		};
	}

	function EvSocket(uri, options) {
		if(typeof uri !== 'string') {
			throw new Error('EvSocket requires uri.');
		}

		options = options || {};

		this.socket = new WebSocket(uri, options.protocol);
		this.socket.binaryType = 'arraybuffer';
		this.ev = {};
		this.channelName = '';

		var authData = options.auth;

		// this.socket.onopen = (ev) => {
			// this.emit('open', ev);
		// };
		this.socket.onclose = (code, reason) => {
			this.emit('close', code, reason);
		};
		this.socket.onerror = (err) => {
			this.emit('error', err);
		};
		this.socket.onmessage = (ev) => {
			var recv = ev.data;

			if(typeof recv === 'string') {
				recv = parseMetaData(recv);

				if(recv.evName === '__evsock__::sync') {
					this.id = recv.data.id;
					this.emit('open');

					if(recv.data.hasAuth) {
						this.send('__evsock__::authenticate', authData || {});
					}
				}
				else if(recv.evName === '__evsock__::channeljoin') {
					this.channelName = recv.data;
					this.emit('channeljoin', recv.data);
				}
				else if(recv.evName === '__evsock__::channelleave') {
					this.emit('channelleave', recv.data);
					this.channelName = '';
				}
				else {
					this.emit(recv.evName, recv.data);
				}
			}
			else if(recv instanceof ArrayBuffer) {
				var metaData = extractStringFromBinary(recv);
				var buf = detachStringFromBinary(recv);

				recv = parseMetaData(metaData);
				this.emit(recv.evName, buf);
			}
			else {
				throw new Error('EvSocket currently only supports string transmission.');
			}
		};
	}
	EvSocket.prototype.close = function() {
		this.socket.close();
	};
	EvSocket.prototype.send = function(evName, data) {
		var obj = {
			event: evName,
			data: data
		};

		obj = JSON.stringify(obj);

		this.socket.send(obj);
	};
	EvSocket.prototype.sendBinary = function(evName, buffer) {
		buffer = buffer.buffer || buffer;	// If it is not ArrayBuffer and it's TypedArray, get buffer.

		var metaData = JSON.stringify({ event: evName });
		var newBuf = attachStringToBinary(buffer, metaData);

		this.socket.binaryType = 'arraybuffer';
		this.socket.send(newBuf);
	};
	EvSocket.prototype.on = function(evName, fn) {
		if(!this.ev[evName]) {
			this.ev[evName] = [];
		}

		this.ev[evName].push(fn);
		return this;
	};
	EvSocket.prototype.once = function(evName, fn) {
		if(!this.ev[evName]) {
			this.ev[evName] = [];
		}

		fn.once = true;
		this.ev[evName].push(fn);
		return this;
	};
	EvSocket.prototype.off = function(evName, fn) {
		if(typeof evName === 'undefined') {
			this.ev = [];
		}
		else if(typeof fn === 'undefined') {
			if(this.ev[evName]) {
				delete this.ev[evName]; 
			}
		}
		else {
			var evList = this.ev[evName] || [];

			for(var i = 0; i < evList.length; i++) {
				if(evList[i] === fn) {
					evList = evList.splice(i, 1);
					break;
				}
			}
		}

		return this;
	};
	EvSocket.prototype.emit = function(evName) {
		var evList = this.ev[evName] || [];
		var args = Array.prototype.slice.call(arguments);
		
		args.splice(0, 1);

		var newEvList = [];
		for(var i = 0; i < evList.length; i++) {
			var fn = evList[i];
			fn.apply(this, args);

			// remove function if it attached by once method.
			if(!fn.once) {
				newEvList.push(fn);
			}
		}

		this.ev[evName] = newEvList;
		return this;
	};
	EvSocket.prototype.join = function(channelName) {
		this.send('__evsock__::join-channel', channelName);
	};
	EvSocket.prototype.leave = function() {
		this.send('__evsock__::leave-channel');
	};
	EvSocket.prototype.broadcast = function(evName, msg) {
		if(this.channelName) {
			this.send('__evsock__::broadcast', {
				evName: evName,
				data: msg
			});
		}
	};

	// module export
	// CommonJS
	if (typeof exports === "object" && typeof module !== "undefined") {
		module.exports = EvSocket;
	}
	// RequireJS
	else if (typeof define === "function" && define.amd) {
		define(['EvSocket'], EvSocket);
	}
	else {
		var g;

		if (typeof window !== "undefined") {
			g = window;
		}
		else if (typeof global !== "undefined") {
			g = global;
		}
		else if (typeof self !== "undefined") {
			g = self;
		}

		g.EvSocket = EvSocket;
	}
})();