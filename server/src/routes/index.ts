import { Router } from 'express';
import passport from 'passport';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import inventoryRoutes from './inventory.routes';
import wholesaleRoutes from './wholesale.routes';
import wholesalerOrderRoutes from './wholesalerOrder.routes';
import storeRoutes from './store.routes';
import reviewRoutes from './review.routes';
import notificationRoutes from './notification.routes';
import analyticsRoutes from './analytics.routes';
import searchRoutes from './search.routes';
import wishlistRoutes from './wishlist.routes';
import discountCodeRoutes from './discountCode.routes';
import recipeRoutes from './recipe.routes';
import { generateOAuthTokens } from '../services/oauth.service';
import { getDatabaseStatus } from '../config/database';

/**
 * Main Routes Index
 * Aggregates all route modules
 */

const router = Router();

// API health check
router.get('/health', (_req, res) => {
  const dbStatus = getDatabaseStatus();

  res.status(dbStatus.connected ? 200 : 503).json({
    status: dbStatus.connected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/wholesale', wholesaleRoutes);
router.use('/b2b/orders', wholesalerOrderRoutes);
router.use('/stores', storeRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/search', searchRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/discount-codes', discountCodeRoutes);
router.use('/recipes', recipeRoutes);

/**
 * OAuth Routes
 */

// Google OAuth
router.get(
  '/auth/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect('http://localhost:3000/login?error=oauth_failed');
      }

      // Generate JWT tokens
      const tokens = await generateOAuthTokens(req.user);

      // Encode user and tokens as URL parameters and redirect to frontend
      const userData = encodeURIComponent(JSON.stringify(req.user));
      const accessToken = encodeURIComponent(tokens.accessToken);
      const refreshToken = encodeURIComponent(tokens.refreshToken);

      res.redirect(
        `http://localhost:3000/auth/callback?user=${userData}&accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      res.redirect('http://localhost:3000/login?error=oauth_failed');
    }
  }
);

// Facebook OAuth
router.get(
  '/auth/facebook',
  passport.authenticate('facebook', { session: false, scope: ['email'] })
);

router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect('http://localhost:3000/login?error=oauth_failed');
      }

      // Generate JWT tokens
      const tokens = await generateOAuthTokens(req.user);

      // Encode user and tokens as URL parameters and redirect to frontend
      const userData = encodeURIComponent(JSON.stringify(req.user));
      const accessToken = encodeURIComponent(tokens.accessToken);
      const refreshToken = encodeURIComponent(tokens.refreshToken);

      res.redirect(
        `http://localhost:3000/auth/callback?user=${userData}&accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      res.redirect('http://localhost:3000/login?error=oauth_failed');
    }
  }
);

// 404 handler for /api routes
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

export default router;
