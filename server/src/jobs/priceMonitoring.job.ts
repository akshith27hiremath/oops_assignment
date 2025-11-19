import cron from 'node-cron';
import priceMonitoringService from '../services/priceMonitoring.service';
import { logger } from '../utils/logger';

/**
 * Schedule price monitoring job
 * Runs every hour at :00 minutes
 */
export function schedulePriceMonitoring(): void {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('⏰ Price monitoring cron job triggered');
      await priceMonitoringService.monitorAllPrices();
    } catch (error: any) {
      logger.error('❌ Price monitoring cron job failed:', error);
    }
  });

  logger.info('✅ Price monitoring cron job scheduled (runs hourly)');
}

/**
 * Run price monitoring immediately (for testing)
 */
export async function runPriceMonitoringNow(): Promise<void> {
  await priceMonitoringService.monitorAllPrices();
}
