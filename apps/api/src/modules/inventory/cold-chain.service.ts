import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { Cron, CronExpression } from '@nestjs/schedule';

interface TemperatureReading {
  sensorId: string;
  location: string;
  temperature: number;
  humidity: number;
  timestamp: Date;
  status: 'NORMAL' | 'WARNING' | 'ALERT';
}

interface ColdChainAlert {
  id: string;
  tenantId: string;
  vaccineLotId: string;
  vaccineName: string;
  lotNumber: string;
  alertType: 'TEMPERATURE_EXCURSION' | 'HUMIDITY_EXCURSION' | 'EXPIRY_WARNING' | 'STOCK_LOW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  reading?: TemperatureReading;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

const VACCINE_TEMP_RANGES: Record<string, { min: number; max: number; minHumidity: number; maxHumidity: number }> = {
  DEFAULT: { min: 2, max: 8, minHumidity: 20, maxHumidity: 80 },
  FROZEN: { min: -20, max: -15, minHumidity: 10, maxHumidity: 60 },
  AMBIENT: { min: 15, max: 25, minHumidity: 30, maxHumidity: 70 },
};

@Injectable()
export class ColdChainService {
  private readonly logger = new Logger(ColdChainService.name);
  private activeAlerts: Map<string, ColdChainAlert> = new Map();
  private sensorReadings: Map<string, TemperatureReading[]> = new Map();
  private alertCallbacks: ((alert: ColdChainAlert) => void)[] = [];

  // ==========================================================================
  // Temperature Monitoring
  // ==========================================================================

