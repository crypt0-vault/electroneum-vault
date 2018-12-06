# Electroneum Vault

Copyright &copy; 2018 The Crypt0 Vault Team

## Branches

The project makes use of git flow. Branches contain code as follows:  

```master```
> Contain the code for the most recent release.

```develop```
> Contains bug-fixes / new features that will be in the next release, this branch should be considered un-stable and it is **not** recommended to be used in a production environment.

```release```
> Releases are created periodically when fixes / features are complete and considered ready for release. Currently there is no specific release cycle, releases are created at random.

```feature/<feature-name>```
> Contains code for a specific feature, code is likely incomplete.

```hotfix/<hotfix-reference>```
> Contains code to fix a specifc bug from the most recent release. These branches can be checked out to help test that the fix is working as expected.

## Progress

Currently this app is a work in progress and a long way from being production ready. Until the first release, all code will be committed directly to ```develop```. After the first release branches will be used as listed above.

The current to-do list is as follows:

- [ ] App Backend
  - [ ] Notifications
  - [X] Process Manager
    - [X] Start / Stop Daemon
    - [X] Start / Stop Wallet RPC
  - [ ] RPC Manager
    - [ ] Daemon RPC Commands [#3](https://github.com/crypt0-vault/electroneum-vault/issues/3)
    - [ ] Wallet RPC Commands [#2](https://github.com/crypt0-vault/electroneum-vault/issues/2)
- [ ] Main App
  - [ ] Calender Showing ETN Events
  - [ ] Calculator for ETN in different currencies
  - [X] Crypto News Page
  - [ ] Dashboard
    - [ ] Blockchain Stats
    - [ ] Manage Wallets (Multiple)
  - [ ] Wallet
    - [X] Balance / Locked Balance
    - [ ] Generate Integrated Address
    - [ ] Send / Receive Transactions
    - [ ] Transaction List
      - [X] Display Transactions
      - [ ] Export Transactions
        - [ ] CSV Format
        - [ ] Excel Format
        - [ ] JSON Format
      - [ ] View Transaction Info
  - [ ] Market Info
  - [ ] Notifications
  - [X] Settings Page
    - [ ] App
      - [X] Dark Mode
      - [ ] Debug Mode [#4](https://github.com/crypt0-vault/electroneum-vault/issues/4)
      - [ ] Launch on Startup
    - [ ] Daemon
      - [ ] Block Sync Size
      - [ ] Disable Local Daemon (Use Remote)
      - [X] Get Daemon Info
      - [ ] Log Level (Debug Mode Only) [#5](https://github.com/crypt0-vault/electroneum-vault/issues/5)
      - [ ] Remote Daemon (Only Settable if Local Disabled) [#5](https://github.com/crypt0-vault/electroneum-vault/issues/5)
      - [ ] Restart Daemon (Debug Mode Only) [#5](https://github.com/crypt0-vault/electroneum-vault/issues/5)
      - [ ] View Daemon Log (Debug Mode Only) [#5](https://github.com/crypt0-vault/electroneum-vault/issues/5)
    - [ ] Wallet
      - [ ] Change Language
      - [ ] Save Wallet
      - [ ] View Wallet Keys [#6](https://github.com/crypt0-vault/electroneum-vault/issues/6)
        - [ ] Mnemonic Seed
        - [ ] Spend Key
        - [ ] View Key
      - [ ] View Wallet Log (Debug Mode Only) [#5](https://github.com/crypt0-vault/electroneum-vault/issues/5)
- [X] Splash Screen
  - [X] Dependency Downloader
- [ ] Setup Wizard
  - [X] Choose Language
  - [X] Create Wallet
  - [ ] Open Existing Wallet
  - [ ] Import Offline Wallet
  - [ ] Restore Deterministic Wallet
- [ ] Switch CSS to SASS


## Running Locally

Anybody can clone and run the app on their local machine. You'll need to have Node & Git installed to get started.

Firstly, clone the repo
> ```git clone --recursive https://github.com/crypt0-vault/electroneum-vault```

Open the directory and install the dependencies
> ```cd electroneum-vault && npm install```

Once you've installed the dependencies you can run the app using
> ```npm start```

Or run the app in dev mode
> ```npm run dev```

Running the app in dev mode will enable additional debugging options inside the app. Please do not use dev mode unless you are confident with CSS / HTML / Javascript and wish to debug / develop the app
