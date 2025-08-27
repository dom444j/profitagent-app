import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';
import { settingsService } from '../../services/settings';

const execAsync = promisify(exec);

export class DockerOrderService {
  static async executeSQL(query: string, params: any[] = []): Promise<string[]> {
    try {
      // Escape parameters for SQL injection protection
      const escapedParams = params.map(param => {
        if (typeof param === 'string') {
          return `'${param.replace(/'/g, "''")}'`;
        }
        return param;
      });
      
      // Replace $1, $2, etc. with actual parameters
      let finalQuery = query;
      escapedParams.forEach((param, index) => {
        finalQuery = finalQuery.replace(`$${index + 1}`, param);
      });
      
      const command = `docker exec grow5x_pg psql -U grow5x -d grow5x -t -c "${finalQuery}"`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('NOTICE')) {
        logger.error('SQL Error: ' + stderr);
        throw new Error(stderr);
      }
      
      // Parse the output - split by lines and filter empty lines
      const lines = stdout.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      
      return lines;
    } catch (error: any) {
      logger.error('Docker SQL execution failed: ' + (error as Error).message);
      throw error;
    }
  }

  static async getUserPendingOrder(userId: string) {
    try {
      logger.info('🔍 DockerOrderService.getUserPendingOrder called with userId:', userId);
      const orders = await this.executeSQL(
        `SELECT od.id, od.user_id, od.product_id, od.amount_usdt, od.wallet_address, od.status, od.expires_at, od.created_at, od.updated_at, lp.name as product_name, lp.price_usdt as product_price FROM orders_deposits od JOIN license_products lp ON od.product_id = lp.id WHERE od.user_id = $1 AND od.status IN ('pending', 'paid') AND od.expires_at > NOW() ORDER BY od.created_at DESC LIMIT 1`,
        [userId]
      );
      logger.info('📊 SQL query result for pending orders:', orders);

      if (orders.length === 0 || !orders[0]) {
        logger.info('✅ No pending orders found for user:', userId);
        return null;
      }
      logger.info('⚠️ Found existing pending order for user:', userId);

      const orderData = orders[0].split('|').map((s: string) => s.trim());
      return {
        id: orderData[0],
        user_id: orderData[1],
        product_id: orderData[2],
        amount_usdt: parseFloat(orderData[3] ?? '0'),
        wallet_address: orderData[4],
        status: orderData[5],
        expires_at: new Date(orderData[6] ?? new Date().toISOString()),
        created_at: new Date(orderData[7] ?? new Date().toISOString()),
        updated_at: new Date(orderData[8] ?? new Date().toISOString()),
        product: {
          name: orderData[9] || '',
          price_usdt: parseFloat(orderData[10] ?? '0')
        }
      };
    } catch (error: any) {
      logger.error('❌ Docker getUserPendingOrder failed: ' + (error as Error).message);
      return null;
    }
  }

  static async createOrder(userId: string, productId: string, amountUsdt: number, walletAddress: string) {
    try {
      logger.info('🚀 DockerOrderService.createOrder called with:', { userId, productId, amountUsdt, walletAddress });
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expirationMinutes = await settingsService.getOrderExpirationMinutes();
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000); // configurable minutes from now
      logger.info('📝 Generated orderId:', orderId, 'expiresAt:', expiresAt);
      
      logger.info('💾 Executing INSERT query...');
      await this.executeSQL(
        `INSERT INTO orders_deposits (id, user_id, product_id, amount_usdt, wallet_address, status, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW())`,
        [orderId, userId, productId, amountUsdt, walletAddress, expiresAt.toISOString()]
      );
      logger.info('✅ INSERT query completed successfully');

      // Get the created order with product info
      const orders = await this.executeSQL(
        `SELECT od.id, od.user_id, od.product_id, od.amount_usdt, od.wallet_address, od.status, od.expires_at, od.created_at, od.updated_at, lp.name as product_name, lp.price_usdt as product_price FROM orders_deposits od JOIN license_products lp ON od.product_id = lp.id WHERE od.id = $1`,
        [orderId]
      );

      if (orders.length === 0 || !orders[0]) {
        throw new Error('Failed to retrieve created order');
      }

      const orderData = orders[0].split('|').map((s: string) => s.trim());
      return {
        id: orderData[0],
        user_id: orderData[1],
        product_id: orderData[2],
        amount_usdt: parseFloat(orderData[3] ?? '0'),
        wallet_address: orderData[4],
        status: orderData[5],
        expires_at: new Date(orderData[6] ?? new Date().toISOString()),
        created_at: new Date(orderData[7] ?? new Date().toISOString()),
        updated_at: new Date(orderData[8] ?? new Date().toISOString()),
        product: {
          name: orderData[9],
          price_usdt: parseFloat(orderData[10] ?? '0')
        }
      };
    } catch (error: any) {
      logger.error('❌ Docker createOrder failed: ' + (error as Error).message);
      throw error;
    }
  }

  static async submitTransaction(orderId: string, userId: string, txHash: string) {
    try {
      // First check if order exists and belongs to user
      const checkResult = await this.executeSQL(
        `SELECT id FROM orders_deposits WHERE id = $1 AND user_id = $2 AND status = 'pending' AND expires_at > NOW()`,
        [orderId, userId]
      );
      
      if (checkResult.length === 0) {
        return null;
      }
      
      // Update order with transaction hash
      await this.executeSQL(
        `UPDATE orders_deposits SET tx_hash = $1, status = 'paid', updated_at = NOW() WHERE id = $2`,
        [txHash, orderId]
      );
      
      // Return updated order
      const orderResult = await this.executeSQL(
        `SELECT id, status, tx_hash FROM orders_deposits WHERE id = $1`,
        [orderId]
      );
      
      if (orderResult.length === 0) {
        return null;
      }
      
      const orderData = orderResult[0]?.split('|') || [];
      return {
        id: (orderData[0] ?? '') as string,
        status: (orderData[1] ?? '') as string,
        tx_hash: (orderData[2] ?? null) as string | null
      };
    } catch (error: any) {
      logger.error('Docker submitTransaction failed: ' + (error as Error).message);
      throw error;
    }
  }

  static async getOrderById(orderId: string, userId: string) {
    try {
      const orders = await this.executeSQL(
        `SELECT od.id, od.user_id, od.product_id, od.amount_usdt, od.wallet_address, od.status, od.tx_hash, od.expires_at, od.created_at, od.updated_at, lp.name as product_name, lp.price_usdt as product_price FROM orders_deposits od JOIN license_products lp ON od.product_id = lp.id WHERE od.id = $1 AND od.user_id = $2`,
        [orderId, userId]
      );

      if (orders.length === 0) {
        return null;
      }

      const orderData = orders[0]?.split('|').map((s: string) => s.trim()) || [];
      return {
        id: orderData[0] || '',
        user_id: orderData[1] || '',
        product_id: orderData[2] || '',
        amount_usdt: parseFloat(orderData[3] ?? '0'),
        wallet_address: orderData[4] || '',
        status: orderData[5] || '',
        tx_hash: orderData[6] || null,
        expires_at: new Date(orderData[7] ?? new Date().toISOString()),
        created_at: new Date(orderData[8] ?? new Date().toISOString()),
        updated_at: new Date(orderData[9] ?? new Date().toISOString()),
        product: {
          name: orderData[10] || '',
          price_usdt: parseFloat(orderData[11] ?? '0')
        }
      };
    } catch (error: any) {
      logger.error('Docker getOrderById failed: ' + (error as Error).message);
      throw error;
    }
  }
}