  onAlert(callback: (alert: ColdChainAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  recordTemperatureReading(tenantId: string, reading: TemperatureReading): ColdChainAlert | null {
    const sensorKey = `${tenantId}-${reading.sensorId}`;
    if (!this.sensorReadings.has(sensorKey)) {
      this.sensorReadings.set(sensorKey, []);
    }
    const readings = this.sensorReadings.get(sensorKey)!;
    readings.push(reading);

    // Keep last 100 readings per sensor
    if (readings.length > 100) readings.shift();

    // Check temperature range
    const actualRange = VACCINE_TEMP_RANGES['DEFAULT']!;

    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let alertType: 'TEMPERATURE_EXCURSION' | 'HUMIDITY_EXCURSION' = 'TEMPERATURE_EXCURSION';
    let message = '';

    if (reading.temperature < actualRange.min || reading.temperature > actualRange.max) {
      const midpoint = (actualRange.min + actualRange.max) / 2;
      const deviation = Math.abs(reading.temperature - midpoint);
      if (deviation > 5) severity = 'CRITICAL';
      else if (deviation > 3) severity = 'HIGH';
      else if (deviation > 1.5) severity = 'MEDIUM';

      message = `Temperature excursion at ${reading.location}: ${reading.temperature}°C (range: ${actualRange.min}-${actualRange.max}°C)`;
      alertType = 'TEMPERATURE_EXCURSION';
    } else if (reading.humidity < actualRange.minHumidity || reading.humidity > actualRange.maxHumidity) {
      message = `Humidity excursion at ${reading.location}: ${reading.humidity}% (range: ${actualRange.minHumidity}-${actualRange.maxHumidity}%)`;
      alertType = 'HUMIDITY_EXCURSION';
    } else {
      return null; // Normal reading
    }

    const alert: ColdChainAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      vaccineLotId: '',
      vaccineName: '',
      lotNumber: '',
      alertType,
      severity,
      message,
      reading,
      createdAt: new Date(),
    };

    const alertKey = `${tenantId}-${reading.sensorId}-${alertType}`;
    const existingAlert = this.activeAlerts.get(alertKey);
    
    // Only create new alert if severity increased or last alert was > 30 min ago
    if (existingAlert) {
      const timeSinceLastAlert = Date.now() - existingAlert.createdAt.getTime();
      if (timeSinceLastAlert < 30 * 60 * 1000 && this.getSeverityWeight(severity) <= this.getSeverityWeight(existingAlert.severity)) {
        return null;
      }
    }

    this.activeAlerts.set(alertKey, alert);
    this.logger.warn(`Cold chain alert: ${message}`);
    
    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try { callback(alert); } catch (e) { this.logger.error('Alert callback failed', e); }
    }

    return alert;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = acknowledgedBy;
        this.activeAlerts.set(key, alert);
        return true;
      }
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.resolvedAt = new Date();
        this.activeAlerts.set(key, alert);
        return true;
      }
    }
    return false;
  }

  getActiveAlerts(tenantId: string): ColdChainAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(a => a.tenantId === tenantId && !a.resolvedAt);
  }

  getSensorReadings(tenantId: string, sensorId: string): TemperatureReading[] {
    return this.sensorReadings.get(`${tenantId}-${sensorId}`) || [];
  }

  // ==========================================================================
  // Scheduled Checks (Runs every 5 minutes)
  // ==========================================================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledColdChainCheck() {
    this.logger.log('Running scheduled cold chain check...');
    
    const vaccines = await prisma.vaccineInventory.findMany({
      where: { status: 'IN_STOCK', quantityAvailable: { gt: 0 } },
    });

    const now = new Date();
    const alerts: ColdChainAlert[] = [];

    for (const vaccine of vaccines) {
      // Check expiry (within 90 days)
      const daysToExpiry = Math.floor((vaccine.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToExpiry <= 90 && daysToExpiry > 0) {
        const severity: 'LOW' | 'MEDIUM' | 'HIGH' = daysToExpiry <= 30 ? 'HIGH' : daysToExpiry <= 60 ? 'MEDIUM' : 'LOW';
        const alert: ColdChainAlert = {
          id: `expiry-${vaccine.id}-${Date.now()}`,
          tenantId: vaccine.tenantId,
          vaccineLotId: vaccine.id,
          vaccineName: vaccine.vaccineName,
          lotNumber: vaccine.lotNumber,
          alertType: 'EXPIRY_WARNING',
          severity,
          message: `Vaccine lot ${vaccine.lotNumber} (${vaccine.vaccineName}) expires in ${daysToExpiry} days`,
          createdAt: new Date(),
        };

        const alertKey = `expiry-${vaccine.id}`;
        const existing = this.activeAlerts.get(alertKey);
        if (!existing || existing.severity !== severity) {
          this.activeAlerts.set(alertKey, alert);
          alerts.push(alert);
        }
      }

      // Check low stock
      if (vaccine.quantityAvailable <= 5) {
        const alert: ColdChainAlert = {
          id: `stock-${vaccine.id}-${Date.now()}`,
          tenantId: vaccine.tenantId,
          vaccineLotId: vaccine.id,
          vaccineName: vaccine.vaccineName,
          lotNumber: vaccine.lotNumber,
          alertType: 'STOCK_LOW',
          severity: vaccine.quantityAvailable === 0 ? 'CRITICAL' : 'HIGH',
          message: `Low stock alert: ${vaccine.vaccineName} (Lot ${vaccine.lotNumber}) - Only ${vaccine.quantityAvailable} doses remaining`,
          createdAt: new Date(),
        };

        const alertKey = `stock-${vaccine.id}`;
        const existing = this.activeAlerts.get(alertKey);
        if (!existing) {
          this.activeAlerts.set(alertKey, alert);
          alerts.push(alert);
        }
      }
    }

    if (alerts.length > 0) {
      this.logger.log(`Generated ${alerts.length} cold chain alerts from scheduled check`);
      for (const callback of this.alertCallbacks) {
        for (const alert of alerts) {
          try { callback(alert); } catch (e) { this.logger.error('Alert callback failed', e); }
        }
      }
    }
  }

  // ==========================================================================
  // Simulate Temperature Readings (for demo / testing)
  // ==========================================================================

  simulateTemperatureReading(tenantId: string, sensorId: string, location: string, temperature: number, humidity: number): ColdChainAlert | null {
    return this.recordTemperatureReading(tenantId, {
      sensorId,
      location,
      temperature,
      humidity,
      timestamp: new Date(),
      status: 'NORMAL',
    });
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getSeverityWeight(severity: string): number {
    const weights: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return weights[severity] || 0;
  }
}

export { ColdChainAlert, TemperatureReading };