import { type ActionType, actionTypes, stringify } from '@0xtorch/core'
import {
  type Erc20Token,
  type EvmAddress,
  type InternalTransaction,
  type JsonAnalyzer,
  type LowerHex,
  type TransactionDecoded,
  type TransactionDetail,
  analyzerSchema,
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
  decodeTransaction,
  getTransactionDetail,
  isHex,
  toLowerHex,
} from '@0xtorch/evm'
import { z } from 'zod'

export const createEvmAnalyzerByTransaction = async () => {
  const chains = [
    createArbitrumOneChain({
      explorerApiKey: process.env.ARBITRUM_API_KEY,
    }),
    createAstarChain({}),
    createAstarZkEvmChain({}),
    createAvalancheCChain({
      explorerApiKey: process.env.AVALANCHE_API_KEY,
    }),
    createBaseChain({
      explorerApiKey: process.env.BASE_API_KEY,
    }),
    createBscChain({
      explorerApiKey: process.env.BSC_API_KEY,
    }),
    createBlastChain({
      explorerApiKey: process.env.BLAST_API_KEY,
    }),
    createEthereumChain({
      explorerApiKey: process.env.ETHEREUM_API_KEY,
    }),
    createFantomChain({
      explorerApiKey: process.env.FANTOM_API_KEY,
    }),
    createLineaChain({
      explorerApiKey: process.env.LINEA_API_KEY,
    }),
    createMantaPacificChain({}),
    createMantleChain({
      explorerApiKey: process.env.MANTLE_API_KEY,
    }),
    createMetisChain({}),
    createMoonbeamChain({
      explorerApiKey: process.env.MOONBEAM_API_KEY,
    }),
    createMoonriverChain({
      explorerApiKey: process.env.MOONRIVER_API_KEY,
    }),
    createOasysChain({}),
    createOptimismChain({
      explorerApiKey: process.env.OPTIMISM_API_KEY,
    }),
    createPolygonPosChain({
      explorerApiKey: process.env.POLYGON_API_KEY,
    }),
    createRoninChain(),
    createScrollChain({
      explorerApiKey: process.env.SCROLL_API_KEY,
      explorerPageSize: 1000,
    }),
    createZkFairChain({}),
    createZkSyncEraChain({ explorerApiKey: process.env.ZKSYNC_API_KEY }),
    createZoraChain({}),
  ]

  const chainId = Number.parseInt(process.env.CHAIN ?? '1', 10)
  const chain = chains.find((c) => c.id === chainId)
  if (chain === undefined) {
    throw new Error(`Unknown chain ID: ${chainId}`)
  }
  const hashText = process.env.HASH ?? ''
  if (!isHex(hashText)) {
    throw new Error('Invalid HASH environment variable.')
  }
  const hash = toLowerHex(hashText)
  const addressTexts = (process.env.ADDRESS ?? '').split(',')
  const relatedAddresses = new Set<LowerHex>()
  for (const address of addressTexts) {
    if (isHex(address)) {
      relatedAddresses.add(toLowerHex(address))
    }
  }
  if (relatedAddresses.size === 0) {
    throw new Error('No related addresses.')
  }
  const actionTypeText = process.env.ACTION ?? ''
  if (!actionTypes.includes(actionTypeText as ActionType)) {
    throw new Error('Invalid ACTION environment variable.')
  }
  const actionType = actionTypeText as ActionType

  let internalTransactions: InternalTransaction[] = []
  try {
    internalTransactions =
      await chain.explorer.getInternalTransactionOfTransaction({
        hash,
      })
  } catch (error) {
    console.debug(error)
  }
  const transaction = await getTransactionDetail({
    chain,
    hash,
    internalTransactions,
  })

  const { addresses, erc20Tokens, eventAbis, functionAbis } =
    await getDataForDecode(transaction)

  const decoded = decodeTransaction({
    transaction,
    addresses,
    erc20Tokens,
    eventAbis,
    functionAbis,
    nfts: [],
  })

  // decoded transaction から Analyzer 作成
  const jsonAnalyzer = createJsonAnalyzer(decoded, actionType, relatedAddresses)

  // Analyzer JSON に保存・既存ファイルがある場合は最後に追加
  const analyzerFilePath = `${import.meta.dir}/../evms/analyzers/${jsonAnalyzer.condition.function.id}.json`
  const currentAnalyzerFile = Bun.file(analyzerFilePath)
  const currentIsExist = await currentAnalyzerFile.exists()
  if (currentIsExist) {
    const parsed = z
      .array(analyzerSchema)
      .safeParse(await currentAnalyzerFile.json())
    if (!parsed.success) {
      console.debug(parsed.error)
      await Bun.write(analyzerFilePath, stringify([jsonAnalyzer], undefined, 2))
    } else {
      const analyzers = [...parsed.data, jsonAnalyzer]
      await Bun.write(analyzerFilePath, stringify(analyzers, undefined, 2))
    }
  } else {
    await Bun.write(analyzerFilePath, stringify([jsonAnalyzer], undefined, 2))
  }

  // decoded transaction を test 用データとして JSON に保存
  await Bun.write(
    `${import.meta.dir}/../tests/evm/${chain.id}/${decoded.hash}.json`,
    stringify(decoded, undefined, 2),
  )
}

