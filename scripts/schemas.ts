import { evmAddressSchema } from '@0xtorch/evm'
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

export const evmAddressWithoutChainIdSchema = evmAddressSchema
  .omit({ chainId: true })
