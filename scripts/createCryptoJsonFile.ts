import { cryptoCurrencySchema, stringify } from '@0xtorch/core'
import { z } from 'zod'

const cryptoesSchema = z.array(cryptoCurrencySchema)

export const createCryptoJsonFile = async () => {
  const response = await fetch('https://cryptocurrency.cryptorch.dev/v1/list')
  const latestCryptoes = cryptoesSchema.parse(await response.json())
  const existCryptoes = cryptoesSchema.parse(
    await Bun.file(`${import.meta.dir}/../tests/crypto.json`).json(),
  )
  const cryptoMap = new Map(existCryptoes.map((crypto) => [crypto.id, crypto]))
  for (const latestCrypto of latestCryptoes) {
    if (cryptoMap.has(latestCrypto.id)) {
      continue
    }
    existCryptoes.push(latestCrypto)
  }
  console.log(stringify(existCryptoes))
}

await createCryptoJsonFile()
