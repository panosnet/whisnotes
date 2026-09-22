import { systemPreferences } from 'electron'

export async function checkScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true // Only macOS needs this permission
  }

  try {
    // Check if we have screen recording permission
    const status = systemPreferences.getMediaAccessStatus('screen')
    return status === 'granted'
  } catch (error) {
    console.error('Error checking screen recording permission:', error)
    return false
  }
}

export async function requestScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true
  }

  try {
    const hasPermission = await checkScreenRecordingPermission()

    if (!hasPermission) {
      console.log('Screen Recording permission not granted')
      console.log('Please grant permission in System Settings → Privacy & Security → Screen Recording')
      return false
    }

    return true
  } catch (error) {
    console.error('Error requesting screen recording permission:', error)
    return false
  }
}
