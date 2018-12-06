var logger = require('electron-log');
const http = require('http');

let __helper_version = "0.0.1";
var appDir = process.env.PWD;

class ElectroneumRpcHelper
{

    constructor() {
        logger.info('RPC Helper :: Loaded v' + __helper_version);
    }

    createWallet(language, filename) {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "create_wallet",
            params: {
                filename: (filename != null) ? filename : "default",
                password: "password",
                language: (language != null) ? language : "English"
            }
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    openWallet(filename) {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "open_wallet",
            params: {
                filename: (filename != null) ? filename : "default",
                password: "password"
            }
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    getBalance() {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "getbalance",
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    queryKey(key) {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "query_key",
            params: {
                key_type: key
            }
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    saveWalletState() {
        // Stores the wallet - should be run periodically
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "store",
            params: {}
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", "26970");
        return response;
    }

    closeWallet() {
        // Stores and stops the wallet
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "stop_wallet",
            params: {}
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", "26970");
        return response;
    }

    stopDaemon() {
        let response = this.jsonRpcRequest({}, "/stop_daemon", 26968);
        return response;
    }

    jsonRpcRequest (body, path, port) {
        let requestJSON = JSON.stringify(body)
        // set basic headers
        let headers = {}
        headers['Content-Type'] = 'application/json'
        headers['Content-Length'] = Buffer.byteLength(requestJSON, 'utf8')
        // make a request to the wallet
        let options = {
          hostname: '127.0.0.1',
          port: (port != null) ? port : '26969',
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
                    let body = JSON.parse(data);
                    if (body && body.status == "OK" || typeof body.result == "object") {
                        resolve(body);
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
}

module.exports = new ElectroneumRpcHelper();