import { readdir } from 'node:fs/promises'
import { API_ENDPOINT, BUCKET_ENDPOINT, PASSWORD, USERNAME } from './constants'

// apps/icons directory に存在する icon が R2 bucket に存在するか確認する
// 存在しない場合は R2 bucket にアップロードする
const filenames = await readdir('./apps/icons')
for (const filename of filenames) {
  if (!filename.endsWith('.png') && !filename.endsWith('.svg')) {
    continue
  }
  // check exist in R2 bucket
  const existResponse = await fetch(`${BUCKET_ENDPOINT}/apps/icons/${filename}`)
  if (existResponse.ok) {
    console.debug(`Already exists: ${filename}`)
    continue
  }
  const fileStream = Bun.file(`./apps/icons/${filename}`).stream()
  const uploadResponse = await fetch(
    `${API_ENDPOINT}/v1/private/app/icon/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
        'Content-Type': filename.endsWith('.png')
          ? 'image/png'
          : 'image/svg+xml',
      },
      body: fileStream,
    },
  )
  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload ${filename}: ${uploadResponse.status} ${uploadResponse.statusText}`,
    )
  }
}
