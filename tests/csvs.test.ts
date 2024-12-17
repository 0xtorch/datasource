import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import {
  csvFormatSchema,
  formatCsvRows,
  parseCsvText,
  parseRowsToActions,
} from '@0xtorch/csv'
import { z } from 'zod'
import {
  actionSchema,
  cryptoCurrencySchema,
  eur,
  jpy,
  usd,
} from '@0xtorch/core'

describe('Should valid csv format json', async () => {
  const cryptoes = z
    .array(cryptoCurrencySchema)
    .parse(await Bun.file(`${import.meta.dir}/crypto.json`).json())
  const filenames = await readdir('./csvs')
  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      continue
    }
    test(`csvs/${filename}`, async () => {
      const json = await Bun.file(
        `${import.meta.dir}/../csvs/${filename}`,
      ).json()
      const result = csvFormatSchema.safeParse(json)
      if (!result.success) {
        console.log(result.error)
      }
      expect(result.success).toBe(true)
      if (!result.success) {
        return
      }

      // filename に合致する test csv file, result action file を取得
      const { formatter, parser } = result.data
      const filenameWithoutExt = filename.replace('.json', '')
      const csv = await Bun.file(
        `${import.meta.dir}/csv/${filenameWithoutExt}.csv`,
      ).text()
      const actions = z
        .array(actionSchema)
        .parse(
          await Bun.file(
            `${import.meta.dir}/csv/${filenameWithoutExt}-result.json`,
          ).json(),
        )

      const { actions: parsedActions, ignoreRowCount } = parseRowsToActions({
        rows: formatCsvRows({
          rows: parseCsvText(csv),
          formatter,
        }),
        parser,
        symbolAssetMap: result.data.symbolAssetMap,
        service: filenameWithoutExt,
        cryptoes,
        fiats: [usd, eur, jpy],
        errorLogger: (error) => {
          console.log(error)
        },
      })
      expect(parsedActions).toEqual(actions)
      expect(ignoreRowCount).toBe(0)
    })
  }
})
