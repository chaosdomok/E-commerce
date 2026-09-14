import { validateMarkupRules, calculateFinalPriceSync, DEFAULT_MARKUPS } from '@/lib/pricing'

describe('Pricing Validation', () => {
  describe('validateMarkupRules', () => {
    it('should accept valid markup rules', () => {
      const validRules = [
        { minPrice: 1, maxPrice: 10, markup: 4 },
        { minPrice: 11, maxPrice: 20, markup: 5 },
      ]
      const result = validateMarkupRules(validRules)
      expect(result.success).toBe(true)
    })

    it('should reject empty rules array', () => {
      const result = validateMarkupRules([])
      expect(result.success).toBe(false)
      expect(result.error).toContain('przynajmniej jeden próg')
    })

    it('should reject rules with negative markup', () => {
      const invalidRules = [
        { minPrice: 1, maxPrice: 10, markup: -5 },
      ]
      const result = validateMarkupRules(invalidRules)
      expect(result.success).toBe(false)
    })

    it('should reject rules where max price is less than min price', () => {
      const invalidRules = [
        { minPrice: 20, maxPrice: 10, markup: 5 },
      ]
      const result = validateMarkupRules(invalidRules)
      expect(result.success).toBe(false)
    })
  })

  describe('calculateFinalPriceSync', () => {
    it('should calculate correct final price for base price 5 PLN', () => {
      const result = calculateFinalPriceSync(5)
      expect(result.basePrice).toBe(5)
      expect(result.finalPrice).toBe(9) // 5 + 4 markup
    })

    it('should calculate correct final price for base price 15 PLN', () => {
      const result = calculateFinalPriceSync(15)
      expect(result.basePrice).toBe(15)
      expect(result.finalPrice).toBe(20) // 15 + 5 markup
    })

    it('should calculate correct final price for base price 100 PLN', () => {
      const result = calculateFinalPriceSync(100)
      expect(result.basePrice).toBe(100)
      expect(result.finalPrice).toBe(110) // 100 + 10 markup
    })

    it('should handle boundary values correctly', () => {
      const result1 = calculateFinalPriceSync(10)
      expect(result1.finalPrice).toBe(14) // 10 + 4 markup (10 is in first range)

      const result2 = calculateFinalPriceSync(11)
      expect(result2.finalPrice).toBe(16) // 11 + 5 markup (11 is in second range)
    })
  })
})
