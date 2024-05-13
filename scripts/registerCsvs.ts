import { csvFormatSchema } from '@0xtorch/csv'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^csvs\/.+\.json$/.test(v))

console.log('Registering csv:')
for (const filePath of filePathes) {
  console.log(`  ${filePath}`)
  const json = await Bun.file(filePath).json()
  const csvFormat = csvFormatSchema.parse(json)
  const response = await fetch(`${API_ENDPOINT}/v1/private/csv`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(csvFormat),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register csv: ${response.status} ${response.statusText}`,
    )
  }
}
