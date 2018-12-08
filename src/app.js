// Required third-party stuff
const electron = require('electron');
const {app, BrowserWindow, ipcMain} = electron;
const fs = require('fs');
const logger = require('electron-log');
const path = require('path');
const os = require('os');
const url = require('url');

// Helpers
const process_helper = require('./helpers/process_helper.js'); // Helper for running the daemon / wallet
const rpc_helper = require('./helpers/rpc_helper.js'); // Helper for RPC requests made to the daemon / wallet
const LocalStorageHelper = require('./helpers/local_storage_helper.js');

// Preferences
const UserPreferences = new LocalStorageHelper(
    {
        // We'll call our data file 'user-preferences'
        configName: 'user-preferences',
        defaults: {
            darkMode: false,
            daemonParameters: [
                "--log-level=0",
                "--block-sync-size=10"
            ],
            debugMode: false,
            testnet: false,
            walletDirs: {
                mainnet: path.join((electron.app || electron.remote.app).getPath('userData'), 'wallets'),
                testnet: path.join((electron.app || electron.remote.app).getPath('userData'), 'wallets', 'testnet')
            },
            walletManagerParameters: [
                '--rpc-bind-port=26970',
                '--disable-rpc-login',
                '--wallet-dir=' + path.join((electron.app || electron.remote.app).getPath('userData'), 'wallets')
            ]
        }
    }
);

const UserWallets = new LocalStorageHelper(
    {
        // We'll call our data file 'user-wallets'
        configName: 'user-wallets',
        defaults: {
            // 800x600 is the default size of our window
            wallet_file: {
                countryCode: "en",
                lang: "English",
                name: "wallet",
                path: path.join((electron.app || electron.remote.app).getPath('userData'), 'wallets')
            }
        }
    }
);

// Other
let getDaemonInfoInterval;
let icon = path.join(__dirname, 'assets/images/appicon.png');

// Windows
let currentWindow;
let mainWindow;
let setupWizardWindow;
let splashWindow;

app.on('ready', function() {
    currentWindow = splashWindow = new BrowserWindow({center: true, frame: false, height: 400, icon: icon, resizable: false, width: 600});
    splashWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'pages/splash/splash.html'),
        protocol: 'file:',
        slashes: true
    }));
    
    fetchAndUpdateAssets();
});

// app.on('activate-with-no-open-windows', function() {;
//     logger.info('Main :: Closing wallet');
//     rpc_helper.closeWallet()
//         .then((res) => {
//             logger.info('Main :: Wallet closed');
//             logger.info('Main :: Stopping daemon');
//             rpc_helper.stopDaemon()
//                 .then((res) => {
//                     logger.info('Main :: Daemon stopped');
//                     logger.info('Main :: Shutting down app; Goodbye!');
//                 }).catch((err) => {
//                     logger.error('Main :: Could not stop daemon');
//                 });
//         }).catch((err) => {
//             logger.error('Main :: Could not close wallet');
//         });
// });

function fetchAndUpdateAssets() {
    var asset_helper = require('./helpers/asset_helper.js'); // Helper for downloading / updating assets
    asset_helper.setBrowserWindow(splashWindow);
    asset_helper.setIsSplash(true);
    // Get's the latest release from github and downloads if its newer
    var resp = asset_helper.fetchLatestGithubRelease();
    resp.then((resp) => {
        process_helper.setBrowserWindow(splashWindow);
        process_helper.setElectroneumTag(asset_helper.getElectroneumTag());
        if(resp.method == "display-splash-message") { splashWindow.send(resp.method, resp.content); } // Update the displayed message
        let daemonParameters = UserPreferences.get("daemonParameters");
        switch(resp.method) {
            case 'start-install':
                asset_helper.doInstall()
                    .then(() => {
                        logger.info('Main :: Install Complete');
                        process_helper.startDaemon(daemonParameters)
                            .then(() => {
                                startApp();
                            });
                    }).catch((err) => {
                        logger.error('Main :: Install Failed');
                    });
                break;
            case 'extract-complete':
                process_helper.startDaemon(daemonParameters)
                    .then(() => {
                        startApp();
                    });
                break;
        }
    });
}

