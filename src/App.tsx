/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Minus, 
  Upload, 
  Download, 
  Trash2, 
  History, 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Save,
  Check,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils/cn';
import { Product, Sale } from './types';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pendingSales, setPendingSales] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock-low'>('name');
  const [sheetId, setSheetId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saleLabel, setSaleLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('stock_products');
    const savedSales = localStorage.getItem('stock_sales');
    const savedSheetId = localStorage.getItem('stock_sheet_id');
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedSheetId) setSheetId(savedSheetId);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('stock_products', JSON.stringify(products));
    localStorage.setItem('stock_sales', JSON.stringify(sales));
    localStorage.setItem('stock_sheet_id', sheetId);
  }, [products, sales, sheetId]);

  // Auto-sync with Google Sheets if ID exists
  useEffect(() => {
    if (sheetId) {
      const interval = setInterval(() => {
        syncWithGoogleSheets(sheetId);
      }, 60000); // Sync every minute
      return () => clearInterval(interval);
    }
  }, [sheetId]);

  const syncWithGoogleSheets = async (input: string) => {
    if (!input) return;
    setIsSyncing(true);
    try {
      // Extract ID if it's a full URL
      let id = input;
      if (input.includes('docs.google.com/spreadsheets/d/')) {
        const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) id = match[1];
      }
      
      setSheetId(id);
      const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo acceder a la hoja de cálculo. Asegúrate de que sea pública (Archivo > Compartir > Publicar en la web).');
      
      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const newProducts: Product[] = jsonData.map((row, index) => {
        const name = row['Nombre del producto'] || row.Producto || row.Name || row.name || `Producto ${index + 1}`;
        const stock = Number(row.Stock || row.stock || row.Cantidad || 0);
        const price = Number(row['Precio final'] || row.Precio || row.price || row.Price || 0);
        
        return {
          id: row.id || crypto.randomUUID(),
          name,
          stock,
          price,
          category: row.Categoria || row.Category || 'General'
        };
      });

      if (newProducts.length === 0) throw new Error('No se encontraron datos en la hoja.');

      setProducts(newProducts);
      setSuccess('Sincronizado con Google Sheets');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Validate and transform data
        const newProducts: Product[] = jsonData.map((row, index) => {
          const name = row['Nombre del producto'] || row.Producto || row.Name || row.name || `Producto ${index + 1}`;
          const stock = Number(row.Stock || row.stock || row.Cantidad || 0);
          const price = Number(row['Precio final'] || row.Precio || row.price || row.Price || 0);
          
          if (isNaN(stock) || isNaN(price)) {
            throw new Error(`Datos inválidos en la fila ${index + 1}`);
          }

          return {
            id: crypto.randomUUID(),
            name,
            stock,
            price,
            category: row.Categoria || row.Category || 'General'
          };
        });

        if (newProducts.length === 0) {
          throw new Error('No se encontraron productos en el archivo.');
        }

        setProducts(newProducts);
        setSuccess(`¡${newProducts.length} productos cargados con éxito!`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.message || 'Error al procesar el archivo Excel.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      { 'Nombre del producto': 'Coca Cola 500ml', 'Stock': 50, 'Precio final': 1500, 'Categoria': 'Bebidas' },
      { 'Nombre del producto': 'Alfajor Jorgito', 'Stock': 100, 'Precio final': 800, 'Categoria': 'Golosinas' },
      { 'Nombre del producto': 'Papas Lays 150g', 'Stock': 30, 'Precio final': 2200, 'Categoria': 'Snacks' },
      { 'Nombre del producto': 'Agua Mineral 2L', 'Stock': 20, 'Precio final': 1200, 'Categoria': 'Bebidas' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    XLSX.writeFile(workbook, 'Plantilla_Stock.xlsx');
  };

  const exportSalesHistory = () => {
    if (sales.length === 0) {
      setError('No hay ventas para exportar');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const exportData = sales.map(sale => ({
      'Fecha': new Date(sale.timestamp).toLocaleDateString(),
      'Hora': new Date(sale.timestamp).toLocaleTimeString(),
      'Producto': sale.productName,
      'Cantidad': sale.quantity,
      'Total ($)': sale.price,
      'Nombre de la compra': sale.label || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial de Ventas');
    XLSX.writeFile(workbook, `Historial_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const addToPending = (product: Product) => {
    const currentPending = pendingSales[product.id] || 0;
    if (product.stock <= currentPending) {
      setError(`No hay más stock disponible de ${product.name}`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPendingSales(prev => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1
    }));
  };

  const confirmSales = () => {
    const newSales: Sale[] = [];
    const updatedProducts = [...products];

    Object.entries(pendingSales).forEach(([productId, quantity]) => {
      const q = quantity as number;
      const productIndex = updatedProducts.findIndex(p => p.id === productId);
      if (productIndex !== -1) {
        const product = updatedProducts[productIndex];
        
        // Update stock
        updatedProducts[productIndex] = {
          ...product,
          stock: product.stock - q
        };

        // Create sale record
        newSales.push({
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          quantity: q,
          price: product.price * q,
          timestamp: Date.now(),
          label: saleLabel || undefined
        });
      }
    });

    setProducts(updatedProducts);
    setSales(prev => [...newSales, ...prev]);
    setPendingSales({});
    setSaleLabel('');
    setSuccess('Ventas confirmadas con éxito');
    setTimeout(() => setSuccess(null), 3000);
  };

  const cancelPending = () => {
    setPendingSales({});
    setSaleLabel('');
  };

  const resetAll = () => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos?')) {
      setProducts([]);
      setSales([]);
      localStorage.removeItem('stock_products');
      localStorage.removeItem('stock_sales');
    }
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setProducts(prev => prev.map(p => 
      p.id === editingProduct.id ? editingProduct : p
    ));
    setEditingProduct(null);
    setSuccess('Producto actualizado con éxito');
    setTimeout(() => setSuccess(null), 3000);
  };

  const totalSales = sales.reduce<number>((acc, sale) => acc + sale.price, 0);
  const totalItemsSold = sales.reduce<number>((acc, sale) => acc + (sale.quantity || 0), 0);
  
  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category || 'General')))];

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'stock-low') return a.stock - b.stock;
      return 0;
    });

  const totalStock = filteredProducts.reduce<number>((acc, p) => acc + p.stock, 0);

  const pendingTotal = Object.entries(pendingSales).reduce<number>((acc, [productId, quantity]) => {
    const product = products.find(p => p.id === productId);
    return acc + (product?.price || 0) * (quantity as number);
  }, 0);

  const pendingCount = Object.values(pendingSales).reduce<number>((acc, q) => acc + (q as number), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Package className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Stock & Ventas</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Gestión Rápida</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sheetId && (
              <button 
                onClick={() => syncWithGoogleSheets(sheetId)}
                disabled={isSyncing}
                className={cn(
                  "p-2.5 rounded-full hover:bg-gray-100 transition-all",
                  isSyncing && "animate-spin text-emerald-600"
                )}
                title="Sincronizar ahora"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Configuración"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors relative"
              title="Historial de Ventas"
            >
              <History className="w-5 h-5" />
              {sales.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </button>
            <button 
              onClick={resetAll}
              className="p-2.5 rounded-full hover:bg-red-50 text-red-500 transition-colors"
              title="Reiniciar Todo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Search & Filter */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Buscar productos o categorías..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 shadow-sm">
              <Filter className="w-5 h-5 text-gray-400" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-4 bg-transparent outline-none font-bold text-gray-600 cursor-pointer"
              >
                <option value="name">Nombre (A-Z)</option>
                <option value="price-asc">Menor Precio</option>
                <option value="price-desc">Mayor Precio</option>
                <option value="stock-low">Menor Stock</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all border",
                  selectedCategory === cat 
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" 
                    : "bg-white text-gray-500 border-gray-100 hover:border-emerald-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <DollarSign className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
              <p className="text-2xl font-bold">${totalSales.toLocaleString()}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <TrendingUp className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Items Vendidos</p>
              <p className="text-2xl font-bold">{totalItemsSold}</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <Package className="text-amber-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Productos en Stock</p>
              <p className="text-2xl font-bold">{totalStock}</p>
            </div>
          </motion.div>
        </div>

        {/* Confirmation Banner */}
        <AnimatePresence>
          {pendingCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-600 text-white p-6 rounded-[32px] shadow-xl shadow-emerald-200 flex flex-col lg:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Confirmar Venta</h3>
                  <p className="text-emerald-100 font-medium text-sm">
                    {pendingCount} {pendingCount === 1 ? 'item' : 'items'} • Total: <span className="text-white font-black">${pendingTotal.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex-1 w-full max-w-md">
                <div className="relative">
                  <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200" />
                  <input 
                    type="text"
                    placeholder="Etiqueta (ej: Recreo 1 - Mañana)"
                    value={saleLabel}
                    onChange={(e) => setSaleLabel(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-emerald-200 focus:bg-white/20 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <button 
                  onClick={cancelPending}
                  className="flex-1 lg:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold transition-all border border-white/20"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmSales}
                  className="flex-1 lg:flex-none px-10 py-3 bg-white text-emerald-600 rounded-2xl font-black shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  Confirmar
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="font-medium">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-200 space-y-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <RefreshCw className="text-emerald-600 w-10 h-10" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Carga tu inventario</h2>
              <p className="text-gray-500 max-w-xs mx-auto">Sube un archivo Excel o conecta una hoja de Google Sheets para comenzar.</p>
            </div>

            <div className="w-full max-w-md px-6 space-y-4">
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Pega el link de Google Sheets aquí..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      syncWithGoogleSheets((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
              <button 
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Pega el link de Google Sheets aquí..."]') as HTMLInputElement;
                  if (input) syncWithGoogleSheets(input.value);
                }}
                disabled={isSyncing}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                Conectar Google Sheets
              </button>
            </div>

            <div className="flex items-center gap-4 w-full max-w-md px-6">
              <div className="h-px bg-gray-100 flex-1" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">O también</span>
              <div className="h-px bg-gray-100 flex-1" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md px-6">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? 'Subiendo...' : 'Subir Excel'}
                <Upload className="w-5 h-5" />
              </button>
              <button 
                onClick={downloadTemplate}
                className="flex-1 bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                Plantilla
                <Download className="w-5 h-5" />
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              className="hidden" 
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Productos</h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 font-bold flex items-center gap-1 hover:underline"
              >
                Actualizar Inventario
                <Upload className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative flex flex-col items-start p-5 rounded-[32px] transition-all text-left h-48 group select-none cursor-pointer overflow-hidden",
                    product.stock <= 0 
                      ? "bg-gray-50 border border-gray-200 opacity-60 grayscale cursor-not-allowed"
                      : product.stock < 10
                        ? "bg-red-100 border-red-300 shadow-sm hover:shadow-xl hover:border-red-400"
                        : "bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200"
                  )}
                  onClick={() => {
                    if (product.stock > (pendingSales[product.id] || 0)) {
                      addToPending(product);
                    }
                  }}
                >
                  {pendingSales[product.id] > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 z-30 bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black shadow-lg border-2 border-white"
                    >
                      {pendingSales[product.id]}
                    </motion.div>
                  )}
                  
                  <div className="flex-1 space-y-1 relative z-20 w-full">
                    <div className="flex justify-between items-start">
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                        product.stock < 10 ? "text-red-400" : "text-gray-400 group-hover:text-emerald-500"
                      )}>
                        {product.category}
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProduct(product);
                        }}
                        className="p-2 -mr-2 -mt-2 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors relative z-30"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 pr-4">
                      {product.name}
                    </h3>
                  </div>

                  <div className="w-full space-y-3 relative z-20">
                    <div className="flex items-end justify-between">
                      <p className={cn(
                        "text-2xl font-black",
                        product.stock < 10 ? "text-red-600" : "text-emerald-600"
                      )}>
                        ${product.price.toLocaleString()}
                      </p>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        product.stock > 10 ? "bg-emerald-50 text-emerald-700" : 
                        product.stock > 0 ? "bg-red-100 text-red-700" : "bg-red-50 text-red-700"
                      )}>
                        Stock: {product.stock}
                      </div>
                    </div>
                    
                    <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (product.stock / 50) * 100)}%` }}
                        className={cn(
                          "h-full rounded-full",
                          product.stock > 10 ? "bg-emerald-500" : "bg-red-500"
                        )}
                      />
                    </div>
                  </div>

                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-[32px] flex items-center justify-center z-30">
                      <span className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest rotate-[-12deg] shadow-lg">
                        Sin Stock
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white z-[70] shadow-2xl rounded-[40px] overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Configuración</h2>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-emerald-600" />
                      Google Sheet ID
                    </label>
                    <input 
                      type="text"
                      placeholder="Ej: 1abc...xyz"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      Para usar Google Sheets, la hoja debe estar publicada en la web (Archivo {'>'} Compartir {'>'} Publicar en la web) y el acceso debe ser público.
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      syncWithGoogleSheets(sheetId);
                      setShowSettings(false);
                    }}
                    disabled={!sheetId || isSyncing}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    Sincronizar Ahora
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white z-[70] shadow-2xl rounded-[40px] overflow-hidden"
            >
              <form onSubmit={handleUpdateProduct} className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Editar Producto</h2>
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Nombre</label>
                    <input 
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Precio ($)</label>
                      <input 
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Stock</label>
                      <input 
                        type="number"
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Categoría</label>
                    <input 
                      type="text"
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold">Historial de Ventas</h2>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {sales.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <TrendingUp className="w-12 h-12" />
                    <p className="font-medium">No hay ventas registradas aún.</p>
                  </div>
                ) : (
                  sales.map((sale) => (
                    <div 
                      key={sale.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-bold text-sm">{sale.productName}</p>
                          {sale.label && (
                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tight">
                              Compra: {sale.label}
                            </p>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          {new Date(sale.timestamp).toLocaleTimeString()} - {new Date(sale.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="font-black text-emerald-600">
                        +${sale.price.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-500 font-medium">Total Acumulado</p>
                  <p className="text-2xl font-black text-emerald-600">${totalSales.toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <button 
                    onClick={exportSalesHistory}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Exportar a Excel
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('¿Vaciar el historial de ventas?')) setSales([]);
                    }}
                    className="w-full py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Vaciar Historial
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />
    </div>
  );
}
