import { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from './service';
import { orderService } from '../orders/service';
import { productService } from '../products/service';
import { userNotificationSettingsService } from '../../services/user-notification-settings';
import { logger } from '../../utils/logger';
import '../../lib/middleware'; // Import to extend Request type

const rejectOrderSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required')
});

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  code: z.string().min(1, 'Product code is required'),
  price_usdt: z.number().positive('Price must be positive'),
  daily_rate: z.number().min(0).max(1, 'Daily rate must be between 0 and 1'),
  duration_days: z.number().int().positive('Duration days must be a positive integer'),
  cashback_cap: z.number().min(0, 'Cashback cap must be non-negative'),
  potential_cap: z.number().min(0, 'Potential cap must be non-negative')
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  price_usdt: z.number().positive().optional(),
  daily_rate: z.number().min(0).max(1).optional(),
  duration_days: z.number().int().positive().optional(),
  cashback_cap: z.number().min(0).optional(),
  potential_cap: z.number().min(0).optional(),
  description: z.string().optional(),
  sla_hours: z.number().int().positive().optional(),
  badge: z.string().optional(),
  target_user: z.string().optional(),
  active: z.boolean().optional()
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted']),
  reason: z.string().optional()
});

const pauseUserPotentialSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().optional()
});

const createBonusSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  amount_usdt: z.number().positive(),
  reason: z.string().min(1, 'Reason is required')
});

const updateUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email format').optional()
});

const createWalletSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid BEP20 address format')
});

const updateWalletSchema = z.object({
  label: z.string().min(1, 'Label is required').optional(),
  status: z.enum(['active', 'inactive']).optional()
});

