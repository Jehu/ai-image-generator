// IPC-Adapter: ersetzt src/server/images.ts (Signaturen unverändert).
import { invoke } from '@tauri-apps/api/core'

export interface AnchorImageDTO {
  id: string
  dataUrl: string
}

export async function getImageDataUrl(opts: {
  data: { id: string }
}): Promise<{ dataUrl: string } | null> {
  return invoke<{ dataUrl: string } | null>('get_image_data_url', {
    input: opts.data,
  })
}

export async function getStyleAnchors(opts: {
  data: { styleId: string }
}): Promise<Array<AnchorImageDTO>> {
  return invoke<Array<AnchorImageDTO>>('get_style_anchors', { input: opts.data })
}

export async function addAnchorImage(opts: {
  data: { styleId: string; dataUrl: string }
}): Promise<{ imageId: string; anchorImageIds: Array<string> }> {
  return invoke('add_anchor_image', { input: opts.data })
}

export async function removeAnchorImage(opts: {
  data: { styleId: string; imageId: string }
}): Promise<{ anchorImageIds: Array<string> }> {
  return invoke('remove_anchor_image', { input: opts.data })
}