const getDataForDecode = async (
  transaction: TransactionDetail,
): Promise<{
  addresses: EvmAddress[]
  erc20Tokens: Erc20Token[]
  eventAbis: { signature: LowerHex; indexedCount: number; abi: string }[]
  functionAbis: string[]
}> => {
  // address
  const addresses = new Set<LowerHex>()
  // erc20 token
  const erc20Addresses = new Set<LowerHex>()
  // event abi
  const eventSignatures = new Set<LowerHex>()
  // function abi
  let functionId: LowerHex | undefined

  addresses.add(transaction.from)
  if (transaction.to !== undefined) {
    addresses.add(transaction.to)
  }
  for (const log of transaction.logs) {
    addresses.add(log.address)
    if (
      log.topics.length > 0 &&
      (log.eventName === undefined || log.args === undefined)
    ) {
      eventSignatures.add(log.topics[0])
    }
  }
  if (transaction.input.length >= 10) {
    const slicedInput = transaction.input.slice(0, 10)
    if (isHex(slicedInput)) {
      functionId = toLowerHex(slicedInput)
    }
  }
  for (const erc20Transfer of transaction.erc20Transfers) {
    erc20Addresses.add(erc20Transfer.address)
  }

  const eventAbis: {
    signature: `0x${Lowercase<string>}`
    indexedCount: number
    abi: string
  }[] = []
  if (eventSignatures.size > 0) {
    const eventAbiUrl = new URL('/v1/evm/event', process.env.API_ENDPOINT)
    for (const signature of eventSignatures) {
      eventAbiUrl.searchParams.append('signatures', signature)
    }
    const eventAbiResponse = await fetch(eventAbiUrl.toString())
    if (!eventAbiResponse.ok) {
      throw new Error(
        `Failed to fetch event ABI: ${eventAbiResponse.status} ${eventAbiResponse.statusText}`,
      )
    }
    const abis = z
      .array(
        z.object({
          signature: z
            .string()
            .transform((v) => (isHex(v) ? toLowerHex(v) : '0x')),
          indexedCount: z.number().int(),
          abi: z.string(),
        }),
      )
      .parse(await eventAbiResponse.json())
    eventAbis.push(...abis)
  }

  const functionAbis: string[] = []
  if (functionId !== undefined) {
    const functionAbiResponse = await fetch(
      new URL(
        `/v1/evm/function/${functionId}`,
        process.env.API_ENDPOINT,
      ).toString(),
    )
    if (!functionAbiResponse.ok) {
      throw new Error(
        `Failed to fetch function ABI: ${functionAbiResponse.status} ${functionAbiResponse.statusText}`,
      )
    }
    const result = z
      .array(z.object({ abi: z.string() }))
      .parse(await functionAbiResponse.json())
    functionAbis.push(...result.map((r) => r.abi))
  }

  return {
    addresses: [...addresses].map((address) => ({
      chainId: transaction.chainId,
      address,
    })),
    erc20Tokens: [...erc20Addresses].map((address) => ({
      address: address,
      name: '',
      symbol: '',
      decimals: 0,
      currency: {
        type: 'CryptoCurrency',
        id: `evm_${transaction.chainId}_${address}`,
        name: '',
        symbol: '',
        updatedAt: 0,
      },
    })),
    eventAbis,
    functionAbis,
  }
}

const createJsonAnalyzer = (
  transaction: TransactionDecoded,
  actionType: ActionType,
  relatedAddresses: Set<LowerHex>,
): JsonAnalyzer => {
  return {
    example: {
      chainId: transaction.chainId,
      hash: transaction.hash,
      addresses: [...relatedAddresses],
    },
    condition: {
      related: {
        type: 'array-in',
        not: relatedAddresses.has(transaction.from.address) ? undefined : true,
        values: [{ type: 'from' }],
      },
      value:
        transaction.value > 0n
          ? {
              type: 'between',
              min: 1n,
            }
          : {
              type: 'between',
              max: 0n,
            },
      function: {
        id: transaction.input.slice(0, 10),
        interface: transaction.function?.interface,
      },
      logs: {
        type: 'exact',
        patterns: transaction.logs.map((log) => ({
          signature: log.topics[0],
          indexedCount: log.topics.length - 1,
        })),
      },
    },
    generators: [
      {
        type: actionType,
        transfers: [
          {
            type: 'value',
            direction: 'in',
            from: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            value: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'value',
            direction: 'out',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            value: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'internal',
            direction: 'in',
            from: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            value: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'internal',
            direction: 'out',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            value: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'internal',
            direction: 'none',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            value: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc20',
            direction: 'in',
            from: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc20',
            direction: 'out',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc20',
            direction: 'none',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc721',
            direction: 'in',
            from: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
          },
          {
            type: 'erc721',
            direction: 'out',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
          },
          {
            type: 'erc721',
            direction: 'none',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
          },
          {
            type: 'erc1155',
            direction: 'in',
            from: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc1155',
            direction: 'out',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              not: true,
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
          {
            type: 'erc1155',
            direction: 'none',
            from: {
              type: 'array-in',
              values: ['related'],
            },
            to: {
              type: 'array-in',
              values: ['related'],
            },
            amount: {
              type: 'between',
              min: 1n,
            },
          },
        ],
      },
    ],
  }
}

await createEvmAnalyzerByTransaction()
