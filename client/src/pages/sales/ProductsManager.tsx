import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag, Percent, Box, RefreshCw } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../../services/sales.service";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  vatRate: number;
  stock: number | null;
}

const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    vatRate: "0",
    stock: "",
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des produits", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        vatRate: product.vatRate.toString(),
        stock: product.stock ? product.stock.toString() : "",
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "", vatRate: "0", stock: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce produit ?")) {
      try {
        await deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error("Erreur lors de la suppression", error);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue des Produits</h1>
          <p className="text-gray-500 mt-1">Gérez vos articles et services pour la facturation.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchProducts}
            className="p-3 text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff5722] text-white rounded-xl hover:bg-[#f4511e] transition-all transform hover:scale-105 shadow-md shadow-orange-500/20 font-medium w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Produit</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-600">Désignation</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Prix Unitaire (HT)</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">TVA (%)</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-center">Stock</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Aucun produit dans le catalogue. Cliquez sur "Nouveau Produit" pour en ajouter un.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.description && <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>}
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900">
                      {product.price.toLocaleString()} F
                    </td>
                    <td className="p-4 text-center text-gray-600">
                      {product.vatRate}%
                    </td>
                    <td className="p-4 text-center text-gray-600">
                      {product.stock !== null ? product.stock : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? "Modifier Produit" : "Ajouter Produit"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Désignation *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent transition-all outline-none"
                    placeholder="Ex: Clavier Sans Fil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix Unitaire (HT) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent transition-all outline-none"
                    placeholder="15000"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 font-medium">
                    F
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TVA (%)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Percent className="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.vatRate}
                      onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock <span className="text-gray-400 font-normal">(Optionnel)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Box className="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent transition-all outline-none"
                      placeholder="Qté"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optionnel)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent transition-all outline-none resize-none"
                  placeholder="Détails supplémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 text-white bg-[#ff5722] hover:bg-[#f4511e] shadow-md shadow-orange-500/20 rounded-xl font-medium transition-all"
                >
                  {editingProduct ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsManager;
