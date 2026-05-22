import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';

@Injectable()
export class InventoryService {
  // ==========================================================================
  // Inventory Items
  // ==========================================================================

  async getInventoryItems(tenantId: string, categoryId?: string) {
    const where: any = { tenantId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    return prisma.inventoryItem.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async getInventoryItem(id: string, tenantId: string) {
    const item = await prisma.inventoryItem.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async createInventoryItem(tenantId: string, data: any) {
    return prisma.inventoryItem.create({ data: { ...data, tenantId } });
  }

  async updateInventoryItem(id: string, tenantId: string, data: any) {
    await this.getInventoryItem(id, tenantId);
    return prisma.inventoryItem.update({ where: { id }, data });
  }

  async deleteInventoryItem(id: string, tenantId: string) {
    await this.getInventoryItem(id, tenantId);
    return prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  }

  async getLowStockItems(tenantId: string) {
    return prisma.inventoryItem.findMany({
      where: { tenantId, isActive: true, currentStock: { lte: prisma.inventoryItem.fields.minimumStock } },
      orderBy: { currentStock: 'asc' },
    });
  }

  // ==========================================================================
  // Inventory Transactions
  // ==========================================================================

  async recordTransaction(tenantId: string, data: any) {
    const item = await this.getInventoryItem(data.itemId, tenantId);
    const quantity = data.quantity;

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.inventoryTransaction.create({
        data: {
          tenantId,
          itemId: data.itemId,
          transactionType: data.transactionType,
          quantity,
          previousStock: item.currentStock,
          newStock: item.currentStock + quantity,
          unitCost: data.unitCost || item.unitCost,
          totalCost: (data.unitCost || item.unitCost) * Math.abs(quantity),
          reference: data.reference,
          performedBy: data.performedBy,
          patientId: data.patientId,
          notes: data.notes,
        },
      });

      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: item.currentStock + quantity },
      });

      return transaction;
    });
  }

  async getTransactions(tenantId: string, itemId?: string) {
    const where: any = { tenantId };
    if (itemId) where.itemId = itemId;
    return prisma.inventoryTransaction.findMany({
      where,
      include: { item: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ==========================================================================
  // Purchase Orders
  // ==========================================================================

  async createPurchaseOrder(tenantId: string, data: any) {
    const poCount = await prisma.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${tenantId.slice(0, 8)}-${String(poCount + 1).padStart(5, '0')}`;
    return prisma.purchaseOrder.create({
      data: { ...data, tenantId, poNumber },
    });
  }

  async getPurchaseOrders(tenantId: string) {
    return prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePurchaseOrderStatus(id: string, tenantId: string, status: string) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return prisma.purchaseOrder.update({ where: { id }, data: { status: status as any } });
  }

  // ==========================================================================
  // Vaccine Inventory
  // ==========================================================================

  async getVaccineInventory(tenantId: string) {
    return prisma.vaccineInventory.findMany({
      where: { tenantId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createVaccineLot(tenantId: string, data: any) {
    return prisma.vaccineInventory.create({
      data: {
        ...data,
        tenantId,
        quantityAvailable: data.quantityReceived,
      },
    });
  }

  async getExpiringVaccines(tenantId: string, daysThreshold: number = 90) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);
    return prisma.vaccineInventory.findMany({
      where: {
        tenantId,
        expiryDate: { lte: threshold },
        status: 'IN_STOCK',
        quantityAvailable: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async recordVaccineAdministration(tenantId: string, data: any) {
    const lot = await prisma.vaccineInventory.findFirst({
      where: { id: data.vaccineLotId, tenantId },
    });
    if (!lot) throw new NotFoundException('Vaccine lot not found');
    if (lot.quantityAvailable < 1) throw new Error('No available doses in this lot');

    return prisma.$transaction(async (tx) => {
      const admin = await tx.vaccineAdministration.create({ data: { ...data, tenantId } });
      await tx.vaccineInventory.update({
        where: { id: data.vaccineLotId },
        data: {
          quantityAvailable: lot.quantityAvailable - 1,
          quantityUsed: lot.quantityUsed + 1,
        },
      });
      return admin;
    });
  }

  // ==========================================================================
  // Medication Samples
  // ==========================================================================

  async getMedicationSamples(tenantId: string) {
    return prisma.medicationSample.findMany({
      where: { tenantId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async createMedicationSample(tenantId: string, data: any) {
    return prisma.medicationSample.create({
      data: { ...data, tenantId, quantityRemaining: data.quantityReceived },
    });
  }

  async distributeSample(tenantId: string, data: any) {
    const sample = await prisma.medicationSample.findFirst({
      where: { id: data.sampleId, tenantId },
    });
    if (!sample) throw new NotFoundException('Sample not found');
    if (sample.quantityRemaining < data.quantity) throw new Error('Insufficient quantity');

    return prisma.$transaction(async (tx) => {
      const dist = await tx.sampleDistribution.create({ data: { ...data, tenantId } });
      await tx.medicationSample.update({
        where: { id: data.sampleId },
        data: { quantityRemaining: sample.quantityRemaining - data.quantity },
      });
      return dist;
    });
  }

  // ==========================================================================
  // Retail POS
  // ==========================================================================

  async getRetailProducts(tenantId: string) {
    return prisma.retailProduct.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createRetailProduct(tenantId: string, data: any) {
    return prisma.retailProduct.create({ data: { ...data, tenantId } });
  }

  async createPosSale(tenantId: string, data: any) {
    const saleCount = await prisma.posSale.count({ where: { tenantId } });
    const saleNumber = `POS-${tenantId.slice(0, 8)}-${String(saleCount + 1).padStart(6, '0')}`;

    return prisma.$transaction(async (tx) => {
      // Update stock for each item
      const items = data.items as any[];
      for (const item of items) {
        await tx.retailProduct.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }

      return tx.posSale.create({
        data: { ...data, tenantId, saleNumber },
      });
    });
  }

  async getPosSales(tenantId: string) {
    return prisma.posSale.findMany({
      where: { tenantId },
      orderBy: { soldAt: 'desc' },
      take: 100,
    });
  }
}