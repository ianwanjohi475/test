// SimuPBX desktop shell — wraps the web app in a native window.
// Expects the web app on :3000 and the API on :4000 (run-desktop.sh starts both).

const { app, BrowserWindow, shell } = require('electron');
const http = require('http');

const APP_URL = process.env.SIMUPBX_URL || 'http://localhost:3000';

function waitForServer(url, cb, attempt = 0) {
  const req = http.get(url, () => cb());
  req.on('error', () => {
    if (attempt > 120) return cb(); // give up waiting, show whatever loads
    setTimeout(() => waitForServer(url, cb, attempt + 1), 1000);
  });
  req.end();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 380,
    minHeight: 640,
    backgroundColor: '#070B14',
    autoHideMenuBar: true,
    title: 'SimuPBX',
    webPreferences: { contextIsolation: true },
  });

  // External links open in the real browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  waitForServer(APP_URL, () => win.loadURL(APP_URL));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
