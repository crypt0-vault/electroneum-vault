var logger = require('electron-log');
const http = require('http');

let __helper_version = "0.0.1";
var appDir = process.env.PWD;

class ElectroneumRpcHelper
{

    constructor() {
        logger.info('RPC Helper :: Loaded v' + __helper_version);
    }

    /**
     * Daemon RPC Methods
     */
    stopDaemon() {
        let response = this.jsonRpcRequest({}, "/stop_daemon", 26968);
        return response;
    }

    /**
     * Wallet RPC Methods
     */
    getBalance() {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "getbalance"
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    getAddress() {
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "getaddress"
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    transfer(destinations = [], amount = 0, address = "", paymentId = "", getTxKey = "", priority = 1, doNotRelay = false, getTxHex = "") {
        let params = {};
        if(destinations.length > 0) {
            params.destinations = destinations;
        } else {
            params.amount = amount;
            params.address = address;
        }
        params.paymentId = paymentId;
        params.get_tx_key = getTxKey;
        params.priority = priority;
        params.do_not_relay = doNotRelay;
        params.get_tx_hex = getTxHex;

        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "transfer",
            params: params
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
    }

    getTransactions(inTxs = true, outTxs = true, pending = true, failed = true, pool = false, filterByHeight = false, minHeight = 0, maxHeight = 0) {
        let params = {};
        params.in = inTxs;
        params.out = outTxs;
        params.pending = pending;
        params.failed = failed;
        params.pool = pool;
        if(filterByHeight) {
            params.filter_by_height = filterByHeight,
            params.min_height = minHeight;
            params.max_height = maxHeight;
        }
        let body = {
            jsonrpc: "2.0",
            id: "0",
            method: "get_transfers",
            params: params
        }
        let response = this.jsonRpcRequest(body, "/json_rpc", 26970);
        return response;
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