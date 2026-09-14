import { validateAndNormalizeIsbn13 } from '@/lib/isbn-validation'

describe('ISBN Validation', () => {
  describe('validateAndNormalizeIsbn13', () => {
    it('should accept valid ISBN-13 with hyphens', () => {
      const result = validateAndNormalizeIsbn13('978-83-01-12345-6')
      expect(result).toBe('9788301123456')
    })

    it('should accept valid ISBN-13 without hyphens', () => {
      const result = validateAndNormalizeIsbn13('9788301123456')
      expect(result).toBe('9788301123456')
    })

    it('should accept ISBN-13 with standard ISBN prefix', () => {
      const result = validateAndNormalizeIsbn13('ISBN 978-83-267-5018-2')
      expect(result).toBe('9788326750182')
    })

    it('should accept ISBN-13 with ISBN: prefix', () => {
      const result = validateAndNormalizeIsbn13('ISBN: 978-83-267-5018-2')
      expect(result).toBe('9788326750182')
    })

    it('should accept ISBN-13 with ISBN- prefix (regression test)', () => {
      const result = validateAndNormalizeIsbn13('ISBN-978-83-267-5018-2')
      expect(result).toBe('9788326750182')
    })

    it('should accept ISBN-13 with ISBN-13: prefix', () => {
      const result = validateAndNormalizeIsbn13('ISBN-13: 978-83-267-5018-2')
      expect(result).toBe('9788326750182')
    })

    it('should accept ISBN-13 with ISBN 13: prefix', () => {
      const result = validateAndNormalizeIsbn13('ISBN 13: 978-83-267-5018-2')
      expect(result).toBe('9788326750182')
    })

    it('should accept ISBN-13 with spaces instead of hyphens', () => {
      const result = validateAndNormalizeIsbn13('978 83 267 5018 2')
      expect(result).toBe('9788326750182')
    })

    it('should reject invalid ISBN-13 with wrong checksum', () => {
      const result = validateAndNormalizeIsbn13('9788301123457')
      expect(result).toBeNull()
    })

    it('should reject ISBN-13 with invalid characters', () => {
      const result = validateAndNormalizeIsbn13('978-83-01-1234A-6')
      expect(result).toBeNull()
    })

    it('should reject ISBN-13 with letters mixed in digits', () => {
      const result = validateAndNormalizeIsbn13('abc9788326750182')
      expect(result).toBeNull()
    })

    it('should reject ISBN-13 with letters in the middle', () => {
      const result = validateAndNormalizeIsbn13('978x8326750182')
      expect(result).toBeNull()
    })

    it('should reject ISBN-13 with word hyphens', () => {
      const result = validateAndNormalizeIsbn13('978-83-test-267-5018-2')
      expect(result).toBeNull()
    })

    it('should reject ISBN with text after prefix', () => {
      const result = validateAndNormalizeIsbn13('ISBN abc 9788326750182')
      expect(result).toBeNull()
    })

    it('should reject ISBN-13 with incorrect length', () => {
      const result = validateAndNormalizeIsbn13('978830112345')
      expect(result).toBeNull()
    })

    it('should handle whitespace in input', () => {
      const result = validateAndNormalizeIsbn13(' 978-83-01-12345-6 ')
      expect(result).toBe('9788301123456')
    })

    it('should return null for empty string', () => {
      const result = validateAndNormalizeIsbn13('')
      expect(result).toBeNull()
    })

    it('should return null for null input', () => {
      const result = validateAndNormalizeIsbn13(null)
      expect(result).toBeNull()
    })
  })
})
