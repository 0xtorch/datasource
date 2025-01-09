import { stringify } from '@0xtorch/core'
import { API_ENDPOINT, PASSWORD, USERNAME } from './constants'
import { z } from 'zod'
import { AbiEvent } from 'abitype/zod'

const filePathes = (process.env.FILES ?? '')
  .split(',')
  .filter((v) => /^evms\/events\/0x[\da-f]{64}\.json$/.test(v))

for (const filePath of filePathes) {
  console.log(`Registering evm event ABI: ${filePath}`)
  const signature = filePath.split('evms/events/')[1].split('.json')[0]
  const json = await Bun.file(filePath).json()
  const eventAbis = z.array(AbiEvent).parse(json)

  const response = await fetch(`${API_ENDPOINT}/v1/private/evm/event`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${USERNAME}:${PASSWORD}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature,
      data: stringify(eventAbis),
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to register evm event ABI: ${response.status} ${response.statusText}`,
    )
  }
}