function startApp() {
    splashWindow.hide();
    // openMainWindow();
    // return true;
    // does not require the daemon to be running right away
    process_helper.startWalletManager(UserPreferences.get("walletManagerParameters"), ((UserPreferences.get("testnet")) ? UserPreferences.get("walletDirs").testnet : UserPreferences.get("walletDirs").mainnet))
        .then((res) => {
            let wallet_file = UserWallets.get('wallet_file');
            isTestnet = (UserPreferences.get("daemonParameters").indexOf("--testnet") != -1);
            if(wallet_file.name != null && wallet_file.path != null && ((!isTestnet) ? fs.existsSync(path.join(wallet_file.path, wallet_file.name)) : fs.existsSync(path.join(wallet_file.path, "testnet", wallet_file.name)))) {
                process_helper.portInUse(26970, function(portInUse){
                    if(!portInUse) {
                        setTimeout(function(){
                            rpc_helper.openWallet(wallet_file.name)
                            .then((resp) => {
                                if(typeof resp.result == "object") {
                                    currentWindow.hide();
                                    logger.info('Main :: Open main window');
                                    openMainWindow();
                                } else {
                                    logger.error('Main :: Could not open wallet \'' + wallet_file.name + '\' ' + resp);
                                }
                            });
                        }, 1000);
                    } else {
                        rpc_helper.openWallet(wallet_file.name)
                            .then((resp) => {
                                if(typeof resp.result == "object") {
                                    currentWindow.hide();
                                    logger.info('Main :: Open main window');
                                    openMainWindow();
                                } else {
                                    logger.error('Main :: Could not open wallet \'' + wallet_file.name + '\' ' + resp);
                                }
                            });
                    }
                });
            } else {
                openWizardWindow();
            }
        })
        .catch((err) => {
            logger.error('Main :: Error loading wallet manager ' + err);
        });
}

ipcMain.on("create-wallet", (event, arg) => {
    let wallet_file = UserWallets.get('wallet_file');
    wallet_file.countryCode = arg.countryCode;
    wallet_file.lang = arg.lang;

    UserWallets.set("wallet_file", wallet_file);
    rpc_helper.createWallet(wallet_file.lang, wallet_file.name)
        .then((response) => {
            if(typeof response.result == "object") {
                rpc_helper.openWallet(wallet_file.name)
                    .then((resp) => {
                        if(typeof resp.result == "object") {
                            currentWindow.hide();
                            openMainWindow();
                        } else {
                            logger.error('Main :: Could not open wallet; Response :: ' + response);
                        }
                    });
            } else {
                logger.error('Main :: Could not create wallet; Response :: ' + response.result);
            }
        });
});

ipcMain.on("update-balance", (event, arg) => {
    rpc_helper.getBalance()
        .then((response) => {
            currentWindow.send("balance-update", response);
        });
});

ipcMain.on("get-address", (event, arg) => {
    rpc_helper.getAddress()
        .then((response) => {
            currentWindow.send("wallet-address", response);
        });
});

ipcMain.on("get-transactions", (event, arg) => {
    rpc_helper.getTransactions()
        .then((response) => {
            currentWindow.send("latest-transactions", response);
        });
});

ipcMain.on("set-user-preference", (event, arg) => {
    UserPreferences.set(Object.keys(arg)[0], Object.values(arg)[0]);
});

ipcMain.on("get-config", (event, arg) => {
    console.log("send config to current Window")
    console.log("path " + UserPreferences.getJsonPath());
    currentWindow.send("config-location", UserPreferences.getJsonPath());
});

