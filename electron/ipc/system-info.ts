import { ipcMain } from 'electron'
import { SystemInfoService } from '../services/system-info.js'

const systemInfoService = new SystemInfoService()

export function registerSystemInfoHandlers() {
  ipcMain.handle('get-system-info', async () => {
    try {
      const info = await systemInfoService.getSystemInfo()
      return info
    } catch (error: any) {
      console.error('Failed to get system info:', error)
      throw new Error(`System info error: ${error.message}`)
    }
  })

  console.log('System info IPC handlers registered')
}
