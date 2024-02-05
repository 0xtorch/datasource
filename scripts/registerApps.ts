import { readdir } from 'node:fs/promises'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { appSchema, type App } from './schemas'

const apps: App[] = []
const filenames = await readdir('./apps')
for (const filename of filenames) {
  if (!filename.endsWith('.json')) {
    continue
  }
  const json = await Bun.file(`./apps/${filename}`).json()
  const app = appSchema.parse(json)
  apps.push(app)
}

// apps directory に存在する app 一覧を API 経由で登録する
const body = JSON.stringify(apps)
const response = await fetch(`${API_ENDPOINT}/v1/private/app`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
    'Content-Type': 'application/json',
  },
  body,
})
if (!response.ok) {
  throw new Error(
    `Failed to register apps: ${response.status} ${response.statusText}`,
  )
}
