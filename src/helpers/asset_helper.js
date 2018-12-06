const decompress = require('decompress');
const {download} = require("electron-dl");
const electron = require('electron');
const { BrowserWindow } = electron;
const fs = require('fs');
const github = require('octonode');
const githubClient = github.client();
const logger = require('electron-log');
const os = require('os');
const path = require('path');

let __helper_version = "0.0.1";
var appDir = process.env.PWD;
let availableDownloads = [];
let currentWindow;
let electroneumTag;
let isSplash = false;
let platform = os.platform();
if(platform == "win32") { platform = "win"; }

class AssetHelper {

    constructor() {
        logger.info("Asset Helper :: Loaded v" + __helper_version);
    }

    setBrowserWindow(browserWindow) {
        currentWindow = browserWindow;
    }

    setIsSplash(bool) {
        isSplash = bool;
    }

    getElectroneumTag() {
        return electroneumTag;
    }

    fetchLatestGithubRelease() {
        return new Promise((resolve, reject) => {
            githubClient.get('/repos/electroneum/electroneum/releases/latest', function (err, status, body, headers) {
                const tag = body.tag_name;
                electroneumTag = tag;
                availableDownloads[tag] = [];
                for(let i in body.assets) {
                    var fullAssetName = body.assets[i].name;
                    var assetPartials = fullAssetName.split("-");
                    // Rewrite the platform names to match node.js platform names
                    switch(assetPartials[1]) {
                        case 'macOS':
                            assetPartials[1] = 'darwin';
                            break;
                        case 'windows':
                            assetPartials[1] = 'win32';
                            break;
                    }
                    availableDownloads[tag][assetPartials[1]] = {
                        arch: assetPartials[2],
                        filename: fullAssetName,
                        size: body.assets[i].size,
                        url: body.assets[i].browser_download_url
                    }
                }
        
                // Create directory if required
                if(!fs.existsSync(path.join(appDir, 'bin/', tag))) {
                    console.log('Create directory for version being downloaded ... ' + path.join(appDir, 'bin/', tag));
                    fs.mkdirSync(path.join(appDir, 'bin/', tag));
                } else {
                    // Check to see if the file is already downloaded
                    if(fs.existsSync(path.join(appDir, 'bin/', tag, availableDownloads[tag][platform].filename))) {
                        // Check the daemon file exists
                        if(fs.existsSync(path.join(appDir, 'bin/', tag, "electroneumd"))) {
                            resolve({method: 'extract-complete'});
                        } else {
                            // The file is downloaded so now send the trigger to unzip the package
                            resolve({method: 'start-install'});
                        }
                        return;
                    }
                }

                if(isSplash) {
                    // Display message if window is splash
                    currentWindow.send("display-splash-message", "Downloading dependencies ...");
                }

                logger.info('AssetHelper :: Downloading dependencies')
    
                // Download the file from github - once the file is downloaded so now send the trigger to unzip the package
                download(currentWindow, availableDownloads[tag][platform].url, {directory: path.join(appDir, 'bin/', tag)})
                    .then(dl => resolve({method: 'start-install', content: ''}));
            });
        }).then(({method, content}) => {
            // res holds the command to send back to the browser window
            return {method, content};
        }).catch((err) => {
            // This is never called
            return false;
        });
    }

    doInstall() {
        logger.info('Asset Helper :: Installing dependencies');
        currentWindow.send("display-splash-message", "Installing dependencies ...");
        return new Promise((resolve, reject) => {
            decompress(
                path.join(appDir, 'bin/', electroneumTag, availableDownloads[electroneumTag][platform].filename), 
                path.join(appDir, 'bin/', electroneumTag)
            ).then(files => {
                resolve();
            });
        });
    }

    parent() {
        return this;
    }
}

module.exports = new AssetHelper();