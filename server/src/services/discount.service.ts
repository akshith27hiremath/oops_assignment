/**
 * Discount Service
 * Handles discount code validation, calculation, and best discount logic
 */

import DiscountCode, { IDiscountCode, DiscountScope, DiscountType } from '../models/DiscountCode.model';
import Customer, { ICustomer, LoyaltyTier } from '../models/Customer.model';
import { IOrderItem } from '../models/Order.model';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export interface DiscountCalculation {
  tierDiscount: number; // Amount from loyalty tier
  codeDiscount: number; // Amount from discount code
  finalDiscount: number; // Best discount to apply
  discountType: 'TIER' | 'CODE' | 'NONE';
  tierPercentage?: number;
  codePercentage?: number;
  appliedCode?: IDiscountCode;
}

export interface CreateDiscountCodeData {
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  assignedUsers?: string[];
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  maxUsesGlobal?: number;
  maxUsesPerUser?: number;
  validFrom: Date;
  validUntil: Date;
  createdBy: string;
}

class DiscountService {
  /**
   * Validate a discount code for a specific user and cart total
   */
  async validateDiscountCode(
    code: string,
    userId: string,
    cartTotal: number
  ): Promise<{ valid: boolean; reason?: string; discountCode?: IDiscountCode }> {
    try {
      const discountCode = await DiscountCode.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      if (!discountCode) {
        return { valid: false, reason: 'Invalid discount code' };
      }

      const validation = await discountCode.validateCode(userId, cartTotal);

      if (validation.valid) {
        return { valid: true, discountCode };
      } else {
        return { valid: false, reason: validation.reason };
      }
    } catch (error: any) {
      logger.error(`❌ Discount code validation error: ${error.message}`);
      return { valid: false, reason: 'Error validating discount code' };
    }
  }

