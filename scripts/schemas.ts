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
