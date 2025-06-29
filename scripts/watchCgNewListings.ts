import path from 'node:path'
import z from 'zod'
import * as prettier from 'prettier'

const watchlist = path.join(__dirname, '..', '.github/watchlist.json')
const cache = path.join(__dirname, '..', '.github/fetch-cache.json')
const saveCache = process.env.ENABLE_CACHE === 'true' // 開発用

const watchlistSchema = z.array(
  z.object({
    type: z.union([z.literal('exchange'), z.literal('derivatives')]),
    cgId: z.string(),
    filesToWrite: z.array(z.string()).optional(), // relative to csvs/, without .json extension. If not provided, it will be identical to cgId
    excludeSymbols: z.array(z.string()).optional(),
  }),
)

const CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 hours

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
function log(
  level: 'log' | 'error' | 'debug' | 'info' | 'warn' | 'trace',
  message: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ...args: any[]
) {
  const timestamp = new Date().toISOString()
  console[level](timestamp, message, ...args)
}

async function get(url: string) {
  const res = await fetch(`https://api.coingecko.com/api${url}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-cg-demo-api-key': process.env.CG_DEMO_API_KEY ?? '',
    },
  })
  const tex = await res.text()
  try {
    return JSON.parse(tex)
  } catch (e) {
    log('error', 'Failed to parse response as JSON', tex)
    throw e
  }
}

async function cachedGet(url: string) {
  const cacheKey = url

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let cachedData: any

  if (saveCache) {
    try {
      const cachedHandle = Bun.file(cache)
      cachedData = await cachedHandle.json()
      if (
        cachedData &&
        cacheKey in cachedData &&
        Date.now() - cachedData[cacheKey].timestamp < CACHE_DURATION
      ) {
        return cachedData[cacheKey].data
      }
    } catch (e) {
      log('error', 'Failed to read cache', e)
    }
  }

  await sleep(3000) // 1s sleep to avoid rate limit
  const data = (await get(url)) as any
  try {
    if (data.status.error_code === 429) {
      return data
    }
  } catch (e) {}

  if (saveCache) {
    log('debug', 'saving cache')
    await Bun.write(
      cache,
      JSON.stringify({
        [cacheKey]: { data, timestamp: Date.now() },
        ...(cachedData ?? {}),
      }),
    )
    log('debug', 'saved cache')
  }

  return data
}
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
async function autopage<T>(url: string, extractArray: (data: any) => T[]) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let mergedResult: any[] = [] // Initialize an empty array to store the merged results
  for (let page = 1; ; page++) {
    try {
      log('debug', `Fetching page ${page} of ${url}`)
      const res = await cachedGet(`${url}&page=${page}`)
      try {
        if (res.status.error_code === 429) {
          log('error', `Rate limit exceeded on page ${page}`)
          break
        }
      } catch (e) {}
      const array = extractArray(res)
      if (array.length === 0) {
        log('debug', 'Aborting autopage due to empty array')
        break
      }

      // Merge the current page's results into the mergedResult array
      mergedResult = [...mergedResult, ...array] // Use the spread operator to merge arrays
    } catch (e) {
      if (page === 1) {
        log('error', `Error fetching data on page ${page}`, e)
      } else {
        log('debug', `Aborting autopage due to error on page ${page}`)
        break
      }
    }
  }
  return mergedResult
}

async function main() {
  log('debug', 'Starting main function')
  // Load watchlist and states
  const watchlistData = watchlistSchema.parse(await Bun.file(watchlist).json())

  for (const exchange of watchlistData) {
    log('info', `Processing ${exchange.cgId}`)
    // collect phase start
    const result: Record<string, string> = {}
    if (exchange.type === 'exchange') {
      const fetched = await autopage(
        `/v3/exchanges/${exchange.cgId}/tickers?include_exchange_logo=false&depth=false&order=base_target`,
        (d) => d.tickers,
      )
      for (const item of fetched) {
        if (exchange.excludeSymbols?.includes(item.base)) continue

        result[item.base as string] = item.coin_id as string
      }
    } else if (exchange.type === 'derivatives') {
      throw new Error('Derivatives not supported yet')
    }

    // update phase start
    const fztw = exchange.filesToWrite ?? [exchange.cgId]
    for (const fw of fztw) {
      const filename = path.join(__dirname, '..', 'symbols', `${fw}.json`)
      const bunFile = Bun.file(filename)
      const sam = await bunFile.json()
      for (const [symbol, assetId] of Object.entries(result)) {
        sam[symbol] = `crypto/${assetId}`
      }

      // sort the sam order by symbol in ascending order
      const sortedSam = Object.fromEntries(
        Object.entries(sam).sort(([a], [b]) => a.localeCompare(b)),
      )

      const toBeWritten = await prettier.format(JSON.stringify(sortedSam), {
        // JSONは何故かBioneでなくPrettierだったので、踏襲。
        parser: 'json',
      })
      await Bun.write(filename, toBeWritten)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
