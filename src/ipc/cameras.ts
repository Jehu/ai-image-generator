// IPC-Adapter: ersetzt src/server/cameras.ts (Signaturen unverändert).
import { invoke } from '@tauri-apps/api/core'

export async function listCameraBodies(): Promise<Array<string>> {
  return invoke<Array<string>>('list_camera_bodies')
}

export async function addCameraBody(opts: {
  data: { name: string }
}): Promise<Array<string>> {
  return invoke<Array<string>>('add_camera_body', { input: opts.data })
}

export async function deleteCameraBody(opts: {
  data: { name: string }
}): Promise<Array<string>> {
  return invoke<Array<string>>('delete_camera_body', { input: opts.data })
}
