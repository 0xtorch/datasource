import { readdir } from 'node:fs/promises'
import { AbiEvent, AbiFunction } from 'abitype/zod'
import type { z } from 'zod'
import { toEventSelector, toFunctionSelector, toFunctionSignature } from 'viem'

type AbiEventType = z.infer<typeof AbiEvent>

type AbiFunctionType = z.infer<typeof AbiFunction>

const getEvmAddressFiles = async () => {
  const files = await readdir('evms/chains', { recursive: true })
  const jsonFiles: string[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue
    }
    jsonFiles.push(`evms/chains/${file}`)
  }
  return jsonFiles
}

const createEventKey = (event: AbiEventType) =>
  `${event.name}(${event.inputs.map((input) => `${input.indexed ? 'indexed ' : ''} ${input.type}`).join(',')})`

const createEvmAbiFiles = async () => {
  // event signature 毎に abi を管理
  const eventAbisMap = new Map<string, Map<string, AbiEventType>>()
  // function id 毎に abi を管理
  const functionAbisMap = new Map<string, Map<string, AbiFunctionType>>()

  // address から順番に abi を取得して処理
  // env で対象 address が指定されている場合は指定 address のみ処理
  const files = await getEvmAddressFiles()

  for (const file of files) {
    const json = await Bun.file(file).json()
    if ('abi' in json) {
      const abis = JSON.parse(json.abi)
      if (!Array.isArray(abis)) {
        console.debug('ABI is not an array:', json.abi)
      }
      for (const abi of abis) {
        if (!('type' in abi)) {
          continue
        }
        if (abi.type === 'event') {
          const result = AbiEvent.safeParse(abi)
          if (!result.success) {
            console.debug('Failed to parse event ABI:', result.error.errors)
            continue
          }
          const eventAbi = result.data
          const signature = toEventSelector(eventAbi)
          const key = createEventKey(eventAbi)
          const eventAbis = eventAbisMap.get(signature) ?? new Map()
          if (!eventAbis.has(key)) {
            eventAbis.set(key, eventAbi)
          }
          eventAbisMap.set(signature, eventAbis)
        }
        if (abi.type === 'function') {
          const result = AbiFunction.safeParse(abi)
          if (!result.success) {
            console.debug('Failed to parse function ABI:', result.error.errors)
            continue
          }
          const functionAbi = result.data
          const id = toFunctionSelector(functionAbi)
          const signature = toFunctionSignature(functionAbi)
          const functionAbis = functionAbisMap.get(id) ?? new Map()
          if (!functionAbis.has(signature)) {
            functionAbis.set(signature, functionAbi)
          }
          functionAbisMap.set(id, functionAbis)
        }
      }
    }
  }

  for (const [signature, eventAbis] of eventAbisMap) {
    const json = [...eventAbis.values()]
    const file = `evms/events/${signature}.json`
    await Bun.write(file, JSON.stringify(json))
  }

  for (const [id, functionAbis] of functionAbisMap) {
    const json = [...functionAbis.values()]
    const file = `evms/functions/${id}.json`
    await Bun.write(file, JSON.stringify(json))
  }
}

await createEvmAbiFiles()
