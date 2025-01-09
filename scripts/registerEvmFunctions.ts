import { stringify } from '@0xtorch/core'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { z } from 'zod'
import { AbiFunction } from 'abitype/zod'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^evms\/functions\/0x[\da-f]{8}\.json$/.test(v))

for (const filePath of filePathes) {
  console.log('Registering evm function ABI:', filePath)
  const signature = filePath.split('evms/functions/')[1].split('.json')[0]
  const json = await Bun.file(filePath).json()
  const functionAbis = z.array(AbiFunction).parse(json)

  const response = await fetch(`${API_ENDPOINT}/v1/private/evm/function`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature,
      data: stringify(functionAbis),
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register evm function ABI: ${response.status} ${response.statusText}`,
    )
  }
}
