// ProductsPage component
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../../services/api';
import AdminLayout from '../../components/layout/AdminLayout';

interface Product {
  id: string;
  name: string;
  code: string;
  price_usdt: string;
  daily_rate: string;
  duration_days: number;
  cashback_cap: string;
  potential_cap: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  code: string;
  price_usdt: number;
  daily_rate: number;
  duration_days: number;
  description: string;
  sla_hours: number;
  badge?: string;
  target_user: string;
  max_cap_percentage: number;
  cashback_cap: number;
  potential_cap: number;
  active?: boolean;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    code: '',
    price_usdt: 0,
    daily_rate: 0,
    duration_days: 0,
    description: '',
    sla_hours: 24,
    badge: '',
    target_user: 'all',
    max_cap_percentage: 200,
    cashback_cap: 0,
    potential_cap: 0,
    active: true
  });

  const fetchProducts = async (page = 1) => {
    try {
      const data = await apiService.getAdminProducts(page, 20);
      setProducts(data.products);
      setCurrentPage(data.pagination.page);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Datos del formulario antes de enviar:', formData);
      if (editingProduct) {
        console.log('Actualizando producto ID:', editingProduct.id);
        const result = await apiService.updateAdminProduct(editingProduct.id, formData);
        console.log('Respuesta del servidor:', result);
      } else {
        await apiService.createAdminProduct(formData);
      }

      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts(currentPage);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error?.response?.data?.error || 'Error al guardar producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      code: product.code,
      price_usdt: parseFloat(product.price_usdt),
      daily_rate: parseFloat(product.daily_rate),
      duration_days: product.duration_days,
      description: '',
      sla_hours: 24,
      badge: '',
      target_user: 'all',
      max_cap_percentage: 200,
      cashback_cap: parseFloat(product.cashback_cap),
      potential_cap: parseFloat(product.potential_cap),
      active: product.active
    });
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      await apiService.deleteAdminProduct(productId);
      toast.success('Producto eliminado');
      fetchProducts(currentPage);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error?.response?.data?.error || 'Error al eliminar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      price_usdt: 0,
      daily_rate: 0,
      duration_days: 0,
      description: '',
      sla_hours: 24,
      badge: '',
      target_user: 'all',
      max_cap_percentage: 200,
      cashback_cap: 0,
      potential_cap: 0,
      active: true
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Gestión de Productos">
      <div className="space-y-6">
        {/* Description */}
        <div className="mb-6">
          <p className="text-slate-600 text-sm sm:text-base">Administra el catálogo de licencias disponibles</p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex-1"></div>
          <button
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 sm:gap-3 shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm sm:text-base"
          >
            <Plus size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Nuevo Producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 sm:pl-12 pr-4 py-2 sm:py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-200">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-800">Catálogo de Productos</h2>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Lista completa de licencias disponibles</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                    Precio USDT
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                    Tasa Diaria
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">
                    Duración
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider hidden xl:table-cell">
                    Tipo de Agente
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                    Estado
                  </th>
                  <th className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    Acciones
                  </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                 <tr key={product.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                   <td className="px-3 sm:px-8 py-4 sm:py-6">
                     <div>
                       <div className="text-sm sm:text-lg font-semibold text-slate-800">{product.name}</div>
                       <div className="text-xs sm:text-sm text-slate-500 font-medium">{product.code}</div>
                       <div className="sm:hidden mt-1 text-xs text-slate-600">
                         ${product.price_usdt} USDT
                       </div>
                       <div className="sm:hidden mt-1">
                         <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-xl ${
                           product.active 
                             ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' 
                             : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700'
                         }`}>
                           <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                             product.active ? 'bg-green-500' : 'bg-red-500'
                           }`}></div>
                           {product.active ? 'Activo' : 'Inactivo'}
                         </span>
                       </div>
                     </div>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6 hidden sm:table-cell">
                     <div className="flex items-center">
                       <span className="text-sm sm:text-lg font-bold text-slate-800">${product.price_usdt}</span>
                       <span className="text-xs sm:text-sm text-slate-500 ml-1">USDT</span>
                     </div>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6 hidden md:table-cell">
                     <div className="flex items-center">
                       <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-2 sm:px-3 py-1 rounded-xl">
                         <span className="text-green-700 font-semibold text-xs sm:text-sm">{(parseFloat(product.daily_rate) * 100).toFixed(2)}%</span>
                       </div>
                     </div>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6 hidden lg:table-cell">
                     <div className="flex items-center">
                       <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-2 sm:px-3 py-1 rounded-xl">
                         <span className="text-blue-700 font-semibold text-xs sm:text-sm">{product.duration_days} días</span>
                       </div>
                     </div>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6 hidden xl:table-cell">
                     <div className="flex items-center">
                       {parseFloat(product.price_usdt) >= 5000 ? (
                         <div className="bg-gradient-to-r from-purple-100 to-violet-100 px-2 sm:px-3 py-1 rounded-xl">
                           <span className="text-purple-700 font-semibold text-xs sm:text-sm">🤖 Dedicado</span>
                         </div>
                       ) : (
                         <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-2 sm:px-3 py-1 rounded-xl">
                           <span className="text-orange-700 font-semibold text-xs sm:text-sm">👥 Compartido</span>
                         </div>
                       )}
                     </div>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6">
                     <span className={`inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-2xl ${
                       product.active 
                         ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' 
                         : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700'
                     }`}>
                       <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                         product.active ? 'bg-green-500' : 'bg-red-500'
                       }`}></div>
                       {product.active ? 'Activo' : 'Inactivo'}
                     </span>
                   </td>
                   <td className="px-3 sm:px-8 py-4 sm:py-6">
                     <div className="flex space-x-1 sm:space-x-3">
                       <button
                         onClick={() => handleEdit(product)}
                         className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                         title="Editar producto"
                       >
                         <Edit size={14} className="sm:w-4 sm:h-4" />
                       </button>
                       <button
                         onClick={() => handleDelete(product.id)}
                         className="p-1.5 sm:p-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                         title="Eliminar producto"
                       >
                         <Trash2 size={14} className="sm:w-4 sm:h-4" />
                       </button>
                     </div>
                   </td>
               </tr>
             ))}
          </tbody>
         </table>
         </div>
       </div>

         {/* Pagination */}
         {totalPages > 1 && (
           <div className="mt-6 sm:mt-8 flex justify-center">
             <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-2">
               <div className="flex space-x-1 sm:space-x-2">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                   <button
                     key={page}
                     onClick={() => {
                       setCurrentPage(page);
                       fetchProducts(page);
                     }}
                     className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
                       currentPage === page
                         ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                         : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                     }`}
                   >
                     {page}
                 </button>
               ))}
               </div>
             </div>
           </div>
         )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-200 rounded-t-3xl">
                <h2 className="text-lg sm:text-3xl font-bold text-slate-800">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <p className="text-slate-600 mt-1 text-sm sm:text-base">
                  {editingProduct ? 'Modifica los detalles del producto' : 'Crea una nueva licencia para el catálogo'}
                </p>
              </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Nombre del Producto
                   </label>
                   <input
                     type="text"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="Ej: Licencia Premium"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Código Único
                   </label>
                   <input
                     type="text"
                     value={formData.code}
                     onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="Ej: PREM-001"
                     required
                   />
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Precio USDT
                   </label>
                   <input
                     type="number"
                     step="0.01"
                     value={formData.price_usdt}
                     onChange={(e) => setFormData({ ...formData, price_usdt: parseFloat(e.target.value) || 0 })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="100.00"
                     required
                   />
                 </div>
              
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Tasa Diaria (%)
                   </label>
                   <input
                     type="number"
                     step="0.001"
                     min="0"
                     max="1"
                     value={formData.daily_rate}
                     onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) || 0 })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="0.05"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Duración (días)
                   </label>
                   <input
                     type="number"
                     min="1"
                     value={formData.duration_days}
                     onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="30"
                     required
                   />
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Límite Cashback
                   </label>
                   <input
                     type="number"
                     step="0.01"
                     min="0"
                     value={formData.cashback_cap}
                     onChange={(e) => setFormData({ ...formData, cashback_cap: parseFloat(e.target.value) || 0 })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="1000.00"
                     required
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">
                     Límite Potencial
                   </label>
                   <input
                     type="number"
                     step="0.01"
                     min="0"
                     value={formData.potential_cap}
                     onChange={(e) => setFormData({ ...formData, potential_cap: parseFloat(e.target.value) || 0 })}
                     className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-300"
                     placeholder="5000.00"
                     required
                   />
                 </div>
               </div>
               
               {/* Tipo de Agente - Campo informativo */}
               <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-4 sm:p-6 border border-slate-200">
                 <div className="flex items-center gap-3 mb-2">
                   <span className="text-lg">{formData.price_usdt >= 5000 ? '🤖' : '👥'}</span>
                   <h4 className="text-sm font-semibold text-slate-700">Tipo de Agente</h4>
                 </div>
                 <div className="text-sm text-slate-600">
                   {formData.price_usdt >= 5000 ? (
                     <div>
                       <span className="font-semibold text-purple-700">Agente Dedicado</span>
                       <p className="mt-1">Recursos exclusivos con beneficios de independencia para licencias de $5,000 o más</p>
                     </div>
                   ) : (
                     <div>
                       <span className="font-semibold text-orange-700">Agente Compartido</span>
                       <p className="mt-1">Recursos compartidos con múltiples usuarios para licencias de $500 a $2,500</p>
                     </div>
                   )}
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6">
                 <button
                   type="button"
                   onClick={() => {
                     setShowModal(false);
                     setEditingProduct(null);
                     resetForm();
                   }}
                   className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-slate-600 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl hover:bg-slate-50 transition-all duration-300 font-medium shadow-lg text-sm sm:text-base"
                 >
                   Cancelar
                 </button>
                 <button
                   type="submit"
                   className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-sm sm:text-base"
                 >
                   {editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                 </button>
               </div>
            </form>
          </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ProductsPage;