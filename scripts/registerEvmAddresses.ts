import { stringify } from '@0xtorch/core'
import type { EvmAddress } from '@0xtorch/evm'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { evmAddressWithoutChainIdSchema } from './schemas'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^evms\/chains\/\d+\/0x[\dA-Fa-f]{40}\.json$/.test(v))

console.log('Registering evm addresses:')
for (const filePath of filePathes) {
  console.log(`  ${filePath}`)
}

for (const filePath of filePathes) {
  const chainId = Number(filePath.split('evms/chains/')[1].split('/')[0])
  const json = await Bun.file(filePath).json()
  const evmAddress = evmAddressWithoutChainIdSchema.parse(json)

  // ABI は登録しない
  const data = stringify({
    address: evmAddress.address,
    chainId,
    label: evmAddress.label,
    isSpam: evmAddress.isSpam,
    app: evmAddress.app,
  } satisfies EvmAddress)

  const response = await fetch(`${API_ENDPOINT}/v1/private/evm/address`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chainId,
      address: evmAddress.address,
      data,
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register evm addresses: ${response.status} ${response.statusText}`,
    )
  }
}
