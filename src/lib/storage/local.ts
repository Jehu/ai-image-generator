import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { SavedImage, StorageAdapter } from './index'

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
}

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string

  constructor() {
    // relativ zum Projekt-Root (cwd des Dev-/Prod-Servers)
    this.baseDir = process.env.IMAGE_DIR ?? join('data', 'images')
  }

  private abs(relPath: string): string {
    return resolve(process.cwd(), relPath)
  }

  async saveBase64(base64: string, mime: string): Promise<SavedImage> {
    const ext = MIME_EXT[mime] ?? 'png'
    const relPath = join(this.baseDir, `${randomUUID()}.${ext}`)
    const absPath = this.abs(relPath)
    await mkdir(dirname(absPath), { recursive: true })
    await writeFile(absPath, Buffer.from(base64, 'base64'))
    return { path: relPath, mime }
  }

  async readAsBase64(relPath: string): Promise<{ data: string; mime: string }> {
    const buf = await readFile(this.abs(relPath))
    const ext = relPath.split('.').pop()?.toLowerCase() ?? 'png'
    return { data: buf.toString('base64'), mime: EXT_MIME[ext] ?? 'image/png' }
  }

  async remove(relPath: string): Promise<void> {
    await unlink(this.abs(relPath)).catch(() => {
      // Datei evtl. bereits weg — ignorieren
    })
  }
}
