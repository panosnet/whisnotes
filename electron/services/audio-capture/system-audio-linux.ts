import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'

export class SystemAudioLinux extends EventEmitter {
  private proc: ChildProcess | null = null

  async start(monitorSource: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.proc = spawn('arecord', [
        '-D', monitorSource,
        '-f', 'S16_LE',
        '-r', '16000',
        '-c', '1',
        '-t', 'raw',
      ])

      this.proc.stdout!.on('data', (chunk: Buffer) => {
        this.emit('audio-data', chunk)
        this.emit('volume-level', this.calcRms(chunk))
      })

      this.proc.on('error', (err: Error) => {
        reject(err)
        this.emit('error', err)
      })

      this.proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          const err = new Error(`arecord exited with code ${code}`)
          this.emit('error', err)
        }
      })

      // Give arecord a moment to start
      setTimeout(resolve, 300)
    })
  }

  stop(): void {
    this.proc?.kill('SIGTERM')
    this.proc = null
    this.emit('stopped')
  }

  private calcRms(buf: Buffer): number {
    const s = new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 2))
    let sum = 0
    for (const x of s) sum += (x / 32768) ** 2
    return Math.min(1, Math.sqrt(sum / (s.length || 1)) * 3)
  }
}
