import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class DockerProductService {
  private static async executeSQL(query: string, params: any[] = []): Promise<string[]> {
    try {
      // Build the psql command with parameters
      let sqlCommand = query;
      
      // Replace $1, $2, etc. with actual values
      params.forEach((param, index) => {
        const placeholder = `$${index + 1}`;
        const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
        sqlCommand = sqlCommand.replace(new RegExp(`\\${placeholder}\\b`, 'g'), value.toString());
      });
      
      const command = `docker exec profitagent_pg psql -U profitagent -d profitagent -t -c "${sqlCommand}"`;
      logger.info('Executing SQL:', sqlCommand);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('NOTICE')) {
        logger.error('SQL Error:', stderr);
        throw new Error(stderr);
      }
      
      // Parse the output - split by lines and filter empty lines
      const lines = stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return lines;
    } catch (error: any) {
      logger.error('Docker SQL execution failed:', error);
      throw error;
    }
  }

  static async getActiveProducts() {
    try {
      const products = await this.executeSQL(
        'SELECT id, name, price_usdt, daily_rate, duration_days, max_cap_percentage, status, code, days, cashback_cap, potential_cap FROM license_products WHERE status = $1 ORDER BY price_usdt ASC',
        ['active']
      );

      return products.map(productLine => {
        const productData = productLine.split('|').map((s: string) => s.trim());
        return {
          id: productData[0],
          name: productData[1],
          price_usdt: parseFloat(productData[2] ?? '0'),
          daily_rate: parseFloat(productData[3] ?? '0'),
          duration_days: parseInt(productData[4] ?? '0', 10),
          max_cap_percentage: parseFloat(productData[5] ?? '0'),
          status: productData[6],
          code: productData[7] || null,
          days: productData[8] ? parseInt(productData[8], 10) : null,
          cashback_cap: productData[9] ? parseFloat(productData[9]) : 1.0,
          potential_cap: productData[10] ? parseFloat(productData[10]) : 1.0
        };
      });
    } catch (error: any) {
      logger.error('Docker getActiveProducts failed: ' + (error as Error).message);
      throw error;
    }
  }

  static async getProductById(id: string) {
    try {
      const products = await this.executeSQL(
        'SELECT id, name, price_usdt, daily_rate, duration_days, max_cap_percentage, status, code, days, cashback_cap, potential_cap FROM license_products WHERE id = $1',
        [id]
      );

      if (products.length === 0 || !products[0]) {
        return null;
      }

      const productData = products[0].split('|').map((s: string) => s.trim());
      return {
        id: productData[0],
        name: productData[1],
        price_usdt: parseFloat(productData[2] ?? '0'),
        daily_rate: parseFloat(productData[3] ?? '0'),
        duration_days: parseInt(productData[4] ?? '0', 10),
        max_cap_percentage: parseFloat(productData[5] ?? '0'),
        status: productData[6],
        code: productData[7] || null,
        days: productData[8] ? parseInt(productData[8], 10) : null,
        cashback_cap: productData[9] ? parseFloat(productData[9]) : 1.0,
        potential_cap: productData[10] ? parseFloat(productData[10]) : 1.0
      };
    } catch (error: any) {
      logger.error('Docker getProductById failed: ' + (error as Error).message);
      return null;
    }
  }
}
