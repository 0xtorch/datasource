import { csvFormatSchema } from '@0xtorch/csv'
import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'

describe('Should valid csv format json', async () => {
  const filenames = await readdir('./csvs')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`csvs/${filename}`, async () => {
      const json = await Bun.file(`./csvs/${filename}`).json()
      const result = csvFormatSchema.safeParse(json)
      if (!result.success) {
        console.log(result.error)
      }
      expect(result.success).toBe(true)
    })
  }
})
