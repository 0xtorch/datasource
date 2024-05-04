import { evmAnalyzersSchema } from '@0xtorch/evm'
import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { evmAddressSchema } from '../scripts/schemas'

describe('Should valid evm chain address json', async () => {
  const chainDirs = await readdir('./evms/chains')
  for (const chainDir of chainDirs) {
    const filenames = await readdir(`./evms/chains/${chainDir}`)
    for (const filename of filenames) {
      if (!filename.endsWith('.json')) {
        continue
      }
      test(`evms/chains/${chainDir}/${filename}`, async () => {
        const json = await Bun.file(
          `./evms/chains/${chainDir}/${filename}`,
        ).json()
        const result = evmAddressSchema.safeParse(json)
        expect(result.success).toBe(true)
      })
    }
  }
})

describe('Should valid evm analyzers json', async () => {
  const filenames = await readdir('./evms/analyzers')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`evms/analyzers/${filename}`, async () => {
      const json = await Bun.file(`./evms/analyzers/${filename}`).json()
      const result = evmAnalyzersSchema.safeParse(json)
      if (!result.success) {
        console.log(result.error)
      }
      expect(result.success).toBe(true)
    })
  }
})
