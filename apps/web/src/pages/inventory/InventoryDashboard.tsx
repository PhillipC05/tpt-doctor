import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: { name: string } | null;
  currentStock: number;
  minimumStock: number;
  unitCost: string;
  unitPrice: string;
  location: string;
}

interface VaccineLot {
  id: string;
  vaccineName: string;
  manufacturer: string;
  lotNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  status: string;
}

interface MedicationSample {
  id: string;
  medicationName: string;
  strength: string;
  quantityRemaining: number;
  expiryDate: string;
}

interface RetailProduct {
  id: string;
  name: string;
  price: string;
  currentStock: number;
}

export function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [vaccines, setVaccines] = useState<VaccineLot[]>([]);
  const [expiringVaccines, setExpiringVaccines] = useState<VaccineLot[]>([]);
  const [samples, setSamples] = useState<MedicationSample[]>([]);
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'vaccines' | 'samples' | 'retail'>('items');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/inventory/items?tenantId=default').then(r => r.json()),
      fetch('/api/inventory/items/low-stock?tenantId=default').then(r => r.json()),
      fetch('/api/inventory/vaccines?tenantId=default').then(r => r.json()),
      fetch('/api/inventory/vaccines/expiring?tenantId=default').then(r => r.json()),
      fetch('/api/inventory/samples?tenantId=default').then(r => r.json()),
      fetch('/api/inventory/retail?tenantId=default').then(r => r.json()),
    ]).then(([itemsData, lowStockData, vaccinesData, expiringData, samplesData, productsData]) => {
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setLowStock(Array.isArray(lowStockData) ? lowStockData : []);
      setVaccines(Array.isArray(vaccinesData) ? vaccinesData : []);
      setExpiringVaccines(Array.isArray(expiringData) ? expiringData : []);
      setSamples(Array.isArray(samplesData) ? samplesData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Inventory Management</h1>

      {/* Alerts */}
      {(lowStock.length > 0 || expiringVaccines.length > 0) && (
        <div className="space-y-2">
          {lowStock.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {lowStock.length} item(s) are below minimum stock level!
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStock.slice(0, 5).map(item => (
                  <Badge key={item.id} variant="danger">{item.name} (Stock: {item.currentStock})</Badge>
                ))}
              </div>
            </div>
          )}
          {expiringVaccines.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                {expiringVaccines.length} vaccine lot(s) expiring soon!
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringVaccines.slice(0, 5).map(v => (
                  <Badge key={v.id} variant="warning">
                    {v.vaccineName} - Exp: {new Date(v.expiryDate).toLocaleDateString()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Items</p><p className="text-2xl font-bold">{items.length}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Low Stock</p><p className="text-2xl font-bold text-red-500">{lowStock.length}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Vaccine Lots</p><p className="text-2xl font-bold">{vaccines.length}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-500">{expiringVaccines.length}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Retail Products</p><p className="text-2xl font-bold">{products.length}</p></div></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {(['items', 'vaccines', 'samples', 'retail'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t ${activeTab === tab ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-b-white dark:border-b-gray-800 -mb-[3px]' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'items' ? 'Supply Items' : tab === 'vaccines' ? 'Vaccine Inventory' : tab === 'samples' ? 'Medication Samples' : 'Retail Products'}
          </button>
        ))}
      </div>

      {/* Supply Items Tab */}
      {activeTab === 'items' && (
        <Card><div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Min</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Cost</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Location</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map(item => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${item.currentStock <= item.minimumStock ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.sku}</td>
                  <td className="px-4 py-3">{item.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{item.currentStock}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{item.minimumStock}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(item.unitCost))}</td>
                  <td className="px-4 py-3">{item.location || '—'}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No inventory items found.</td></tr>}
            </tbody>
          </table>
        </div></Card>
      )}

      {/* Vaccines Tab */}
      {activeTab === 'vaccines' && (
        <Card><div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Vaccine</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Manufacturer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Lot #</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Available</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Expiry</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {vaccines.map(v => {
                const isExpiring = new Date(v.expiryDate) < new Date(Date.now() + 90 * 86400000);
                return (
                  <tr key={v.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isExpiring ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium">{v.vaccineName}</td>
                    <td className="px-4 py-3">{v.manufacturer}</td>
                    <td className="px-4 py-3 text-gray-500">{v.lotNumber}</td>
                    <td className="px-4 py-3 text-right font-semibold">{v.quantityAvailable}</td>
                    <td className="px-4 py-3 text-right">{new Date(v.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge variant={isExpiring ? 'warning' : 'success'}>{v.status}</Badge></td>
                  </tr>
                );
              })}
              {vaccines.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No vaccine inventory found.</td></tr>}
            </tbody>
          </table>
        </div></Card>
      )}

      {/* Samples Tab */}
      {activeTab === 'samples' && (
        <Card><div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Medication</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Strength</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Remaining</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Expiry</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {samples.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium">{s.medicationName}</td>
                  <td className="px-4 py-3">{s.strength}</td>
                  <td className="px-4 py-3 text-right font-semibold">{s.quantityRemaining}</td>
                  <td className="px-4 py-3 text-right">{new Date(s.expiryDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {samples.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No medication samples found.</td></tr>}
            </tbody>
          </table>
        </div></Card>
      )}

      {/* Retail Tab */}
      {activeTab === 'retail' && (
        <Card><div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead><tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(Number(p.price))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{p.currentStock}</td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No retail products found.</td></tr>}
            </tbody>
          </table>
        </div></Card>
      )}
    </div>
  );
}