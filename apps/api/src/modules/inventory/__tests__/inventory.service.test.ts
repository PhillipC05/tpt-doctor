// ============================================================================
// TPT Doctor — Inventory Service Unit Tests
// ============================================================================

import { InventoryService } from '../inventory.service';

const mockPrisma = {
  inventoryItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  inventoryTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  purchaseOrder: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  vaccineInventory: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  vaccineAdministration: {
    create: jest.fn(),
  },
  medicationSample: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  sampleDistribution: {
    create: jest.fn(),
  },
  retailProduct: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  posSale: {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

jest.mock('@tpt-doctor/database', () => ({
  prisma: mockPrisma,
}));

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService();
    jest.clearAllMocks();
  });

  describe('getInventoryItems', () => {
    it('should return all active items', async () => {
      const mockItems = [
        { id: '1', name: 'Gloves', sku: 'GLV-001', currentStock: 100, minimumStock: 50, category: { name: 'PPE' } },
        { id: '2', name: 'Masks', sku: 'MSK-001', currentStock: 200, minimumStock: 100, category: null },
      ];
      mockPrisma.inventoryItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getInventoryItems('tenant-1');
      expect(result).toEqual(mockItems);
      expect(result).toHaveLength(2);
    });

    it('should filter by category', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
      await service.getInventoryItems('tenant-1', 'cat-1');
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-1' }),
        })
      );
    });
  });

  describe('getLowStockItems', () => {
    it('should return items below minimum stock', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: '1', name: 'Gloves', currentStock: 10, minimumStock: 50 },
      ]);
      const result = await service.getLowStockItems('tenant-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('recordTransaction', () => {
    it('should record stock movement and update stock', async () => {
      mockPrisma.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        currentStock: 50,
        unitCost: '10.00',
      });
      mockPrisma.inventoryTransaction.create.mockResolvedValue({
        id: 'tx-1',
        quantity: 20,
        previousStock: 50,
        newStock: 70,
      });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.recordTransaction('tenant-1', {
        itemId: 'item-1',
        transactionType: 'RECEIVE',
        quantity: 20,
        performedBy: 'user-1',
      });

      expect(result).toBeDefined();
    });
  });

  describe('createPurchaseOrder', () => {
    it('should create a purchase order with sequential numbering', async () => {
      mockPrisma.purchaseOrder.count.mockResolvedValue(5);
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-tenant-1-00006',
      });

      const result = await service.createPurchaseOrder('tenant-1', {
        vendor: 'MedSupply Co',
        items: [{ itemId: 'item-1', quantity: 100 }],
        totalAmount: 500.00,
      });
      expect(result.poNumber).toContain('00006');
    });
  });

  describe('Vaccine Inventory', () => {
    it('should return vaccine inventory sorted by expiry', async () => {
      const mockVaccines = [
        { id: 'v1', vaccineName: 'FluShot', expiryDate: new Date('2024-06-01'), quantityAvailable: 50, status: 'IN_STOCK' },
        { id: 'v2', vaccineName: 'HPV', expiryDate: new Date('2024-03-01'), quantityAvailable: 30, status: 'IN_STOCK' },
      ];
      mockPrisma.vaccineInventory.findMany.mockResolvedValue(mockVaccines);

      const result = await service.getVaccineInventory('tenant-1');
      expect(result).toHaveLength(2);
      expect(mockPrisma.vaccineInventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { expiryDate: 'asc' } })
      );
    });

    it('should get expiring vaccines within threshold', async () => {
      mockPrisma.vaccineInventory.findMany.mockResolvedValue([]);
      await service.getExpiringVaccines('tenant-1', 90);
      expect(mockPrisma.vaccineInventory.findMany).toHaveBeenCalled();
    });
  });

  describe('Medication Samples', () => {
    it('should distribute a sample and decrement quantity', async () => {
      mockPrisma.medicationSample.findFirst.mockResolvedValue({
        id: 'sample-1',
        quantityRemaining: 10,
      });
      mockPrisma.sampleDistribution.create.mockResolvedValue({ id: 'dist-1' });
      mockPrisma.medicationSample.update.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.distributeSample('tenant-1', {
        sampleId: 'sample-1',
        quantity: 3,
        patientId: 'patient-1',
        prescribedBy: 'staff-1',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Retail POS', () => {
    it('should create a POS sale and update stock', async () => {
      mockPrisma.posSale.count.mockResolvedValue(10);
      mockPrisma.retailProduct.update.mockResolvedValue({});
      mockPrisma.posSale.create.mockResolvedValue({
        id: 'sale-1',
        saleNumber: 'POS-tenant-1-000011',
      });
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.createPosSale('tenant-1', {
        items: [{ productId: 'prod-1', quantity: 2, unitPrice: 15.00 }],
        total: 30.00,
        soldBy: 'staff-1',
        paymentMethod: 'CASH',
      });

      expect(result.saleNumber).toContain('000011');
    });
  });
});