import { z } from 'zod'

export const appSchema = z.object({
  id: z.string(),
  categories: z.array(
    z.union([
      z.literal('bridge'),
      z.literal('cex'),
      z.literal('cross-chain'),
      z.literal('dex'),
      z.literal('gaming'),
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
