const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  onStart:   (cb) => ipcRenderer.on('overlay:start',   () => cb()),
  onStop:    (cb) => ipcRenderer.on('overlay:stop',    () => cb()),
  onSegment: (cb) => ipcRenderer.on('overlay:segment', () => cb()),
  stopRecording: () => ipcRenderer.send('overlay:stop-recording'),
})
