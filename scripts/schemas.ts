import { z } from 'zod'
import { isHex, toLowerHex } from './hex'

export const appSchema = z.object({
  id: z.string(),
  categories: z.array(
    z.union([
      z.literal('bridge'),
      z.literal('cex'),
      z.literal('cross-chain'),
      z.literal('dex'),
      z.literal('lending'),
      z.literal('nft-marketplace'),
      z.literal('other'),
    ]),
  ),
  name: z.string(),
  description: z.string().optional(),
  website: z.string().optional(),
  icon: z.string().optional(),
})

export type App = z.infer<typeof appSchema>

export const evmAddressSchema = z.object({
  address: z
    .string()
    .regex(/^0x[\da-fA-F]{40}$/)
    .transform((x) => x.toLowerCase()),
  label: z.string().optional(),
  app: z.string().optional(),
  abi: z.string().optional(),
})

export type EvmAddress = Omit<z.infer<typeof evmAddressSchema>, 'app'> & {
  readonly appId: string | undefined
  readonly chainId: number
}

const logArgumentPatternToLowerCaseValueSchema = z.object({
  type: z.literal('to-lower-string-value'),
  index: z.number().int(),
  value: z.string().transform((x) => x.toLowerCase()),
})

const logsPatternPartialSchema = z
  .object({
    matchType: z.literal('partial'),
    signature: z
      .string()
      .regex(/^0x[\dA-Fa-f]{64}$/)
      .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
    indexedCount: z.number().int(),
    logCount: z.number().int().optional(),
    args: z.array(logArgumentPatternToLowerCaseValueSchema).optional(),
  })
  .transform((x) => ({
    ...x,
    logCount: x.logCount,
    args: x.args,
  }))

const logsPatternExactSchema = z.object({
  matchType: z.literal('exact'),
  items: z.array(
    z
      .object({
        signature: z
          .string()
          .regex(/^0x[\dA-Fa-f]{64}$/)
          .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
        indexedCount: z.number().int(),
        args: z.array(logArgumentPatternToLowerCaseValueSchema).optional(),
      })
      .transform((x) => ({
        ...x,
        args: x.args,
      })),
  ),
})

const logsPatternSchema = z.union([
  logsPatternPartialSchema,
  logsPatternExactSchema,
])

const internalsPatternPartialSchema = z
  .object({
    type: z.literal('partial'),
    from: z
      .string()
      .regex(/^0x[\dA-Fa-f]{40}$/)
      .transform((x) => (isHex(x) ? toLowerHex(x) : '0x'))
      .optional(),
    to: z
      .string()
      .regex(/^0x[\dA-Fa-f]{40}$/)
      .transform((x) => (isHex(x) ? toLowerHex(x) : '0x'))
      .optional(),
    value: z.union([z.literal('plus'), z.literal('zero')]).optional(),
    count: z.number().int().optional(),
  })
  .transform((x) => ({
    ...x,
    from: x.from,
    to: x.to,
    value: x.value,
    count: x.count,
  }))

const internalsPatternSchema = internalsPatternPartialSchema

const parameterDefaultSchema = z.object({
  type: z.union([z.literal('from'), z.literal('to'), z.literal('value')]),
})

const parameterFunctionSchema = z.object({
  type: z.literal('function'),
  argIndex: z.number().int(),
})

const parameterLogSchema = z.object({
  type: z.literal('log'),
  signature: z
    .string()
    .regex(/^0x[\dA-Fa-f]{64}$/)
    .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
  indexedCount: z.number().int(),
  index: z.union([z.literal('some'), z.literal('every'), z.number().int()]),
  argIndex: z.number().int(),
})

const parameterBaseLogSchema = z.object({
  type: z.literal('log'),
  signature: z
    .string()
    .regex(/^0x[\dA-Fa-f]{64}$/)
    .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
  indexedCount: z.number().int(),
  index: z.number().int(),
  argIndex: z.number().int(),
})

const parameterInternalSchema = z.object({
  type: z.literal('internal'),
  index: z.union([z.literal('some'), z.literal('every'), z.number().int()]),
  key: z.union([z.literal('from'), z.literal('to'), z.literal('value')]),
})