ipcMain.on("toggle-testnet", (event, arg) => {
    let daemonParameters = UserPreferences.get("daemonParameters");
    let walletDirs = UserPreferences.get("walletDirs");
    let walletManagerParameters = UserPreferences.get("walletManagerParameters");
    console.log("before change :: ", daemonParameters, walletManagerParameters);
    // if toggling on, use mainnet else use testnet to find the current index
    let index = walletManagerParameters.indexOf("--wallet-dir="+walletDirs.mainnet);
    let indexTestnet = walletManagerParameters.indexOf("--wallet-dir="+walletDirs.testnet);
    console.log('arg equals ' + arg);
    if(arg) {
        // Enable testnet
        if(daemonParameters.indexOf("--testnet") == -1) {
            daemonParameters.push("--testnet");
        }
        if(walletManagerParameters.indexOf("--testnet") == -1) {
            walletManagerParameters.push("--testnet");
        }
        if(walletManagerParameters[index] != "--wallet-dir="+walletDirs.testnet) {
            walletManagerParameters[index] = "--wallet-dir="+walletDirs.testnet;
        }
    } else {
        // Disable testnet
        if(daemonParameters.indexOf("--testnet") != -1) {
            console.log("remove testnet from daemon params");
            daemonParameters.pop(daemonParameters.indexOf("--testnet"));
        } else {
            console.log("param not in daemon params " + daemonParameters);
        }
        if(walletManagerParameters.indexOf("--testnet") != -1) {
            console.log("remove testnet from wallet manager params");
            walletManagerParameters.pop(walletManagerParameters.indexOf("--testnet"));
        } else {
            console.log("param not in wallet manager params " + walletManagerParameters);
        }
        walletManagerParameters[indexTestnet] = "--wallet-dir="+walletDirs.mainnet;
    }
    UserPreferences.set("daemonParameters", daemonParameters);
    UserPreferences.set("walletManagerParameters", walletManagerParameters);
    UserPreferences.set("testnet", arg);
    console.log("after change :: ", daemonParameters, walletManagerParameters);
    stopGetDaemonInfoInterval();
    rpc_helper.stopDaemon();
    rpc_helper.closeWallet();
    currentWindow.close();
    process_helper.startDaemon(UserPreferences.get("daemonParameters"));
    process_helper.startWalletManager(UserPreferences.get("walletManagerParameters"), ((arg) ? walletDirs.testnet : walletDirs.testnet));
    startGetDaemonInfoInterval();

    let wallet_file = UserWallets.get("wallet_file");
    // Check file exists
    if(wallet_file.name != null && fs.existsSync(path.join(((arg) ? walletDirs.testnet : walletDirs.mainnet), wallet_file.name))) {
        rpc_helper.openWallet(wallet_file.name);
        openMainWindow();
    } else {
        openWizardWindow();
    }
});

ipcMain.on("restart-daemon", (event, arg) => {
    stopGetDaemonInfoInterval();
    rpc_helper.stopDaemon();
    process_helper.startDaemon(UserPreferences.get("daemonParameters"));
    startGetDaemonInfoInterval();
});

function openMainWindow() {
    let windowHeight;
    startGetDaemonInfoInterval(); // Trigger the daemonGetInfoInterval
    if(os.platform() == "win32") { windowHeight = 870 } else { windowHeight = 843}
    currentWindow = mainWindow = new BrowserWindow({height: windowHeight, icon: icon, resizable: false, width: 1400});
    // splashWindow.hide();
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'pages/main/main.html'),
        protocol: 'file:',
        slashes: true
    }));
}

function openWizardWindow() {
    logger.info('Main :: Open Wizard Window');
    currentWindow = setupWizardWindow = new BrowserWindow({center: true, frame: false, height: 650, icon: icon, resizable: false, width: 500});
    setupWizardWindow.loadURL(url.format({
        // pathname: path.join(__dirname, 'pages/splash/splash.html'),
        pathname: path.join(__dirname, 'pages/wizard/wizard.html'),
        protocol: 'file:',
        slashes: true
    }));
}

function startGetDaemonInfoInterval(ms = 15000) {
    getDaemonInfoInterval = setInterval(function(){
        process_helper.getDaemonInfo().then((data) => {
            currentWindow.send("daemon-info", data);
        });
    }, ms)
}

function stopGetDaemonInfoInterval() {
    clearInterval(getDaemonInfoInterval);
}