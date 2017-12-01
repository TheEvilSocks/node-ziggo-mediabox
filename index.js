/*
   Copyright 2017 TheEvilSocks

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


const Buttons = require("./buttons.json");
const net = require("net");


/**
 * Create a new MediaBox instance
 * @param {String} local_ip - The IP address of your mediabox.
 * @param {Object} options - Optional: sets extra options like connection port.
 * @return {MediaBox}
 */
function MediaBox(local_ip, options) {
	this.ip = local_ip;
	this.port = 5900;
	this.client = null;
	this.clientVersion = "";


	if(options && typeof options == "object"){
		if(options.port){
			if(typeof options.port == "number"){
				this.port = options.port;
			}else{
				throw new TypeError("'port' is not a number.");
			}
		}
	}else{
		if(options)
			throw new TypeError("'options' is not an object.");
	}

}


/**
 * Connect to the MediaBox. You need to call this function before attempting to send commands to it.
 * @return {Promise}
 */
MediaBox.prototype.connect = function() {
	return new Promise((fulfill, reject) => {
		var dataCounter = 0;

		this.client = new net.Socket();
		this.client.connect(this.port, this.ip, ()=>{}); //technically we could send our fulfill here, but we're waiting on the MediaBox to send all data just to be sure.

		this.client.on('data', (data) => {
			switch(dataCounter){
				case 0:
					/*
						First datapacket sent by the MediaBox is its version number. 
						Since we're not really a remote control, we'll just copy the MediaBox's version and send it back as our own version number.
					*/
					this.clientVersion = data;
					this.client.write(data);
					break;


				case 3:
					fulfill();
					break;

				default:
					break;
			}
			dataCounter++;
		});

		this.client.on('close', () => {
			this.client = null;
		});
	});
};


/**
 * Destroy the connection to the MediaBox.
 * @return {Promise}
 */
MediaBox.prototype.disconnect = function() {
	return new Promise((fulfill, reject) => {
		if(this.client){
			this.client.destroy();
			fulfill();
		}else{
			reject({code: 0x00, message: "No connection to MediaBox."});
		}
	});
};

/**
 * Send data to the MediaBox.
 * @param {String} key - Hex formatted data to send to the MediaBox.
 * @return {Promise}
 */
MediaBox.prototype.send_data = function(data) {
	return new Promise((fulfill, reject) => {
		if(this.client){
			this.client.write(Buffer.from(data, 'hex'));
			fulfill();
		}else{
			reject({code: 0x00, message: "No connection to MediaBox."});
		}
	});
}




/**
 * This emulates pressing buttons on your remote control.
 * @param {String} button - The name of the button to be pressed. Look at buttons.json for more info about button codes and names.
 * @return {Promise}
 */
MediaBox.prototype.pressButton = function(button) {
	return new Promise((fulfill, reject) => {
		let sys_button = Buttons.find(btn => btn.name == button);
		if(!sys_button){
			reject(new ReferenceError("'" + button +"' is not a button name."));
		}else{
			this.client.write(Buffer.from("040100000000" + sys_button.code, 'hex')); //Key down
			this.client.write(Buffer.from("040000000000" + sys_button.code, 'hex')); //Key up
			fulfill();
		}
	});
};


/**
 * This emulates pressing buttons on your remote control.
 * @param {String} button - The name of the button to be pressed. Look at buttons.json for more info about button codes and names.
 * @return {Promise}
 */
MediaBox.prototype.pressButtonHex = function(hex) {
	return new Promise((fulfill, reject) => {
		this.client.write(Buffer.from("040100000000" + hex, 'hex')); //Key down
		this.client.write(Buffer.from("040000000000" + hex, 'hex')); //Key up
		fulfill();
	});
};


module.exports = MediaBox;