import { Request, Response } from 'express';
import { LicenseService } from './service';
import { logger } from '../../utils/logger';
import '../../lib/middleware';

export class LicenseController {
  private licenseService: LicenseService;

  constructor() {
    this.licenseService = new LicenseService();
  }

  // GET /licenses/products - Get available license products for purchase
  getAvailableProducts = async (req: Request, res: Response) => {
    try {
      const products = await this.licenseService.getAvailableProducts();
      return res.json({ data: products });
    } catch (error) {
      logger.error('Error getting available products: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  // GET /licenses - Get user licenses
  getLicenses = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await this.licenseService.getUserLicenses(userId, status as string | undefined, page, limit);
      
      return res.json(result);
    } catch (error) {
      logger.error('Error getting licenses: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  // GET /licenses/:id/earnings - Get license earnings history
  getLicenseEarnings = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const licenseId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!licenseId) {
        return res.status(400).json({ error: 'License ID is required' });
      }

      const earnings = await this.licenseService.getLicenseEarnings(licenseId, userId);
      
      return res.json({ data: earnings });
    } catch (error) {
      logger.error('Error getting license earnings: ' + (error as Error).message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const licenseController = new LicenseController();