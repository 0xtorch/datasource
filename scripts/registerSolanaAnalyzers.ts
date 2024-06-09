import { solanaAnalyzersJsonSchema } from '@0xtorch/solana'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^evms\/analyzers\/0x[\dA-Fa-f]{8}\.json$/.test(v))

console.log('Registering solana analyzers:')
for (const filePath of filePathes) {
  console.log(`  ${filePath}`)
  const json = await Bun.file(filePath).json()
  const solanaAnalyzers = solanaAnalyzersJsonSchema.parse(json)
  if (solanaAnalyzers.length === 0) {
    console.log(`  No solana analyzer data is exist in ${filePath}.`)
    continue
  }
  const programId = solanaAnalyzers[0].programId
  const response = await fetch(`${API_ENDPOINT}/v1/private/solana/analyzer`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      programId,
      data: solanaAnalyzers,
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register solana analyzers: ${response.status} ${response.statusText}`,
    )
  }
}
