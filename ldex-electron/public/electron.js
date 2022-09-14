// eslint-disable-next-line import/no-extraneous-dependencies
const electron = require('electron');

const { app } = electron;
const path = require('path');

const { BrowserWindow } = electron;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(
    `file://${path.join(__dirname, 'index.html')}`,
  );

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    electron.shell.openExternal(url);
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.destroy();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
