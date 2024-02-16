import { z } from 'zod'

export const appSchema = z.object({
  id: z.string(),
  categories: z.array(
    z.union([z.literal('cex'), z.literal('dex'), z.literal('other')]),
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

const logsPatternPartialSchema = z.object({
  matchType: z.literal('partial'),
  signature: z
    .string()
    .regex(/^0x[\dA-Fa-f]{64}$/)
    .transform((x) => x.toLowerCase()),
  indexedCount: z.number().int(),
  logCount: z.number().int().optional(),
  args: z.array(logArgumentPatternToLowerCaseValueSchema).optional(),
})

const logsPatternExactSchema = z.object({
  matchType: z.literal('exact'),
  items: z.array(
    z.object({
      signature: z
        .string()
        .regex(/^0x[\dA-Fa-f]{64}$/)
        .transform((x) => x.toLowerCase()),
      indexedCount: z.number().int(),
      args: z.array(logArgumentPatternToLowerCaseValueSchema).optional(),
    }),
  ),
})

const logsPatternSchema = z.union([
  logsPatternPartialSchema,
  logsPatternExactSchema,
])

const actionSchema = z.union([
  z.literal('atomic-arbitrage'),
  z.literal('free-mint-nft'),
  z.literal('trade'),
  z.literal('transaction-fee'),
  z.literal('transfer'),
])

const actionGeneratorAnyTokenTransferSchema = z.object({
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

const actionTransferGeneratorFromTokenTransferSchema = z.object({
  type: z.literal('token-transfer'),
  token: z.union([
    z.literal('erc20'),
    z.literal('erc721'),
    z.literal('erc1155'),
  ]),
  transferIndex: z.number().int(),
  target: z.union([z.literal('from'), z.literal('to'), z.literal('none')]),
})

const actionGeneratorSpecificTokenTransferSchema = z.object({
  type: z.literal('specific-token-transfer'),
  action: actionSchema,
  comment: z.string().optional(),
  transfers: z.array(actionTransferGeneratorFromTokenTransferSchema),
})

const actionGeneratorSchema = z.union([
  actionGeneratorAnyTokenTransferSchema,
  actionGeneratorSpecificTokenTransferSchema,
])

const evmAnalyzerSchema = z.object({
  chainId: z.number().int().optional(),
  from: z
    .array(
      z
        .string()
        .regex(/^0x[\dA-Fa-f]{40}$/)
        .transform((x) => x.toLowerCase()),
    )
    .optional(),
  to: z
    .array(
      z
        .string()
        .regex(/^0x[\dA-Fa-f]{40}$/)
        .transform((x) => x.toLowerCase()),
    )
    .optional(),
  functionSignature: z
    .string()
    .regex(/^0x[\dA-Fa-f]{8}$/)
    .transform((x) => x.toLowerCase()),
  functionInterface: z.string().optional(),
  logsPatterns: z.array(logsPatternSchema),
  generators: z.array(actionGeneratorSchema),
})

export const evmAnalyzersSchema = z.array(evmAnalyzerSchema)
