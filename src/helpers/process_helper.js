const electron = require('electron');
const fs = require('fs');
const http = require('http');
const logger = require('electron-log');
const net = require('net');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawn;

let __helper_version = "0.0.1";
var appDir = process.env.PWD;
let currentWindow;
let electroneumTag;
let platform = os.platform();
if(platform == "win32") { platform = "win"; }

let daemonStatus;
let daemonVersion;

let isDev = ((process.argv.indexOf("--dev") == -1) ? false : true);

class ElectroneumProcessHelper {

    constructor() {
        logger.info('Process Helper :: Loaded v' + __helper_version);
    }

    setBrowserWindow(browserWindow) {
        currentWindow = browserWindow;
    }

    setElectroneumTag(tag) {
        electroneumTag = tag;
    }

    getDaemonVersion() {
        return this.daemonVersion;
    }

    getDaemonStatus() {
        return this.demonStatus;
    }

    /**
     * Start the electroneum daemon with now args
     * 
     * ToDo : Allow passing arguments to startup, allow configure args from the app settings
     */
    startDaemon(daemonParameters) {
        logger.info('Daemon Manager :: Starting daemon with the following parameteres ' + daemonParameters)

        return new Promise((resolve, reject) => {
            currentWindow.send("display-splash-message", "Starting electroneum daemon ...");
            const proc = spawn(path.join(appDir, 'bin/', electroneumTag, 'electroneumd'), daemonParameters);
        
            let _this = this;

            proc.once('error', error => {
                logger.error('Daemon Manager :: ' + error.toString('utf8'));
            });
        
            proc.stdout.on('data', data => {
                // data received from node - process it and display sync process
                if(data.toString('utf8').indexOf("src/daemon/main.cpp:280") != -1) {
                    let version = data.toString('utf8').split('\t');
                    let index = version.length - 1;
                    this.daemonVersion = version[index];
                    this.daemonStatus = "starting";
                } else if(data.toString('utf8').indexOf("The daemon will start synchronizing with the network. This may take a long time to complete.") != -1) {
                    // When we see this message, it means the daemon has started successfully and is now syncing the blockchain
                    // Let's display the sync progress on the splash screen so the user see's that something is actually happening
                    setTimeout(function(){
                        _this.fetchAndDisplaySyncProgress();
                    }, 3000);
                    this.daemonStatus = "connecting";
                } else if(data.toString('utf8').indexOf("src/cryptonote_protocol/cryptonote_protocol_handler.inl:1152") && data.toString('utf8').indexOf("Synced")) {
                    this.fetchAndDisplaySyncProgress();
                    this.daemonStatus = "syncing";
                }
                console.log(data.toString('utf8').trim());
                resolve(this.daemonStatus);
            });

            proc.stderr.on('data', data => {
                logger.error('Daemon Manager :: ' + data.toString('utf8'));
            });
        }).then((res) => {
            return res;
        }).catch((err) => {
            // This is never called
            return err;
        });
    }

    /**
     * Start the electroneum wallet manager - allows creation of wallets
     */
    startWalletManager(walletManagerParameters = [], walletDir) {
        return new Promise((resolve, reject) => {
            this.portInUse(26970, function(portInUse) {
                if(!portInUse) {
                    
                    // check wallet folder exists
                    if(!fs.existsSync(walletDir)) {
                        fs.mkdirSync(walletDir);
                    }

                    logger.info('Wallet Manager :: Starting wallet manager with the following parameteres ' + walletManagerParameters)
                    
                    currentWindow.send("display-splash-message", "Starting electroneum wallet manager ...");
                    const proc = spawn(path.join(appDir, 'bin/', electroneumTag, 'electroneum-wallet-rpc'), walletManagerParameters);
                
                    let _this = this;

                    proc.once('error', error => {
                        logger.error('Error :: Wallet Manager ' + error.toString('utf8'));
                        reject(error.toString('utf8'));
                    });
                
                    proc.stdout.on('data', data => {
                        logger.info('Wallet Manager :: Output :: ' + data.toString('utf8'));
                        if(data.toString('utf8').indexOf('Starting wallet rpc server')) {
                            resolve(true);
                        }
                    });

                    proc.stderr.on('data', data => {
                        logger.error('Error :: Wallet Manager ' + data.toString('utf8'));
                        reject(error.toString('utf8'));
                    });
                } else {
                    resolve(true);
                }
            });
        }).then((res) => {
            return res;
        }).catch((err) => {
            // This is never called
            return err;
        });;
    }

    getDaemonInfo() {
        return new Promise((resolve, reject) => {
            this.jsonRpcRequest({}, "/getinfo").then((data) => {
                resolve(data)
            });
        });
    }

    fetchAndDisplaySyncProgress() {
        this.jsonRpcRequest({}, "/getinfo").then((data) => {
            currentWindow.send("display-splash-message", "Syncing blockchain " + data.height + "/" + ((data.target_height == 0) ? data.height : data.target_height));
            if(typeof data.height == "number" && typeof data.target_height == "number" && data.target_height > 0) {
                var percentSynced = ((data.height / data.target_height) * 100);
                currentWindow.send("networkSyncing", percentSynced);
                if(percentSynced > 100) {
                    this.daemonStatus = "synced";
                }
            }
        });
    }

    jsonRpcRequest (body, path) {
        let requestJSON = JSON.stringify(body)
        // set basic headers
        let headers = {}
        headers['Content-Type'] = 'application/json'
        headers['Content-Length'] = Buffer.byteLength(requestJSON, 'utf8')
        // make a request to the wallet
        let options = {
          hostname: '127.0.0.1',
          port: '26968',
          path: (path != null ? path : '/json_rpc'),
          method: 'POST',
          headers: headers
        }
        let requestPromise = new Promise((resolve, reject) => {
            let data = ''
            let req = http.request(options, (res) => {
                res.setEncoding('utf8')
                res.on('data', (chunk) => {
                    data += chunk
                })
                res.on('end', function () {
                    let body = JSON.parse(data)
                    if (body && body.status == "OK") {
                        resolve(body)
                    } else if (body && body.error) {
                        resolve(body.error)
                    } else {
                        resolve('Wallet response error. Please try again.')
                    }
                })
            })
            req.on('error', (e) => resolve(e))
            req.write(requestJSON)
            req.end()
        })
        return requestPromise
    }

    portInUse (port, callback) {
        var server = net.createServer(function(socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });
    
        server.listen(port, '127.0.0.1');
        server.on('error', function (e) {
            callback(true);
        });
        server.on('listening', function (e) {
            server.close();
            callback(false);
        });
    }
    
}

module.exports = new ElectroneumProcessHelper();