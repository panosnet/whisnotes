import { create } from 'zustand'
import type { AudioDevice } from '../types'

interface AudioStore {
  isCapturing: boolean
  devices: AudioDevice[]
  selectedDeviceId?: string
  volumeLevel: number
  setCapturing: (capturing: boolean) => void
  setDevices: (devices: AudioDevice[]) => void
  setSelectedDevice: (deviceId: string) => void
  setVolumeLevel: (level: number) => void
}

export const useAudioStore = create<AudioStore>((set) => ({
  isCapturing: false,
  devices: [],
  volumeLevel: 0,

  setCapturing: (capturing) => set({ isCapturing: capturing }),
  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  setVolumeLevel: (level) => set({ volumeLevel: level }),
}))
