import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^apps\/icons\/.+\.(png|svg)$/.test(v))

// Upload icon file
for (const filePath of filePathes) {
  const filename = filePath.split('apps/icons/')[1]
  const fileStream = Bun.file(filePath).stream()
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
