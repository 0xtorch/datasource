/** Gemini CLI を使用して、 EVM アドレスが spam かどうかを検証して、結果を EVM address JSON に保存して返す script
 * - 最大で 100 address 処理するまで継続処理
 * - Etherscan 系 chain の address のみ対応
 * - contract や label が存在する address はスキップ
 */

import { readdir } from 'node:fs/promises'
import { $ } from 'bun'
import { evmAddressWithoutChainIdSchema } from './schemas'

// 検証した EVM address の数
let checkedCount = 0

// chainId 毎の Base Explorer URL
const chainExplorerUrls: Record<number, string | undefined> = {
  // Arbitrum
  42161: 'https://www.arbiscan.io',
  // Avalanche
  43114: 'https://snowscan.xyz',
  // Base
  8453: 'https://basescan.org',
  // Bera
  80094: 'https://berascan.com',
  // BSC
  56: 'https://bscscan.com',
  // Blast
  81457: 'https://blastscan.io',
  // Ethereum
  1: 'https://etherscan.io',
  // Linea
  59144: 'https://lineascan.build',
  // Mantle
  5000: 'https://mantlescan.xyz',
  // Moonbeam
  1284: 'https://moonscan.io',
  // Moonriver
  1285: 'https://moonriver.moonscan.io',
  // OpBNB
  204: 'https://opbnb.bscscan.com',
  // Optimism
  10: 'https://optimistic.etherscan.io',
  // PolygonPoS
  137: 'https://polygonscan.com',
  // Scroll
  534352: 'https://scrollscan.com',
  // Sonic
  146: 'https://sonicscan.org',
  // Taiko
  167000: 'https://taikoscan.io',
  // Unichain
  130: 'https://uniscan.xyz',
  // zkSyncEra
  324: 'https://era.zksync.network',
}

// gemini prompt 作成
const createGeminiPrompt = ({
  address,
  explorerUrl,
}: {
  address: string
  explorerUrl: string
}) => {
  return `${explorerUrl}/address/${address}

この address に対して fake , phising のラベルが付いていたら、 'spam' と答えてください。そうでなけれ ば 'normal' と答えてください。`
}

// 通知音鳴らす
const playNotificationSound = async () => {
  for (let i = 0; i < 3; i++) {
    const process0 = Bun.spawn(['afplay', '/System/Library/Sounds/Hero.aiff'], {
      stdout: 'ignore',
      stderr: 'inherit',
    })
    await process0.exited
  }
}

// chains 内の directory を取得
const basePath = 'evms/chains'
const chainDirs = await readdir(basePath)
console.log(chainDirs)
for (const chainDir of chainDirs) {
  // 最大で 100 address 処理したら終了
  if (checkedCount >= 100) {
    console.log(`Checked ${checkedCount} addresses. Stopping further checks.`)
    break
  }
  // explorer URL が存在しない場合は処理しない
  const chainId = Number.parseInt(chainDir)
  if (Number.isNaN(chainId)) {
    console.log(`Skipping non-EVM chain directory: ${chainDir}`)
    continue
  }
  const explorerUrl = chainExplorerUrls[chainId]
  if (!explorerUrl) {
    console.log(`Skipping chain without supported explorer: ${chainId}`)
    continue
  }

  console.log(`Start checking addresses of ID: ${chainId} (${explorerUrl})`)
  const files = await readdir(`${basePath}/${chainDir}`)
  for (const file of files) {
    // 最大で 100 address 処理したら終了
    if (checkedCount >= 100) {
      console.log(`Checked ${checkedCount} addresses. Stopping further checks.`)
      break
    }
    // EVM address JSON file でなければスキップ
    if (!file.endsWith('.json')) {
      console.log(`Skipping non-EVM address JSON file: ${file}`)
      continue
    }
    const parsed = evmAddressWithoutChainIdSchema.safeParse(
      await Bun.file(`${basePath}/${chainDir}/${file}`).json(),
    )
    if (!parsed.success) {
      console.log(`Failed to parse EVM address JSON file: ${file}`)
      continue
    }
    // abi, app, isSpam, label のいずれかが定義されている場合はスキップ
    const address = parsed.data
    if (
      address.abi !== undefined ||
      address.app !== undefined ||
      address.isSpam !== undefined ||
      address.label !== undefined
    ) {
      console.log(`Skipping address with defined fields: ${file}`)
      continue
    }

    // Gemini API を使用して spam チェックを実行
    const prompt = createGeminiPrompt({
      address: address.address,
      explorerUrl,
    })
    console.log(
      `Start checking address by Gemini CLI | ${explorerUrl}/address/${address.address}`,
    )
    const result = await $`gemini --yolo -p "${prompt}"`
      .text()
      .catch(async (e) => {
        await playNotificationSound()
        throw e
      })
    const trimmed = result.trim()
    console.log('====================')
    console.log(trimmed)
    console.log('====================')
    if (trimmed.endsWith('spam')) {
      address.isSpam = true
    } else if (trimmed.endsWith('normal')) {
      address.isSpam = false
    } else {
      await playNotificationSound()
      throw new Error('Unexpected result from Gemini API')
    }

    // JSON 更新
    await Bun.write(
      `${basePath}/${chainDir}/${file}`,
      JSON.stringify(address, null, 2),
    )

    // チェックカウントを増加
    checkedCount += 1
  }
}

// 終了時に通知音ならす
await playNotificationSound()

process.exit()
