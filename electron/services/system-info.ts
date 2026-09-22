import { cpus, totalmem, platform, arch } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface SystemInfo {
  platform: string
  arch: string
  cpuCores: number
  cpuModel: string
  totalRAM: number // in GB
  hasGPU: boolean
  gpuInfo?: string
  recommendedModel: WhisperModel
  canRunLarge: boolean
  canRunMedium: boolean
  estimatedSpeed: {
    tiny: string
    base: string
    small: string
    medium: string
    large: string
  }
}

export type WhisperModel =
  | 'tiny' | 'tiny.en'
  | 'base' | 'base.en'
  | 'small' | 'small.en'
  | 'medium' | 'medium.en'
  | 'large' | 'large-v2' | 'large-v3'

export interface WhisperModelInfo {
  id: WhisperModel
  name: string
  size: string
  parameters: string
  vramRequired: string
  ramRequired: number // in GB
  relativeSpeed: number // 1-10, 10 being fastest
  quality: number // 1-10, 10 being best
  languageSupport: 'multilingual' | 'english-only'
  description: string
  bestFor: string[]
  requirements: {
    minRAM: number
    minCores: number
    recommendedRAM: number
    recommendedCores: number
  }
}

export const WHISPER_MODELS: Record<WhisperModel, WhisperModelInfo> = {
  'tiny': {
    id: 'tiny',
    name: 'Tiny (Multilingual)',
    size: '~75 MB',
    parameters: '39M',
    vramRequired: '~1 GB',
    ramRequired: 2,
    relativeSpeed: 10,
    quality: 6,
    languageSupport: 'multilingual',
    description: 'Fastest model, good for quick notes in any language',
    bestFor: ['Real-time transcription', 'Quick notes', 'Low-end hardware', 'Multiple languages'],
    requirements: {
      minRAM: 2,
      minCores: 2,
      recommendedRAM: 4,
      recommendedCores: 4
    }
  },
  'tiny.en': {
    id: 'tiny.en',
    name: 'Tiny (English Only)',
    size: '~75 MB',
    parameters: '39M',
    vramRequired: '~1 GB',
    ramRequired: 2,
    relativeSpeed: 10,
    quality: 7,
    languageSupport: 'english-only',
    description: 'Fastest English-only model, better quality than multilingual tiny',
    bestFor: ['English meetings only', 'Real-time needs', 'Older computers'],
    requirements: {
      minRAM: 2,
      minCores: 2,
      recommendedRAM: 4,
      recommendedCores: 4
    }
  },
  'base': {
    id: 'base',
    name: 'Base (Multilingual)',
    size: '~142 MB',
    parameters: '74M',
    vramRequired: '~1.5 GB',
    ramRequired: 3,
    relativeSpeed: 9,
    quality: 7,
    languageSupport: 'multilingual',
    description: 'Good balance of speed and quality for multiple languages',
    bestFor: ['International meetings', 'Good speed + quality', 'Most laptops'],
    requirements: {
      minRAM: 3,
      minCores: 2,
      recommendedRAM: 6,
      recommendedCores: 4
    }
  },
  'base.en': {
    id: 'base.en',
    name: 'Base (English Only)',
    size: '~142 MB',
    parameters: '74M',
    vramRequired: '~1.5 GB',
    ramRequired: 3,
    relativeSpeed: 9,
    quality: 8,
    languageSupport: 'english-only',
    description: 'Fast and accurate for English-only content',
    bestFor: ['English meetings', 'Good accuracy', 'Fast processing'],
    requirements: {
      minRAM: 3,
      minCores: 2,
      recommendedRAM: 6,
      recommendedCores: 4
    }
  },
  'small': {
    id: 'small',
    name: 'Small (Multilingual)',
    size: '~466 MB',
    parameters: '244M',
    vramRequired: '~2 GB',
    ramRequired: 4,
    relativeSpeed: 7,
    quality: 8,
    languageSupport: 'multilingual',
    description: 'Recommended for most users - great quality, reasonable speed',
    bestFor: ['General use', 'Multiple languages', 'Professional meetings', 'Best balanced choice'],
    requirements: {
      minRAM: 4,
      minCores: 4,
      recommendedRAM: 8,
      recommendedCores: 4
    }
  },
  'small.en': {
    id: 'small.en',
    name: 'Small (English Only)',
    size: '~466 MB',
    parameters: '244M',
    vramRequired: '~2 GB',
    ramRequired: 4,
    relativeSpeed: 7,
    quality: 9,
    languageSupport: 'english-only',
    description: 'Excellent quality for English, recommended for English-only use',
    bestFor: ['English meetings', 'High accuracy needed', 'Technical discussions'],
    requirements: {
      minRAM: 4,
      minCores: 4,
      recommendedRAM: 8,
      recommendedCores: 4
    }
  },
  'medium': {
    id: 'medium',
    name: 'Medium (Multilingual)',
    size: '~1.5 GB',
    parameters: '769M',
    vramRequired: '~5 GB',
    ramRequired: 6,
    relativeSpeed: 5,
    quality: 9,
    languageSupport: 'multilingual',
    description: 'High quality for multiple languages, slower but very accurate',
    bestFor: ['Professional transcription', 'Complex vocabulary', 'Accents', 'High-end systems'],
    requirements: {
      minRAM: 6,
      minCores: 4,
      recommendedRAM: 12,
      recommendedCores: 8
    }
  },
  'medium.en': {
    id: 'medium.en',
    name: 'Medium (English Only)',
    size: '~1.5 GB',
    parameters: '769M',
    vramRequired: '~5 GB',
    ramRequired: 6,
    relativeSpeed: 5,
    quality: 9,
    languageSupport: 'english-only',
    description: 'Excellent English accuracy, handles accents and technical terms well',
    bestFor: ['Professional English transcription', 'Technical meetings', 'Legal/medical'],
    requirements: {
      minRAM: 6,
      minCores: 4,
      recommendedRAM: 12,
      recommendedCores: 8
    }
  },
  'large': {
    id: 'large',
    name: 'Large (Multilingual)',
    size: '~2.9 GB',
    parameters: '1550M',
    vramRequired: '~10 GB',
    ramRequired: 8,
    relativeSpeed: 3,
    quality: 10,
    languageSupport: 'multilingual',
    description: 'Best quality available, very slow, requires powerful hardware',
    bestFor: ['Maximum accuracy', 'Difficult audio', 'Multiple languages', 'Workstations only'],
    requirements: {
      minRAM: 8,
      minCores: 8,
      recommendedRAM: 16,
      recommendedCores: 8
    }
  },
  'large-v2': {
    id: 'large-v2',
    name: 'Large V2 (Multilingual)',
    size: '~2.9 GB',
    parameters: '1550M',
    vramRequired: '~10 GB',
    ramRequired: 8,
    relativeSpeed: 3,
    quality: 10,
    languageSupport: 'multilingual',
    description: 'Improved version of large model, better hallucination handling',
    bestFor: ['Professional use', 'Best quality needed', 'Complex audio'],
    requirements: {
      minRAM: 8,
      minCores: 8,
      recommendedRAM: 16,
      recommendedCores: 8
    }
  },
  'large-v3': {
    id: 'large-v3',
    name: 'Large V3 (Multilingual) - Latest',
    size: '~2.9 GB',
    parameters: '1550M',
    vramRequired: '~10 GB',
    ramRequired: 8,
    relativeSpeed: 3,
    quality: 10,
    languageSupport: 'multilingual',
    description: 'Latest and most accurate model, best hallucination reduction',
    bestFor: ['Latest quality', 'Production use', 'Best results', 'High-end hardware'],
    requirements: {
      minRAM: 8,
      minCores: 8,
      recommendedRAM: 16,
      recommendedCores: 8
    }
  }
}

