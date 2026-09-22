import { existsSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const SOX_PATHS = [
  '/opt/homebrew/bin/sox',
  '/usr/local/bin/sox',
  '/usr/bin/sox',
]

export interface EnvCheckResult {
  sox: boolean
  python: boolean
  whisper: boolean
}

// Async to avoid blocking the Electron main-process event loop
export async function checkEnvironment(projectRoot: string): Promise<EnvCheckResult> {
  const sox = SOX_PATHS.some(p => existsSync(p))
  const venvPython = join(projectRoot, 'venv', 'bin', 'python3')
  const python = existsSync(venvPython)

  let whisper = false
  if (python) {
    try {
      await execAsync(`"${venvPython}" -c "import whisper"`, { timeout: 8000 })
      whisper = true
    } catch {
      whisper = false
    }
  }

  console.log(`[env-check] sox=${sox} python=${python} whisper=${whisper}`)
  return { sox, python, whisper }
}
