/**
 * Payment Routes for ProFitAgent
 * Handles USDT BEP20 payment operations
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const USDTPaymentService = require('../services/usdt-payment-service');
const { authenticateToken } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/validation');

const router = express.Router();
const prisma = new PrismaClient();
const paymentService = new USDTPaymentService();

/**
 * Create a new payment order
 * POST /api/payments/create-order
 */
router.post('/create-order', authenticateToken, validatePaymentRequest, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    // Get product details
    const product = await prisma.licenseProduct.findUnique({
      where: { id: productId }
    });

    if (!product || !product.active) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or inactive'
      });
    }

    // Check if user already has an active license for this product
    const existingLicense = await prisma.userLicense.findFirst({
      where: {
        user_id: userId,
        product_id: productId,
        status: 'active'
      }
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active license for this product'
      });
    }

    // Create order
    const order = await prisma.orderDeposit.create({
      data: {
        user_id: userId,
        product_id: productId,
        amount_usdt: product.price_usdt,
        wallet_address: '', // Will be set by payment service
        status: 'pending',
        payment_method: 'USDT',
        expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
    });

    // Generate payment address
    const paymentDetails = await paymentService.generatePaymentAddress(userId, order.id);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        product: {
          name: product.name,
          price: product.price_usdt,
          duration: product.duration_days
        },
        payment: paymentDetails
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Check payment status
 * GET /api/payments/status/:orderId
 */
router.get('/status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Verify order belongs to user
    const order = await prisma.orderDeposit.findFirst({
      where: {
        id: orderId,
        user_id: userId
      },
      include: {
        product: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check payment status
    const paymentStatus = await paymentService.checkPaymentStatus(orderId);

    res.json({
      success: true,
      data: {
        orderId: orderId,
        status: paymentStatus.status,
        amount: order.amount_usdt,
        product: order.product.name,
        createdAt: order.created_at,
        expiresAt: order.expires_at,
        ...paymentStatus
      }
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get user's payment history
 * GET /api/payments/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.orderDeposit.findMany({
        where: { user_id: userId },
        include: {
          product: {
            select: {
              name: true,
              code: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.orderDeposit.count({
        where: { user_id: userId }
      })
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order.id,
          product: order.product.name,
          productCode: order.product.code,
          amount: order.amount_usdt,
          status: order.status,
          txHash: order.tx_hash,
          createdAt: order.created_at,
          paidAt: order.paid_at,
          confirmedAt: order.confirmed_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get wallet balance
 * GET /api/payments/wallet-balance/:address
 */
router.get('/wallet-balance/:address', authenticateToken, async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const balance = await paymentService.getWalletBalance(address);

    res.json({
      success: true,
      data: {
        address: address,
        balance: balance,
        token: 'USDT',
        network: 'BSC (BEP20)'
      }
    });

  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Manual payment verification (Admin only)
 * POST /api/payments/verify-manual
 */
router.post('/verify-manual', authenticateToken, async (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const order = await prisma.orderDeposit.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        product: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Order already confirmed'
      });
    }

    // Manual verification - create mock transaction
    const mockTransaction = {
      hash: txHash,
      from: '0x0000000000000000000000000000000000000000',
      to: order.wallet_address,
      value: order.amount_usdt.toString(),
      timestamp: new Date().toISOString(),
      manual: true
    };

    // Process the payment
    const license = await paymentService.processPayment(orderId, mockTransaction);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actor_id: req.user.id,
        action: 'manual_payment_verification',
        resource_type: 'order',
        resource_id: orderId,
        details: {
          txHash: txHash,
          amount: order.amount_usdt,
          userId: order.user_id
        }
      }
    });

    res.json({
      success: true,
      data: {
        orderId: orderId,
        licenseId: license.id,
        status: 'confirmed',
        txHash: txHash
      }
    });

  } catch (error) {
    console.error('Error in manual payment verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get payment statistics (Admin only)
 * GET /api/payments/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { period = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = { gte: new Date(now - 24 * 60 * 60 * 1000) };
        break;
      case '7d':
        dateFilter = { gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { gte: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    const [totalOrders, confirmedOrders, pendingOrders, expiredOrders, totalRevenue] = await Promise.all([
      prisma.orderDeposit.count({
        where: { created_at: dateFilter }
      }),
      prisma.orderDeposit.count({
        where: {
          status: 'confirmed',
          created_at: dateFilter
        }
      }),
      prisma.orderDeposit.count({
        where: {
          status: 'pending',
          created_at: dateFilter
        }
      }),
      prisma.orderDeposit.count({
        where: {
          status: 'expired',
          created_at: dateFilter
        }
      }),
      prisma.orderDeposit.aggregate({
        where: {
          status: 'confirmed',
          created_at: dateFilter
        },
        _sum: {
          amount_usdt: true
        }
      })
    ]);

    // Get revenue by product
    const revenueByProduct = await prisma.orderDeposit.groupBy({
      by: ['product_id'],
      where: {
        status: 'confirmed',
        created_at: dateFilter
      },
      _sum: {
        amount_usdt: true
      },
      _count: true
    });

    // Get product details
    const productDetails = await prisma.licenseProduct.findMany({
      where: {
        id: {
          in: revenueByProduct.map(r => r.product_id)
        }
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    const revenueByProductWithNames = revenueByProduct.map(revenue => {
      const product = productDetails.find(p => p.id === revenue.product_id);
      return {
        productId: revenue.product_id,
        productName: product?.name || 'Unknown',
        productCode: product?.code || 'Unknown',
        revenue: revenue._sum.amount_usdt || 0,
        orders: revenue._count
      };
    });

    res.json({
      success: true,
      data: {
        period: period,
        summary: {
          totalOrders: totalOrders,
          confirmedOrders: confirmedOrders,
          pendingOrders: pendingOrders,
          expiredOrders: expiredOrders,
          totalRevenue: totalRevenue._sum.amount_usdt || 0,
          conversionRate: totalOrders > 0 ? (confirmedOrders / totalOrders * 100).toFixed(2) : 0
        },
        revenueByProduct: revenueByProductWithNames
      }
    });

  } catch (error) {
    console.error('Error getting payment statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Webhook for payment notifications (if using external service)
 * POST /api/payments/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature if needed
    const { orderId, txHash, status, amount } = req.body;
    
    if (status === 'confirmed') {
      const order = await prisma.orderDeposit.findUnique({
        where: { id: orderId }
      });
      
      if (order && order.status === 'pending') {
        const transaction = {
          hash: txHash,
          value: amount,
          timestamp: new Date().toISOString(),
          webhook: true
        };
        
        await paymentService.processPayment(orderId, transaction);
      }
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;