export class SystemInfoService {
  private cachedInfo: SystemInfo | null = null

  async getSystemInfo(): Promise<SystemInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo
    }

    const cpuInfo = cpus()
    const totalRAM = Math.round(totalmem() / (1024 ** 3)) // Convert to GB

    const info: SystemInfo = {
      platform: platform(),
      arch: arch(),
      cpuCores: cpuInfo.length,
      cpuModel: cpuInfo[0]?.model || 'Unknown',
      totalRAM,
      hasGPU: false,
      recommendedModel: this.recommendModel(cpuInfo.length, totalRAM),
      canRunLarge: totalRAM >= 8 && cpuInfo.length >= 4,
      canRunMedium: totalRAM >= 6 && cpuInfo.length >= 4,
      estimatedSpeed: this.estimateSpeed(cpuInfo.length, totalRAM)
    }

    // Try to detect GPU (best effort)
    try {
      const gpuInfo = await this.detectGPU()
      info.hasGPU = gpuInfo.hasGPU
      info.gpuInfo = gpuInfo.info
    } catch (error) {
      console.log('GPU detection not available')
    }

    this.cachedInfo = info
    return info
  }

  private recommendModel(cores: number, ramGB: number): WhisperModel {
    // High-end system: 8+ cores, 16+ GB RAM
    if (cores >= 8 && ramGB >= 16) {
      return 'large-v3'
    }

    // Good system: 6+ cores, 12+ GB RAM
    if (cores >= 6 && ramGB >= 12) {
      return 'medium'
    }

    // Standard system: 4+ cores, 8+ GB RAM
    if (cores >= 4 && ramGB >= 8) {
      return 'small'
    }

    // Budget system: 4 cores, 4-8 GB RAM
    if (cores >= 4 && ramGB >= 4) {
      return 'base'
    }

    // Low-end system
    return 'tiny'
  }

  private estimateSpeed(cores: number, ramGB: number): SystemInfo['estimatedSpeed'] {
    // Rough estimates based on hardware
    const multiplier = Math.max(1, Math.min(cores / 4, ramGB / 8))

    return {
      tiny: this.formatSpeed(10 * multiplier),
      base: this.formatSpeed(8 * multiplier),
      small: this.formatSpeed(5 * multiplier),
      medium: this.formatSpeed(2 * multiplier),
      large: this.formatSpeed(1 * multiplier)
    }
  }

  private formatSpeed(speedFactor: number): string {
    // speedFactor = how many minutes of audio per minute of processing
    if (speedFactor >= 10) return '~Real-time (10x)'
    if (speedFactor >= 5) return '~Real-time (5x)'
    if (speedFactor >= 2) return '~2x slower'
    if (speedFactor >= 1) return '~Same as real-time'
    if (speedFactor >= 0.5) return '~2x slower'
    return '~4x+ slower'
  }

  private async detectGPU(): Promise<{ hasGPU: boolean; info?: string }> {
    const plat = platform()

    try {
      if (plat === 'darwin') {
        // macOS - check for Metal
        const { stdout } = await execAsync('system_profiler SPDisplaysDataType')
        const hasGPU = stdout.includes('Metal') || stdout.includes('GPU')
        return {
          hasGPU,
          info: hasGPU ? 'Metal GPU detected' : undefined
        }
      } else if (plat === 'win32') {
        // Windows - check for NVIDIA/AMD
        const { stdout } = await execAsync('wmic path win32_VideoController get name')
        const hasGPU = stdout.includes('NVIDIA') || stdout.includes('AMD') || stdout.includes('Intel')
        return {
          hasGPU,
          info: hasGPU ? stdout.split('\n')[1]?.trim() : undefined
        }
      } else {
        // Linux - check lspci
        const { stdout } = await execAsync('lspci | grep -i vga')
        const hasGPU = stdout.length > 0
        return {
          hasGPU,
          info: hasGPU ? stdout.trim() : undefined
        }
      }
    } catch (error) {
      return { hasGPU: false }
    }
  }

  canRunModel(model: WhisperModel, systemInfo: SystemInfo): boolean {
    const modelInfo = WHISPER_MODELS[model]
    return (
      systemInfo.totalRAM >= modelInfo.requirements.minRAM &&
      systemInfo.cpuCores >= modelInfo.requirements.minCores
    )
  }

  getModelPerformanceRating(model: WhisperModel, systemInfo: SystemInfo): 'excellent' | 'good' | 'fair' | 'slow' | 'too-slow' {
    const modelInfo = WHISPER_MODELS[model]

    if (systemInfo.totalRAM < modelInfo.requirements.minRAM ||
        systemInfo.cpuCores < modelInfo.requirements.minCores) {
      return 'too-slow'
    }

    if (systemInfo.totalRAM >= modelInfo.requirements.recommendedRAM &&
        systemInfo.cpuCores >= modelInfo.requirements.recommendedCores) {
      return 'excellent'
    }

    const ramRatio = systemInfo.totalRAM / modelInfo.requirements.recommendedRAM
    const coreRatio = systemInfo.cpuCores / modelInfo.requirements.recommendedCores

    const avgRatio = (ramRatio + coreRatio) / 2

    if (avgRatio >= 0.9) return 'good'
    if (avgRatio >= 0.7) return 'fair'
    return 'slow'
  }
}
