export type Hex = `0x${string}`

export type LowerHex = Lowercase<Hex>

export const isHex = (value: string): value is Hex =>
  /^0x[\da-f]+$/i.test(value)

export const toLowerHex = (value: Hex): LowerHex =>
  value.toLowerCase() as LowerHex
