import { describe, it, expect } from 'vitest'
import { usernameSchema } from '../validators/profile'

function parse(value: string) {
  return usernameSchema.safeParse(value)
}

describe('usernameSchema', () => {
  it('accepts a valid lowercase alphanumeric username', () => {
    expect(parse('johndoe').success).toBe(true)
  })

  it('accepts underscores', () => {
    expect(parse('john_doe_123').success).toBe(true)
  })

  it('accepts minimum length of 3', () => {
    expect(parse('abc').success).toBe(true)
  })

  it('accepts maximum length of 20', () => {
    expect(parse('a'.repeat(20)).success).toBe(true)
  })

  it('rejects username shorter than 3 characters', () => {
    const result = parse('ab')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username must be at least 3 characters')
  })

  it('rejects username longer than 20 characters', () => {
    const result = parse('a'.repeat(21))
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username must be 20 characters or fewer')
  })

  it('rejects uppercase letters', () => {
    const result = parse('JohnDoe')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Username can only contain letters, numbers, and underscores')
  })

  it('rejects spaces', () => {
    expect(parse('john doe').success).toBe(false)
  })

  it('rejects hyphens', () => {
    expect(parse('john-doe').success).toBe(false)
  })

  it('rejects reserved word: admin', () => {
    const result = parse('admin')
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('That username is not available')
  })

  it('rejects reserved word: me', () => {
    expect(parse('me').success).toBe(false)
  })

  it('rejects reserved word: users', () => {
    expect(parse('users').success).toBe(false)
  })

  it('rejects reserved word: settings', () => {
    expect(parse('settings').success).toBe(false)
  })

  it('rejects reserved word: null', () => {
    expect(parse('null').success).toBe(false)
  })
})
