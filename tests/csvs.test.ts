import { describe, expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { csvFormatSchema, streamCsvToActions } from '@0xtorch/csv'
import { detect } from 'encoding-japanese'
import { z } from 'zod'
import {
  actionSchema,
  cryptoCurrencySchema,
  eur,
  jpy,
  usd,
  type Action,
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
      const format = result.data
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

      const detected = detect(csv)
      const encoding =
        typeof detected === 'string' ? detected : detected.valueOf().toString()
      const parsedActions: Action[] = []
      const { success, ignoreRowCount, ignoreRows } = await streamCsvToActions({
        file: csv,
        encoding,
        format,
        cryptoes,
        fiats: [usd, eur, jpy],
        save: (actions) => {
          parsedActions.push(...actions)
          return Promise.resolve()
        },
      })
      const orderedActions = resetActionOrders(parsedActions)
      expect(success).toBe(true)
      if (ignoreRows.length > 0) {
        console.log('ignoreRows:')
        console.log(JSON.stringify(ignoreRows))
      }
      expect(orderedActions).toEqual(actions)
      expect(ignoreRowCount).toBe(0)
    })
  }
})

const resetActionOrders = (actions: readonly Action[]): readonly Action[] => {
  const sourceCounts = new Map<string, number>()
  const orderedActions: Action[] = []
  for (const action of actions) {
    const count = sourceCounts.get(action.source) ?? 0
    orderedActions.push({ ...action, order: count })
    sourceCounts.set(action.source, count + 1)
  }
  return orderedActions
}
