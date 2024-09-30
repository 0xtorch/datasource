import { stringify } from '@0xtorch/core'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { appSchema, type App } from './schemas'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^apps\/.+\.json$/.test(v))

const apps: App[] = []
for (const filePath of filePathes) {
  const json = await Bun.file(filePath).json()
  const app = appSchema.parse(json)
  apps.push(app)
}

// Register apps data
if (apps.length > 0) {
  const body = stringify(apps)
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
} else {
  console.log('No app data is selected.')
}
