import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import {
  type LowerHex,
  analyzerSchema,
  createActions,
  createArbitrumOneChain,
  createAstarChain,
  createAvalancheCChain,
  createBaseChain,
  createBscChain,
  createEthereumChain,
  createFantomChain,
  createLineaChain,
  createMantaPacificChain,
  createMantleChain,
  createMetisChain,
  createMoonbeamChain,
  createMoonriverChain,
  createOasysChain,
  createOptimismChain,
  createPolygonPosChain,
  createRoninChain,
  isHex,
  toLowerHex,
  transactionDecodedSchema,
} from '@0xtorch/evm'
import { z } from 'zod'
import { evmAddressWithoutChainIdSchema } from '../scripts/schemas'

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
        const result = evmAddressWithoutChainIdSchema.safeParse(json)
        expect(result.success).toBe(true)
      })
    }
  }
})

const chains = [
  createArbitrumOneChain({
    explorerApiKey: '',
  }),
  createAstarChain(),
  createAvalancheCChain({
    explorerApiKey: '',
  }),
  createBaseChain({
    explorerApiKey: '',
  }),
  createBscChain({
    explorerApiKey: '',
  }),
  createEthereumChain({
    explorerApiKey: '',
  }),
  createFantomChain({
    explorerApiKey: '',
  }),
  createLineaChain({
    explorerApiKey: '',
  }),
  createMantaPacificChain(),
  createMantleChain({
    explorerApiKey: '',
  }),
  createMetisChain(),
  createMoonbeamChain({
    explorerApiKey: '',
  }),
  createMoonriverChain({
    explorerApiKey: '',
  }),
  createOasysChain(),
  createOptimismChain({
    explorerApiKey: '',
  }),
  createPolygonPosChain({
    explorerApiKey: '',
  }),
  createRoninChain(),
]

describe.skip('Should valid evm analyzers json', async () => {
  const filenames = await readdir('./evms/analyzers')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`evms/analyzers/${filename}`, async () => {
      const json = await Bun.file(`./evms/analyzers/${filename}`).json()
      const result = z.array(analyzerSchema).safeParse(json)
      if (!result.success) {
        console.log(result.error)
        throw result.error
      }
      expect(result.success).toBe(true)

      for (const analyzer of result.data) {
        if (analyzer.example === undefined) {
          continue
        }
        const chain = chains.find(
          (chain) => chain.id === analyzer.example?.chainId,
        )
        if (chain === undefined) {
          console.debug(`Chain not found: ${analyzer.example.chainId}`)
          continue
        }
        const transaction = transactionDecodedSchema.parse(
          await Bun.file(
            `${import.meta.dir}/evm/${analyzer.example.chainId}/${analyzer.example.hash}.json`,
          ).json(),
        )

        // Act
        const result = createActions({
          chain,
          transaction,
          relatedAddresses: new Set(
            analyzer.example.addresses
              .map((address) =>
                isHex(address) ? toLowerHex(address) : undefined,
              )
              .filter((address): address is LowerHex => address !== undefined),
          ),
          jsonAnalyzers: [analyzer],
        })

        // Assert
        expect(result.length).toBeGreaterThan(0)
        const actionTypes = new Set(result.map((action) => action.type))
        for (const generator of analyzer.generators) {
          expect(actionTypes).toContain(generator.type)
        }
      }
    })
  }
})
