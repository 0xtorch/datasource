import { solanaAnalyzersJsonSchema } from '@0xtorch/solana'
import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'

describe('Should valid solana analyzers json', async () => {
  const filenames = await readdir('./solanas/analyzers')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`solanas/analyzers/${filename}`, async () => {
      const json = await Bun.file(`./solanas/analyzers/${filename}`).json()
      const result = solanaAnalyzersJsonSchema.safeParse(json)
      if (!result.success) {
        console.log(result.error)
      }
      expect(result.success).toBe(true)
    })
  }
})