class AdminController {
  async getPendingOrders(req: Request, res: Response) {
    try {
      const orders = await adminService.getPendingOrders();
      
      const formattedOrders = orders.map(order => ({
        id: order.id,
        user_email: order.user.email,
        user_name: `${order.user.first_name} ${order.user.last_name}`,
        product_name: order.product.name,
        amount_usdt: order.amount_usdt.toString(),
        wallet_address: order.wallet_address,
        tx_hash: order.tx_hash,
        status: order.status,
        created_at: order.created_at
      }));
      
      return res.json({ orders: formattedOrders });
    } catch (error) {
      logger.error('Get pending orders error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllOrders(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      
      const orders = await adminService.getAllOrders({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        search: search as string
      });
      
      const formattedOrders = orders.data.map(order => ({
        id: order.id,
        user_email: order.user.email,
        user_name: `${order.user.first_name} ${order.user.last_name}`,
        product_name: order.product.name,
        amount_usdt: order.amount_usdt.toString(),
        wallet_address: order.wallet_address,
        tx_hash: order.tx_hash,
        status: order.status,
        created_at: order.created_at,
        expires_at: order.expires_at,
        updated_at: order.updated_at
      }));
      
      return res.json({
        orders: formattedOrders,
        pagination: {
          page: orders.page,
          limit: orders.limit,
          total: orders.total,
          pages: orders.pages
        }
      });
    } catch (error) {
      logger.error(`Get all orders error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async confirmOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = user.id;
      
      if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      
      const result = await orderService.confirmOrder(id, adminId);
      if (!result) {
        return res.status(404).json({ error: 'Order not found or cannot be confirmed' });
      }
      
      return res.json({
        message: 'Order confirmed successfully',
        order: {
          id: result.order.id,
          status: result.order.status
        },
        license: {
          id: result.license.id,
          status: result.license.status
        }
      });
    } catch (error) {
      logger.error(`Confirm order error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async rejectOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = rejectOrderSchema.parse(req.body);
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = user.id;
      
      if (!id) {
        return res.status(400).json({ error: 'Order ID is required' });
      }
      
      const order = await adminService.rejectOrder(id, adminId, reason);
      if (!order) {
        return res.status(404).json({ error: 'Order not found or cannot be rejected' });
      }
      
      return res.json({
        message: 'Order rejected successfully',
        order: {
          id: order.id,
          status: order.status
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      }
      logger.error(`Reject order error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await adminService.getUsers(page, limit);
      
      const formattedUsers = result.users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        ref_code: user.ref_code,
        sponsor_id: user.sponsor_id,
        status: user.status,
        created_at: user.created_at,
        total_licenses: user._count.licenses,
        total_orders: user._count.orders
      }));
      
      return res.json({
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      logger.error('Get users error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  async getStats(req: Request, res: Response) {
    try {
      const stats = await adminService.getStats();
      return res.json(stats);
    } catch (error) {
      logger.error('Get stats error: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /admin/licenses - Get all licenses with filters
  async getLicenses(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const userId = req.query.userId as string;

      const result = await adminService.getLicenses(page, limit, status, userId);
      return res.json(result);
    } catch (error) {
      logger.error(`Get licenses error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /admin/licenses/:id/pause-potential - Pause/unpause license potential
  async pauseLicensePotential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { pause } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId: string = user.id;

      if (!id) {
        return res.status(400).json({ error: 'License ID is required' });
      }

      if (typeof pause !== 'boolean') {
        return res.status(400).json({ error: 'pause field must be boolean' });
      }
      const pauseBool: boolean = pause as boolean;
      const licenseId: string = id as string;

      const license = await adminService.pauseLicensePotential(licenseId, pauseBool, adminId);
      if (!license) {
        return res.status(404).json({ error: 'License not found' });
      }

      return res.json({
        message: `License potential ${pauseBool ? 'paused' : 'resumed'} successfully`,
        license: {
          id: license.id,
          pause_potential: license.pause_potential
        }
      });
    } catch (error) {
      logger.error(`Pause license potential error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /admin/overview - Get admin overview dashboard
  async getOverview(req: Request, res: Response) {
    try {
      const overview = await adminService.getOverview();
      return res.json(overview);
    } catch (error) {
      logger.error(`Get overview error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /admin/products - Get all products with pagination
  async getProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await adminService.getProducts(page, limit);
      
      const formattedProducts = result.products.map(product => ({
        id: product.id,
        name: product.name,
        code: product.code,
        price_usdt: product.price_usdt.toString(),
        daily_rate: product.daily_rate.toString(),
        duration_days: product.duration_days,
        cashback_cap: product.cashback_cap.toString(),
        potential_cap: product.potential_cap.toString(),
        active: product.active,
        created_at: product.created_at,
        updated_at: product.updated_at
      }));
      
      return res.json({
        products: formattedProducts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error) {
      logger.error(`Get products error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /admin/products - Create new product
  async createProduct(req: Request, res: Response) {
    try {
      const data = createProductSchema.parse(req.body);
      
      const product = await adminService.createProduct(data);
      
      return res.status(201).json({
        message: 'Product created successfully',
        product: {
          id: product.id,
          name: product.name,
          code: product.code,
          price_usdt: product.price_usdt.toString(),
          daily_rate: product.daily_rate.toString(),
          duration_days: product.duration_days,
          cashback_cap: product.cashback_cap.toString(),
          potential_cap: product.potential_cap.toString(),
          active: product.active,
          created_at: product.created_at
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      }
      logger.error(`Create product error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT /admin/products/:id - Update product
  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }
      console.log('Datos recibidos en el backend para actualizar producto:', req.body);
      const data = updateProductSchema.parse(req.body);
      console.log('Datos después de validación Zod:', data);
      
      const product = await adminService.updateProduct(id, data);
      console.log('Producto actualizado en la base de datos:', product);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      return res.json({
        message: 'Product updated successfully',
        product: {
          id: product.id,
          name: product.name,
          code: product.code,
          price_usdt: product.price_usdt.toString(),
          daily_rate: product.daily_rate.toString(),
          duration_days: product.duration_days,
          cashback_cap: product.cashback_cap.toString(),
          potential_cap: product.potential_cap.toString(),
          active: product.active,
          updated_at: product.updated_at
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      }
      logger.error(`Update product error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE /admin/products/:id - Delete product
  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }
      
      await adminService.deleteProduct(id);
      
      return res.json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot delete product')) {
        return res.status(400).json({ error: error.message });
      }
      logger.error(`Delete product error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const { status, reason } = updateUserStatusSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = user.id;

      const result = await adminService.updateUserStatus(id, status, adminId, reason);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        message: `User ${status} successfully`,
        user: {
          id: result.id,
          email: result.email,
          status: result.status
        }
      });
    } catch (error) {
      logger.error(`Update user status error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async pauseUserPotential(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      const { enabled, reason } = pauseUserPotentialSchema.parse(req.body);
      const user = req.user;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = user.id;

      const result = await adminService.pauseUserPotential(id, enabled, adminId, reason);
      if (!result) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        message: `User potential ${enabled ? 'paused' : 'resumed'} successfully`,
        user: {
          id: result.id,
          email: result.email,
          potential_paused: enabled
        }
      });
    } catch (error) {
      logger.error(`Pause user potential error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const profile = await adminService.getUserProfile(id);
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ profile });
    } catch (error) {
      logger.error(`Get user profile error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getBonuses(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filters = {
        status: req.query.status as string,
        user_email: req.query.user_email as string,
        created_from: req.query.created_from as string,
        created_to: req.query.created_to as string
      };

      const result = await adminService.getBonuses(page, limit, filters);
      return res.json(result);
    } catch (error) {
      logger.error(`Get bonuses error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createBonus(req: Request, res: Response) {
    try {
      const { user_id, amount_usdt, reason } = createBonusSchema.parse(req.body);
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = user.id;

      const bonus = await adminService.createBonus(user_id, amount_usdt, reason, adminId);
      if (!bonus) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        message: 'Bonus created successfully',
        bonus: {
          id: bonus.id,
          amount_usdt: bonus.amount_usdt.toString(),
          reason: bonus.reason,
          status: bonus.status
        }
      });
    } catch (error) {
      logger.error(`Create bonus error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateDataRaw = updateUserSchema.parse(req.body);
      // Remove undefined values to satisfy exactOptionalPropertyTypes
      const updateData = Object.fromEntries(
        Object.entries(updateDataRaw).filter(([, v]) => v !== undefined)
      ) as { first_name?: string; last_name?: string; email?: string };
      const authUser = req.user;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (!authUser) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const adminId = authUser.id;

      const updatedUser = await adminService.updateUser(id, updateData, adminId);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          status: updatedUser.status
        }
      });
    } catch (error) {
      logger.error(`Update user error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Wallet management methods
  async getWallets(req: Request, res: Response) {
    try {
      const wallets = await adminService.getWallets();
      return res.json({ wallets });
    } catch (error) {
      logger.error(`Get wallets error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createWallet(req: Request, res: Response) {
    try {
      const { label, address } = createWalletSchema.parse(req.body);
      
      const wallet = await adminService.createWallet(label, address);
      return res.status(201).json({
        message: 'Wallet created successfully',
        wallet: {
          id: wallet.id,
          label: wallet.label,
          address: wallet.address,
          status: wallet.status,
          assigned_count: wallet.assigned_count
        }
      });
    } catch (error) {
      logger.error(`Create wallet error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if ((error as Error).message.includes('already exists')) {
        return res.status(409).json({ error: 'Wallet address already exists' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateWallet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }
      const updateDataRaw = updateWalletSchema.parse(req.body);
      const updateData = Object.fromEntries(
        Object.entries(updateDataRaw).filter(([, v]) => v !== undefined)
      ) as { label?: string; status?: 'active' | 'inactive' };
      
      const wallet = await adminService.updateWallet(id, updateData);
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      return res.json({
        message: 'Wallet updated successfully',
        wallet: {
          id: wallet.id,
          label: wallet.label,
          address: wallet.address,
          status: wallet.status,
          assigned_count: wallet.assigned_count
        }
      });
    } catch (error) {
      logger.error(`Update wallet error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteWallet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }
      
      const deleted = await adminService.deleteWallet(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      return res.json({ message: 'Wallet deleted successfully' });
    } catch (error) {
      logger.error(`Delete wallet error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if ((error as Error).message.includes('has pending orders')) {
        return res.status(400).json({ error: 'Cannot delete wallet with pending orders' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/admin/notification-settings/stats
   * Get notification settings statistics
   */
  async getNotificationStats(req: Request, res: Response) {
    try {
      const stats = await userNotificationSettingsService.getNotificationStats();
      
      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error(`Error getting notification stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const adminController = new AdminController();