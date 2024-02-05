import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { appSchema } from '../scripts/schemas'

describe('Should valid app json', async () => {
  const filenames = await readdir('./apps')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`apps/${filename}`, async () => {
      const json = await Bun.file(`./apps/${filename}`).json()
      const result = appSchema.safeParse(json)
      expect(result.success).toBe(true)
    })
  }
})
