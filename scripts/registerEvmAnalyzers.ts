import { z } from 'zod'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { analyzerSchema } from '@0xtorch/evm'
import { stringify } from '@0xtorch/core'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^evms\/analyzers\/0x[\dA-Fa-f]{8}\.json$/.test(v))

console.log('Registering evm analyzers:')
for (const filePath of filePathes) {
  console.log(`  ${filePath}`)
  const json = await Bun.file(filePath).json()
  const evmAnalyzers = z.array(analyzerSchema).parse(json)
  if (evmAnalyzers.length === 0) {
    console.log(`  No evm analyzer data is exist in ${filePath}.`)
    continue
  }
  const signature = evmAnalyzers[0].condition.function.id
  const response = await fetch(`${API_ENDPOINT}/v1/private/evm/analyzer`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: stringify({
      signature,
      data: evmAnalyzers,
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register evm analyzers: ${response.status} ${response.statusText}`,
    )
  }
}
