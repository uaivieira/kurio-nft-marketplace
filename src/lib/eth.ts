/**
 * Exact ETH arithmetic. Amounts travel as decimal strings ("1.19") and are
 * computed as bigint wei (18 decimals), so no value ever passes through a float.
 */
export const ETH_DECIMALS = 18
const SCALE = 10n ** BigInt(ETH_DECIMALS)
const DECIMAL_PATTERN = /^\d+(\.\d{1,18})?$/

export type EthString = string

export function isEthString(value: string): boolean {
  return DECIMAL_PATTERN.test(value)
}

export function toWei(value: EthString): bigint {
  if (!isEthString(value)) throw new Error(`Invalid ETH amount: "${value}"`)
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(ETH_DECIMALS, '0'))
}

/** Canonical decimal string with at least `minDecimals` fraction digits. */
export function fromWei(wei: bigint, minDecimals = 2): EthString {
  if (wei < 0n) throw new Error('Negative ETH amounts are not supported')
  const whole = wei / SCALE
  let fraction = (wei % SCALE).toString().padStart(ETH_DECIMALS, '0').replace(/0+$/, '')
  if (fraction.length < minDecimals) fraction = fraction.padEnd(minDecimals, '0')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

export const addEth = (...values: EthString[]): EthString =>
  fromWei(values.reduce((sum, value) => sum + toWei(value), 0n))

export const subEth = (a: EthString, b: EthString): EthString => {
  const result = toWei(a) - toWei(b)
  return fromWei(result < 0n ? 0n : result)
}

export const mulEth = (value: EthString, quantity: number): EthString => {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantity must be a non-negative integer')
  return fromWei(toWei(value) * BigInt(quantity))
}

/** Applies a percentage expressed in basis points (1000 = 10%), rounding down to the wei. */
export const percentOfEth = (value: EthString, basisPoints: number): EthString =>
  fromWei((toWei(value) * BigInt(basisPoints)) / 10_000n)

export const compareEth = (a: EthString, b: EthString): -1 | 0 | 1 => {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff > 0n ? 1 : -1
}

/** Fraction digits that show every amount exactly, at least 2 (e.g. 2.38 and 0.016 need 3). */
export const decimalsFor = (...values: EthString[]): number =>
  Math.max(2, ...values.map((value) => fromWei(toWei(value)).split('.')[1]?.length ?? 0))

/**
 * Display format used across the UI: "1.19 ETH". `minDecimals` pads the fraction so the rows of a summary
 * line up (pass `decimalsFor(...rows)`); digits are never dropped.
 */
export const formatEth = (value: EthString, minDecimals = 2) => `${fromWei(toWei(value), minDecimals)} ETH`
