import { describe, expect, it } from 'vitest'
import { addEth, compareEth, decimalsFor, formatEth, fromWei, mulEth, percentOfEth, subEth, toWei } from './eth'

describe('eth arithmetic', () => {
  it('keeps decimal precision where floats fail', () => {
    expect(addEth('0.1', '0.2')).toBe('0.30')
    expect(addEth('26.83', '0.016')).toBe('26.846')
    expect(mulEth('1.19', 2)).toBe('2.38')
    expect(mulEth('1.79', 9)).toBe('16.11')
  })

  it('round-trips 18 decimals', () => {
    expect(fromWei(toWei('0.000000000000000001'))).toBe('0.000000000000000001')
  })

  it('computes discounts in basis points and never goes negative', () => {
    expect(percentOfEth('26.83', 1000)).toBe('2.683')
    expect(subEth('1', '2')).toBe('0.00')
  })

  it('compares and formats', () => {
    expect(compareEth('1.10', '1.1')).toBe(0)
    expect(compareEth('2', '1.99')).toBe(1)
    expect(formatEth('1.190')).toBe('1.19 ETH')
  })

  it('pads summary rows to one shared number of decimals', () => {
    const decimals = decimalsFor('2.38', '0', '0.016', '2.396')
    expect(decimals).toBe(3)
    expect(formatEth('2.38', decimals)).toBe('2.380 ETH')
    expect(formatEth('0', decimals)).toBe('0.000 ETH')
    expect(formatEth('0.016', decimals)).toBe('0.016 ETH')
    expect(decimalsFor('1.19', '1.39')).toBe(2)
    expect(formatEth('1.2345', 3)).toBe('1.2345 ETH')
  })

  it('rejects malformed values', () => {
    expect(() => toWei('1e3')).toThrow()
    expect(() => toWei('-1')).toThrow()
    expect(() => mulEth('1', 1.5)).toThrow()
  })
})
