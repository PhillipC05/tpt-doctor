import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  CreateMedicationSampleDto,
  CreatePosSaleDto,
  CreatePurchaseOrderDto,
  CreateRetailProductDto,
  CreateVaccineLotDto,
  DistributeSampleDto,
  RecordTransactionDto,
  RecordVaccineAdministrationDto,
  UpdateInventoryItemDto,
  UpdatePOStatusDto,
} from './inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  async getItems(@Query('tenantId') tenantId: string, @Query('categoryId') categoryId?: string) {
    return this.inventoryService.getInventoryItems(tenantId, categoryId);
  }

  @Get('items/low-stock')
  async getLowStock(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getLowStockItems(tenantId);
  }

  @Get('items/:id')
  async getItem(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.inventoryService.getInventoryItem(id, tenantId);
  }

  @Post('items')
  async createItem(@Body() body: CreateInventoryItemDto) {
    return this.inventoryService.createInventoryItem(body.tenantId, body);
  }

  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() body: UpdateInventoryItemDto) {
    return this.inventoryService.updateInventoryItem(id, body.tenantId!, body);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.inventoryService.deleteInventoryItem(id, tenantId);
  }

  @Post('transactions')
  async recordTransaction(@Body() body: RecordTransactionDto) {
    return this.inventoryService.recordTransaction(body.tenantId, body);
  }

  @Get('transactions')
  async getTransactions(@Query('tenantId') tenantId: string, @Query('itemId') itemId?: string) {
    return this.inventoryService.getTransactions(tenantId, itemId);
  }

  @Post('purchase-orders')
  async createPurchaseOrder(@Body() body: CreatePurchaseOrderDto) {
    return this.inventoryService.createPurchaseOrder(body.tenantId, body);
  }

  @Get('purchase-orders')
  async getPurchaseOrders(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getPurchaseOrders(tenantId);
  }

  @Put('purchase-orders/:id/status')
  async updatePOStatus(@Param('id') id: string, @Body() body: UpdatePOStatusDto) {
    return this.inventoryService.updatePurchaseOrderStatus(id, body.tenantId, body.status);
  }

  @Get('vaccines')
  async getVaccines(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getVaccineInventory(tenantId);
  }

  @Get('vaccines/expiring')
  async getExpiringVaccines(@Query('tenantId') tenantId: string, @Query('days') days?: number) {
    return this.inventoryService.getExpiringVaccines(tenantId, days || 90);
  }

  @Post('vaccines')
  async createVaccineLot(@Body() body: CreateVaccineLotDto) {
    return this.inventoryService.createVaccineLot(body.tenantId, body);
  }

  @Post('vaccines/administrations')
  async recordVaccineAdmin(@Body() body: RecordVaccineAdministrationDto) {
    return this.inventoryService.recordVaccineAdministration(body.tenantId, body);
  }

  @Get('samples')
  async getSamples(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getMedicationSamples(tenantId);
  }

  @Post('samples')
  async createSample(@Body() body: CreateMedicationSampleDto) {
    return this.inventoryService.createMedicationSample(body.tenantId, body);
  }

  @Post('samples/distribute')
  async distributeSample(@Body() body: DistributeSampleDto) {
    return this.inventoryService.distributeSample(body.tenantId, body);
  }

  @Get('retail')
  async getRetailProducts(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getRetailProducts(tenantId);
  }

  @Post('retail')
  async createRetailProduct(@Body() body: CreateRetailProductDto) {
    return this.inventoryService.createRetailProduct(body.tenantId, body);
  }

  @Post('retail/sales')
  async createPosSale(@Body() body: CreatePosSaleDto) {
    return this.inventoryService.createPosSale(body.tenantId, body);
  }

  @Get('retail/sales')
  async getPosSales(@Query('tenantId') tenantId: string) {
    return this.inventoryService.getPosSales(tenantId);
  }
}
