import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import {
  type LowerHex,
  analyzerSchema,
  createActions,
  createArbitrumOneChain,
  createAstarChain,
  createAstarZkEvmChain,
  createAvalancheCChain,
  createBaseChain,
  createBlastChain,
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
  createScrollChain,
  createZkFairChain,
  createZkSyncEraChain,
  createZoraChain,
  isHex,
  toLowerHex,
  transactionDecodedSchema,
} from '@0xtorch/evm'
import { z } from 'zod'

const chains = [
  createArbitrumOneChain({
    explorerApiKey: '',
  }),
  createAstarChain({}),
  createAstarZkEvmChain({}),
  createAvalancheCChain({
    explorerApiKey: '',
  }),
  createBaseChain({
    explorerApiKey: '',
  }),
  createBscChain({
    explorerApiKey: '',
  }),
  createBlastChain({
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
  createMantaPacificChain({}),
  createMantleChain({
    explorerApiKey: '',
  }),
  createMetisChain({}),
  createMoonbeamChain({
    explorerApiKey: '',
  }),
  createMoonriverChain({
    explorerApiKey: '',
  }),
  createOasysChain({}),
  createOptimismChain({
    explorerApiKey: '',
  }),
  createPolygonPosChain({
    explorerApiKey: '',
  }),
  createRoninChain(),
  createScrollChain({ explorerApiKey: '', explorerPageSize: 1000 }),
  createZkFairChain({}),
  createZkSyncEraChain({ explorerApiKey: '' }),
  createZoraChain({}),
]

describe('Should valid evm analyzers json', async () => {
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
        const examples = Array.isArray(analyzer.example)
          ? analyzer.example
          : [analyzer.example]
        for (const example of examples) {
          const chain = chains.find((chain) => chain.id === example.chainId)
          if (chain === undefined) {
            console.debug(`Chain not found: ${example.chainId}`)
            continue
          }
          const transaction = transactionDecodedSchema.parse(
            await Bun.file(
              `${import.meta.dir}/evm/${example.chainId}/${example.hash}.json`,
            ).json(),
          )

          // Act
          const result = createActions({
            chain,
            transaction,
            relatedAddresses: new Set(
              example.addresses
                .map((address) =>
                  isHex(address) ? toLowerHex(address) : undefined,
                )
                .filter(
                  (address): address is LowerHex => address !== undefined,
                ),
            ),
            jsonAnalyzers: [analyzer],
          })

          // Assert
          expect(result.length).toBeGreaterThan(0)
          expect(result.every(({ evidence }) => evidence !== 'none')).toBe(true)
          const actionTypes = new Set(result.map((action) => action.type))
          expect(
            analyzer.generators.some(({ type }) => actionTypes.has(type)),
          ).toBe(true)
        }
      }
    })
  }
})
