import { describe, test, expect } from 'vitest'
import { getStateFromGstin } from '@/lib/gstin-state'

describe('getStateFromGstin', () => {
  test('returns Maharashtra for 27-prefix GSTIN', () => {
    expect(getStateFromGstin('27AABCU9603R1ZX')).toBe('Maharashtra')
  })

  test('returns Karnataka for 29-prefix GSTIN', () => {
    expect(getStateFromGstin('29AABCS1234A1ZX')).toBe('Karnataka')
  })

  test('returns Delhi for 07-prefix GSTIN', () => {
    expect(getStateFromGstin('07AABCS1234A1ZX')).toBe('Delhi')
  })

  test('returns Tamil Nadu for 33-prefix GSTIN', () => {
    expect(getStateFromGstin('33AABCS1234A1ZX')).toBe('Tamil Nadu')
  })

  test('returns Telangana for 36-prefix GSTIN', () => {
    expect(getStateFromGstin('36AABCS1234A1ZX')).toBe('Telangana')
  })

  test('returns null for unrecognised prefix', () => {
    expect(getStateFromGstin('98AABCS1234A1ZX')).toBeNull()
  })

  test('returns null for string shorter than 2 chars', () => {
    expect(getStateFromGstin('2')).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(getStateFromGstin('')).toBeNull()
  })

  test('works with partially-typed GSTIN (2 chars)', () => {
    expect(getStateFromGstin('27')).toBe('Maharashtra')
  })

  test('returns Andhra Pradesh for 28-prefix (pre-bifurcation)', () => {
    expect(getStateFromGstin('28AABCS1234A1ZX')).toBe('Andhra Pradesh')
  })

  test('returns Andhra Pradesh for 37-prefix (post-bifurcation)', () => {
    expect(getStateFromGstin('37AABCS1234A1ZX')).toBe('Andhra Pradesh')
  })

  test('returns Other Territory for 97-prefix', () => {
    expect(getStateFromGstin('97AABCS1234A1ZX')).toBe('Other Territory')
  })
})