const parameterBaseInternalSchema = z.object({
  type: z.literal('internal'),
  index: z.number().int(),
  key: z.union([z.literal('from'), z.literal('to'), z.literal('value')]),
})

const parameterSchema = z.union([
  parameterDefaultSchema,
  parameterFunctionSchema,
  parameterLogSchema,
  parameterInternalSchema,
])

const parameterBaseSchema = z.union([
  parameterDefaultSchema,
  parameterFunctionSchema,
  parameterBaseLogSchema,
  parameterBaseInternalSchema,
])

const parameterMatchPatternSchema = z.object({
  base: parameterBaseSchema,
  compare: parameterSchema,
})

const actionSchema = z.union([
  z.literal('add-liquidity'),
  z.literal('atomic-arbitrage'),
  z.literal('bridge-from'),
  z.literal('bridge-to'),
  z.literal('buy-nft'),
  z.literal('deposit'),
  z.literal('deposit-with-bond'),
  z.literal('free-mint-nft'),
  z.literal('remove-liquidity'),
  z.literal('spam'),
  z.literal('trade'),
  z.literal('transaction-fee'),
  z.literal('transfer'),
  z.literal('withdraw'),
  z.literal('withdraw-with-bond'),
])

const actionGeneratorAnyTokenTransferSchema = z
  .object({
    type: z.literal('any-token-transfer'),
    token: z.union([
      z.literal('erc20'),
      z.literal('erc721'),
      z.literal('erc1155'),
    ]),
    action: actionSchema,
    comment: z.string().optional(),
    target: z.union([z.literal('from'), z.literal('to'), z.literal('none')]),
  })
  .transform((x) => ({
    ...x,
    comment: x.comment,
  }))

const actionTransferGeneratorFromTokenTransferSchema = z.object({
  type: z.literal('token-transfer'),
  token: z.union([
    z.literal('erc20'),
    z.literal('erc721'),
    z.literal('erc1155'),
    z.literal('value'),
    z.literal('internal'),
  ]),
  transferIndex: z.union([z.literal('any'), z.number().int()]),
  target: z.union([z.literal('from'), z.literal('to'), z.literal('none')]),
})

const actionGeneratorSpecificTokenTransferSchema = z
  .object({
    type: z.literal('specific-token-transfer'),
    action: actionSchema,
    comment: z.string().optional(),
    transfers: z.array(actionTransferGeneratorFromTokenTransferSchema),
  })
  .transform((x) => ({
    ...x,
    comment: x.comment,
  }))

const actionGeneratorSchema = z.union([
  actionGeneratorAnyTokenTransferSchema,
  actionGeneratorSpecificTokenTransferSchema,
])

const evmAnalyzerSchema = z
  .object({
    chainId: z.number().int().optional(),
    from: z
      .array(
        z
          .string()
          .regex(/^0x[\dA-Fa-f]{40}$/)
          .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
      )
      .optional(),
    to: z
      .array(
        z
          .string()
          .regex(/^0x[\dA-Fa-f]{40}$/)
          .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
      )
      .optional(),
    value: z.union([z.literal('plus'), z.literal('zero')]).optional(),
    functionSignature: z
      .string()
      .regex(/^0x[\dA-Fa-f]{8}$/)
      .transform((x) => (isHex(x) ? toLowerHex(x) : '0x')),
    functionInterface: z.string().optional(),
    logsPatterns: z.array(logsPatternSchema),
    internalsPatterns: z.array(internalsPatternSchema).optional(),
    parameterMatchPatterns: z.array(parameterMatchPatternSchema).optional(),
    generators: z.array(actionGeneratorSchema),
  })
  .transform((x) => ({
    ...x,
    chainId: x.chainId,
    from: x.from,
    to: x.to,
    value: x.value,
    functionInterface: x.functionInterface,
    internalsPatterns: x.internalsPatterns,
    parameterMatchPatterns: x.parameterMatchPatterns,
  }))

export const evmAnalyzersSchema = z.array(evmAnalyzerSchema)
