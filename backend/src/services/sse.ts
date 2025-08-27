import { Response } from 'express';
import { logger } from '../utils/logger';

export interface SSEClient {
  id: string;
  userId?: string;
  isAdmin?: boolean;
  response: Response;
  lastPing: number;
}

export interface SSEEvent {
  type: 'earningPaid' | 'licensePaused' | 'licenseCompleted' | 'orderUpdated' | 'withdrawalUpdated' | 'commissionReleased' | 'connected';
  data: any;
  userId?: string; // For user-specific events
  adminOnly?: boolean; // For admin-only events
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor() {
    // Send ping every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
  }

  /**
   * Add a new SSE client
   */
  addClient(clientId: string, response: Response, userId?: string, isAdmin?: boolean): void {
    const client: SSEClient = {
      id: clientId,
      response,
      lastPing: Date.now()
    };
    
    if (userId !== undefined) {
      client.userId = userId;
    }
    
    if (isAdmin !== undefined) {
      client.isAdmin = isAdmin;
    }

    this.clients.set(clientId, client);
    
    // Set SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    this.sendToClient(clientId, {
      type: 'connected',
      data: { message: 'SSE connection established', timestamp: new Date().toISOString() }
    });

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });

    logger.info({ clientId, userId, isAdmin }, 'SSE client connected');
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch (error) {
        // Client already disconnected
      }
      this.clients.delete(clientId);
      logger.info({ clientId }, 'SSE client disconnected');
    }
  }

  /**
   * Send event to a specific client
   */
  private sendToClient(clientId: string, event: any): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      const eventData = `data: ${JSON.stringify(event)}\n\n`;
      client.response.write(eventData);
      return true;
    } catch (error) {
      logger.error({ clientId, error }, 'Failed to send SSE event to client');
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Broadcast event to all relevant clients
   */
  broadcast(event: SSEEvent): void {
    let sentCount = 0;
    
    for (const [clientId, client] of this.clients) {
      let shouldSend = false;

      // Check if event should be sent to this client
      if (event.adminOnly && !client.isAdmin) {
        continue; // Skip non-admin clients for admin-only events
      }

      if (event.userId && client.userId !== event.userId) {
        continue; // Skip clients that don't match the target user
      }

      if (!event.userId && !event.adminOnly) {
        shouldSend = true; // Global event
      } else if (event.userId && client.userId === event.userId) {
        shouldSend = true; // User-specific event
      } else if (event.adminOnly && client.isAdmin) {
        shouldSend = true; // Admin-only event
      }

      if (shouldSend) {
        const success = this.sendToClient(clientId, {
          type: event.type,
          data: event.data,
          timestamp: new Date().toISOString()
        });
        
        if (success) {
          sentCount++;
        }
      }
    }

    logger.info({ 
      eventType: event.type, 
      sentCount, 
      totalClients: this.clients.size,
      userId: event.userId,
      adminOnly: event.adminOnly
    }, 'SSE event broadcasted');
  }

  /**
   * Send ping to all clients to keep connections alive
   */
  private pingClients(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      // Remove clients that haven't been pinged in 2 minutes
      if (now - client.lastPing > 120000) {
        staleClients.push(clientId);
        continue;
      }

      try {
        client.response.write(': ping\n\n');
        client.lastPing = now;
      } catch (error) {
        staleClients.push(clientId);
      }
    }

    // Remove stale clients
    staleClients.forEach(clientId => {
      this.removeClient(clientId);
    });

    if (this.clients.size > 0) {
      logger.debug({ activeClients: this.clients.size }, 'SSE ping sent to clients');
    }
  }

  /**
   * Get current client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get clients by user ID
   */
  getClientsByUserId(userId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(client => client.userId === userId);
  }

  /**
   * Get admin clients
   */
  getAdminClients(): SSEClient[] {
    return Array.from(this.clients.values()).filter(client => client.isAdmin);
  }

  /**
   * Send event to a specific user
   */
  sendToUser(userId: string, event: Omit<SSEEvent, 'userId'>): void {
    this.broadcast({
      ...event,
      userId
    });
  }

  /**
   * Send event to all admin clients
   */
  sendToAdmins(event: Omit<SSEEvent, 'adminOnly'>): void {
    this.broadcast({
      ...event,
      adminOnly: true
    });
  }

  /**
   * Get service statistics
   */
  getStats(): any {
    const adminClients = this.getAdminClients().length;
    const totalClients = this.getClientCount();
    const userClients = totalClients - adminClients;
    
    return {
      totalClients,
      adminClients,
      userClients,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start the SSE service
   */
  start(): void {
    logger.info('SSE service started');
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    clearInterval(this.pingInterval);
    
    // Close all client connections
    for (const [clientId] of this.clients) {
      this.removeClient(clientId);
    }
    
    logger.info('SSE service shutdown completed');
  }
}

// Export singleton instance
export const sseService = new SSEService();

// Graceful shutdown
process.on('SIGINT', () => {
  sseService.shutdown();
});

process.on('SIGTERM', () => {
  sseService.shutdown();
});