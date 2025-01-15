import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { evmAddressWithoutChainIdSchema } from '../scripts/schemas'

describe('Should valid evm chain address json', async () => {
  const chainDirs = await readdir('./evms/chains')
  for (const chainDir of chainDirs) {
    if (chainDir.includes('.')) {
      continue
    }
    const filenames = await readdir(`./evms/chains/${chainDir}`)
    for (const filename of filenames) {
      if (!filename.endsWith('.json')) {
        continue
      }
      test(`evms/chains/${chainDir}/${filename}`, async () => {
        const json = await Bun.file(
          `./evms/chains/${chainDir}/${filename}`,
        ).json()
        const result = evmAddressWithoutChainIdSchema.safeParse(json)
        expect(result.success).toBe(true)
      })
    }
  }
})