  /**
   * Calculate the best discount between loyalty tier and discount code
   * Returns detailed breakdown of all available discounts
   */
  async calculateBestDiscount(
    userId: string,
    cartSubtotal: number,
    discountCodeId?: string
  ): Promise<DiscountCalculation> {
    try {
      // Get customer and calculate tier discount
      const customer = await Customer.findById(userId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const tierPercentage = await customer.getLoyaltyDiscount();
      const tierDiscount = Math.round((cartSubtotal * tierPercentage) / 100 * 100) / 100;

      // Initialize result
      const result: DiscountCalculation = {
        tierDiscount,
        codeDiscount: 0,
        finalDiscount: tierDiscount,
        discountType: tierDiscount > 0 ? 'TIER' : 'NONE',
        tierPercentage: tierPercentage > 0 ? tierPercentage : undefined,
      };

      // If discount code provided, calculate code discount
      if (discountCodeId) {
        const discountCode = await DiscountCode.findById(discountCodeId);

        if (discountCode) {
          const validation = await discountCode.validateCode(userId, cartSubtotal);

          if (validation.valid) {
            const codeDiscount = discountCode.calculateDiscount(cartSubtotal);
            result.codeDiscount = codeDiscount;
            result.appliedCode = discountCode;

            // Calculate code percentage for display
            if (discountCode.type === DiscountType.PERCENTAGE) {
              result.codePercentage = discountCode.value;
            } else {
              // For fixed amount, calculate equivalent percentage
              result.codePercentage = Math.round((codeDiscount / cartSubtotal) * 100 * 100) / 100;
            }

            // Determine which discount is better (no stacking)
            if (codeDiscount > tierDiscount) {
              result.finalDiscount = codeDiscount;
              result.discountType = 'CODE';
            }
          }
        }
      }

      logger.info(`💰 Discount calculation for user ${userId}: Tier: ₹${tierDiscount}, Code: ₹${result.codeDiscount}, Best: ₹${result.finalDiscount} (${result.discountType})`);

      return result;
    } catch (error: any) {
      logger.error(`❌ Calculate best discount error: ${error.message}`);
      // Return no discount on error
      return {
        tierDiscount: 0,
        codeDiscount: 0,
        finalDiscount: 0,
        discountType: 'NONE',
      };
    }
  }

  /**
   * Apply discount proportionally across order items
   * Distributes the discount amount based on each item's contribution to subtotal
   */
  applyDiscountToItems(items: IOrderItem[], totalDiscount: number): IOrderItem[] {
    if (totalDiscount === 0) {
      return items.map(item => ({ ...item, discounts: 0 }));
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    let remainingDiscount = totalDiscount;

    const updatedItems = items.map((item, index) => {
      let itemDiscount: number;

      if (index === items.length - 1) {
        // Last item gets remaining discount to handle rounding
        itemDiscount = remainingDiscount;
      } else {
        // Proportional discount based on item's contribution to subtotal
        itemDiscount = Math.round((item.subtotal / subtotal) * totalDiscount * 100) / 100;
        remainingDiscount -= itemDiscount;
      }

      return {
        ...item,
        discounts: itemDiscount,
      };
    });

    return updatedItems;
  }

  /**
   * Create a new discount code (admin only)
   */
  async createDiscountCode(data: CreateDiscountCodeData) {
    try {
      // Check if code already exists
      const existing = await DiscountCode.findOne({ code: data.code.toUpperCase() });
      if (existing) {
        throw new Error('Discount code already exists');
      }

      // Convert assignedUsers to ObjectIds if provided
      const assignedUsers = data.assignedUsers
        ? data.assignedUsers.map(id => new mongoose.Types.ObjectId(id))
        : [];

      const discountCode = new DiscountCode({
        code: data.code.toUpperCase(),
        description: data.description,
        type: data.type,
        value: data.value,
        scope: data.scope,
        assignedUsers,
        minPurchaseAmount: data.minPurchaseAmount || 0,
        maxDiscountAmount: data.maxDiscountAmount || 0,
        maxUsesGlobal: data.maxUsesGlobal || 0,
        maxUsesPerUser: data.maxUsesPerUser || 1,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(data.createdBy),
      });

      await discountCode.save();

      logger.info(`✅ Discount code created: ${discountCode.code}`);

      return {
        success: true,
        data: { discountCode },
        message: 'Discount code created successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Create discount code error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign a discount code to a specific user
   */
  async assignCodeToUser(codeId: string, userId: string) {
    try {
      const [discountCode, customer] = await Promise.all([
        DiscountCode.findById(codeId),
        Customer.findById(userId),
      ]);

      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Ensure code is user-specific
      if (discountCode.scope !== DiscountScope.USER_SPECIFIC) {
        throw new Error('Only user-specific codes can be assigned to individual users');
      }

      const userIdObj = new mongoose.Types.ObjectId(userId);

      // Add user to discount code's assigned users
      if (!discountCode.assignedUsers.some(id => id.equals(userIdObj))) {
        discountCode.assignedUsers.push(userIdObj);
        await discountCode.save();
      }

      // Add code to customer's assigned codes
      await customer.assignDiscountCode(discountCode._id);

      logger.info(`✅ Discount code ${discountCode.code} assigned to user ${userId}`);

      return {
        success: true,
        message: 'Discount code assigned successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Assign code to user error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all discount codes available to a user
   */
  async getUserDiscountCodes(userId: string, cartTotal: number = 0) {
    try {
      const validCodes = await DiscountCode.findValidCodes(userId, cartTotal);

      return {
        success: true,
        data: { codes: validCodes },
      };
    } catch (error: any) {
      logger.error(`❌ Get user discount codes error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if customer reached milestones and auto-assign codes
   * Called after order is delivered
   */
  async checkMilestones(userId: string) {
    try {
      const customer = await Customer.findById(userId);
      if (!customer) return;

      const completedOrders = await customer.getCompletedOrderCount();

      // Define milestone codes
      const milestones = [
        { orderCount: 5, code: '5ORDERS15', description: '15% off for 5th order milestone', value: 15 },
        { orderCount: 10, code: '10ORDERS20', description: '20% off for 10th order milestone', value: 20 },
        { orderCount: 25, code: '25ORDERS25', description: '25% off for 25th order milestone', value: 25 },
        { orderCount: 50, code: '50ORDERS30', description: '30% off for 50th order milestone', value: 30 },
      ];

      for (const milestone of milestones) {
        if (completedOrders === milestone.orderCount) {
          // Check if code exists, create if not
          let code = await DiscountCode.findOne({ code: milestone.code });

          if (!code) {
            // Create milestone code
            const validFrom = new Date();
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days

            code = new DiscountCode({
              code: milestone.code,
              description: milestone.description,
              type: DiscountType.PERCENTAGE,
              value: milestone.value,
              scope: DiscountScope.USER_SPECIFIC,
              assignedUsers: [],
              minPurchaseAmount: 0,
              maxDiscountAmount: 500, // Cap at ₹500
              maxUsesGlobal: 0,
              maxUsesPerUser: 1, // One-time use
              validFrom,
              validUntil,
              isActive: true,
              createdBy: new mongoose.Types.ObjectId(userId), // Self-earned
            });

            await code.save();
          }

          // Assign to customer
          await this.assignCodeToUser(code._id.toString(), userId);

          logger.info(`🎉 Milestone reached! User ${userId} unlocked ${milestone.code}`);
        }
      }
    } catch (error: any) {
      logger.error(`❌ Check milestones error: ${error.message}`);
      // Don't throw - this is a bonus feature, shouldn't break order flow
    }
  }

  /**
   * Get all discount codes (admin)
   */
  async getAllDiscountCodes(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [codes, total] = await Promise.all([
        DiscountCode.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'email profile.name'),
        DiscountCode.countDocuments(),
      ]);

      return {
        success: true,
        data: {
          codes,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error: any) {
      logger.error(`❌ Get all discount codes error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update discount code
   */
  async updateDiscountCode(codeId: string, updates: Partial<CreateDiscountCodeData>) {
    try {
      const discountCode = await DiscountCode.findById(codeId);
      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      // Update allowed fields
      if (updates.description) discountCode.description = updates.description;
      if (updates.value !== undefined) discountCode.value = updates.value;
      if (updates.minPurchaseAmount !== undefined) discountCode.minPurchaseAmount = updates.minPurchaseAmount;
      if (updates.maxDiscountAmount !== undefined) discountCode.maxDiscountAmount = updates.maxDiscountAmount;
      if (updates.maxUsesGlobal !== undefined) discountCode.maxUsesGlobal = updates.maxUsesGlobal;
      if (updates.maxUsesPerUser !== undefined) discountCode.maxUsesPerUser = updates.maxUsesPerUser;
      if (updates.validFrom) discountCode.validFrom = updates.validFrom;
      if (updates.validUntil) discountCode.validUntil = updates.validUntil;

      await discountCode.save();

      logger.info(`✅ Discount code updated: ${discountCode.code}`);

      return {
        success: true,
        data: { discountCode },
        message: 'Discount code updated successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Update discount code error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deactivate discount code
   */
  async deactivateDiscountCode(codeId: string) {
    try {
      const discountCode = await DiscountCode.findById(codeId);
      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      discountCode.isActive = false;
      await discountCode.save();

      logger.info(`✅ Discount code deactivated: ${discountCode.code}`);

      return {
        success: true,
        message: 'Discount code deactivated successfully',
      };
    } catch (error: any) {
      logger.error(`❌ Deactivate discount code error: ${error.message}`);
      throw error;
    }
  }
}

export default new DiscountService();
