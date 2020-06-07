# lisk-dex-ui

## Requirements

- Terminal/Console
- Git (setup steps: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- Node.js (installers: https://nodejs.org/en/download/)

## How to run from source (recommended)

Running this application directly from source on your own desktop is the most secure way to trade.

### To run for the first time (for traders):

1. Using the terminal, navigate to the directory where you want to install this app.
2. Clone this repository: `git clone https://github.com/Leasehold/lisk-dex-ui.git`
3. `cd lisk-dex-ui/lisk-dex-electron`
4. `npm install`
5. `npm run build-prod`
6. `npm run electron`

### To run every other time:

1. Using the terminal, navigate to the directory where you installed the app.
2. `cd lisk-dex-ui/lisk-dex-electron`
3. `npm run electron`

For development, use `npm run start` and view the running application at http://localhost:3000/
