import { z } from 'zod'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^symbols\/.+\.json$/.test(v))

for (const filePath of filePathes) {
  console.log(`Registering symbol JSON: ${filePath}`)
  const category = filePath.split('symbols/')[1].split('.json')[0]
  const json = await Bun.file(filePath).json()
  const data = z.record(z.string()).parse(json)

  const response = await fetch(
    `${API_ENDPOINT}/v1/private/symbol/${category}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    },
  )
  if (!response.ok) {
    throw new Error(
      `Failed to register symbol JSON: ${response.status} ${response.statusText}`,
    )
  }
}
