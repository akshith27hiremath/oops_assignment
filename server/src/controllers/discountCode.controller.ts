/**
 * Discount Code Controller
 * Handles HTTP requests for discount code management
 */

import { Request, Response } from 'express';
import discountService from '../services/discount.service';
import { DiscountType, DiscountScope } from '../models/DiscountCode.model';
import { logger } from '../utils/logger';

class DiscountCodeController {
  /**
   * Create a new discount code (Admin only)
   * POST /api/discount-codes
   */
  async createDiscountCode(req: Request, res: Response) {
    try {
      const {
        code,
        description,
        type,
        value,
        scope,
        assignedUsers,
        minPurchaseAmount,
        maxDiscountAmount,
        maxUsesGlobal,
        maxUsesPerUser,
        validFrom,
        validUntil,
      } = req.body;

      // Validate required fields
      if (!code || !description || !type || value === undefined || !validFrom || !validUntil) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: code, description, type, value, validFrom, validUntil',
        });
      }

      // Validate type
      if (!Object.values(DiscountType).includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount type. Must be PERCENTAGE or FIXED_AMOUNT',
        });
      }

      // Validate scope
      if (scope && !Object.values(DiscountScope).includes(scope)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scope. Must be PLATFORM_WIDE or USER_SPECIFIC',
        });
      }

      const result = await discountService.createDiscountCode({
        code,
        description,
        type,
        value,
        scope: scope || DiscountScope.PLATFORM_WIDE,
        assignedUsers,
        minPurchaseAmount,
        maxDiscountAmount,
        maxUsesGlobal,
        maxUsesPerUser,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        createdBy: req.user!.userId,
      });

      res.status(201).json(result);
    } catch (error: any) {
      logger.error(`❌ Create discount code error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create discount code',
      });
    }
  }

  /**
   * Get all discount codes (Admin only)
   * GET /api/discount-codes
   */
  async getAllDiscountCodes(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await discountService.getAllDiscountCodes(page, limit);
      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Get all discount codes error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch discount codes',
      });
    }
  }

  /**
   * Get customer's available discount codes
   * GET /api/discount-codes/my-codes
   */
  async getMyDiscountCodes(req: Request, res: Response) {
    try {
      const userId = req.user!._id.toString();
      const cartTotal = parseFloat(req.query.cartTotal as string) || 0;

      logger.info(`🔍 Getting discount codes for user ${userId}, cartTotal: ${cartTotal}`);
      const result = await discountService.getUserDiscountCodes(userId, cartTotal);
      logger.info(`📦 Found ${result.data.codes.length} codes for user ${userId}`);

      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Get user discount codes error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your discount codes',
      });
    }
  }

  /**
   * Validate a discount code
   * POST /api/discount-codes/validate
   */
  async validateDiscountCode(req: Request, res: Response) {
    try {
      const { code, cartTotal } = req.body;

      if (!code || cartTotal === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Code and cart total are required',
        });
      }

      const userId = req.user!._id.toString();
      const result = await discountService.validateDiscountCode(code, userId, cartTotal);

      if (result.valid) {
        res.json({
          success: true,
          data: {
            valid: true,
            code: result.discountCode,
            discount: result.discountCode!.calculateDiscount(cartTotal),
          },
          message: 'Discount code is valid',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.reason || 'Invalid discount code',
        });
      }
    } catch (error: any) {
      logger.error(`❌ Validate discount code error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to validate discount code',
      });
    }
  }

  /**
   * Update a discount code (Admin only)
   * PUT /api/discount-codes/:id
   */
  async updateDiscountCode(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await discountService.updateDiscountCode(id, updates);
      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Update discount code error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update discount code',
      });
    }
  }

  /**
   * Deactivate a discount code (Admin only)
   * DELETE /api/discount-codes/:id
   */
  async deactivateDiscountCode(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await discountService.deactivateDiscountCode(id);
      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Deactivate discount code error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to deactivate discount code',
      });
    }
  }

  /**
   * Assign discount code to a user (Admin only)
   * POST /api/discount-codes/:id/assign
   */
  async assignDiscountCodeToUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await discountService.assignCodeToUser(id, userId);
      res.json(result);
    } catch (error: any) {
      logger.error(`❌ Assign discount code error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to assign discount code',
      });
    }
  }
}

export default new DiscountCodeController();
