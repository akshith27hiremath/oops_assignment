/**
 * Unit Tests - Simple Validation Functions
 * Easy tests that check basic validation logic
 */

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should validate correct email format', () => {
    const validEmail = 'test@example.com';
    expect(emailRegex.test(validEmail)).toBe(true);
  });

  it('should reject email without @', () => {
    const invalidEmail = 'testexample.com';
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });

  it('should reject email without domain', () => {
    const invalidEmail = 'test@';
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });
});

describe('Password Validation', () => {
  const isPasswordValid = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword && password.length >= 6;
  };

  it('should accept matching passwords of valid length', () => {
    expect(isPasswordValid('Password123', 'Password123')).toBe(true);
  });

  it('should reject non-matching passwords', () => {
    expect(isPasswordValid('Password123', 'DifferentPass')).toBe(false);
  });
});

describe('Stock Calculation', () => {
  const calculateAvailableStock = (currentStock: number, reservedStock: number): number => {
    return currentStock - reservedStock;
  };

  it('should calculate available stock correctly', () => {
    expect(calculateAvailableStock(100, 20)).toBe(80);
  });

  it('should handle zero reserved stock', () => {
    expect(calculateAvailableStock(50, 0)).toBe(50);
  });

  it('should return negative when over-reserved', () => {
    expect(calculateAvailableStock(10, 15)).toBe(-5);
  });
});

describe('Price Calculation', () => {
  const calculateDiscountedPrice = (basePrice: number, discountPercent: number): number => {
    return basePrice * (1 - discountPercent / 100);
  };

  it('should calculate 20% discount correctly', () => {
    expect(calculateDiscountedPrice(100, 20)).toBe(80);
  });

  it('should handle 0% discount', () => {
    expect(calculateDiscountedPrice(100, 0)).toBe(100);
  });

  it('should calculate 50% discount correctly', () => {
    expect(calculateDiscountedPrice(200, 50)).toBe(100);
  });
});

describe('Order Validation', () => {
  const isValidQuantity = (quantity: number): boolean => {
    return quantity > 0 && Number.isInteger(quantity);
  };

  it('should accept positive integer quantities', () => {
    expect(isValidQuantity(5)).toBe(true);
  });

  it('should reject negative quantities', () => {
    expect(isValidQuantity(-1)).toBe(false);
  });

  it('should reject zero quantity', () => {
    expect(isValidQuantity(0)).toBe(false);
  });

  it('should reject decimal quantities', () => {
    expect(isValidQuantity(2.5)).toBe(false);
  });
});
