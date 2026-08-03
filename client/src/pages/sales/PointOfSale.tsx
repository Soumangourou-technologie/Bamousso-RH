import { useState, useEffect } from "react";
import { Plus, Minus, Trash2, ShoppingCart, User, Phone, CheckCircle, Search } from "lucide-react";
import { getProducts, checkoutSale } from "../../services/sales.service";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  vatRate: number;
}

interface CartItem extends Product {
  quantity: number;
  totalTTC: number;
}

const PointOfSale = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successData, setSuccessData] = useState<{ pdfUrl: string } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await getProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Erreur de chargement du catalogue");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => {
          if (item.id === product.id) {
            const newQty = item.quantity + 1;
            const lineHT = item.price * newQty;
            const lineTTC = lineHT + (lineHT * (item.vatRate / 100));
            return { ...item, quantity: newQty, totalTTC: lineTTC };
          }
          return item;
        });
      } else {
        const lineHT = product.price;
        const lineTTC = lineHT + (lineHT * (product.vatRate / 100));
        return [...prev, { ...product, quantity: 1, totalTTC: lineTTC }];
      }
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + change);
        const lineHT = item.price * newQty;
        const lineTTC = lineHT + (lineHT * (item.vatRate / 100));
        return { ...item, quantity: newQty, totalTTC: lineTTC };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalCart = cart.reduce((sum, item) => sum + item.totalTTC, 0);

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide !");
      return;
    }
    setIsValidationModalOpen(true);
  };

  const confirmCheckout = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        clientName,
        clientPhone,
        paymentMethod,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          vatRate: item.vatRate
        }))
      };

      const { data } = await checkoutSale(payload);
      toast.success("Vente enregistrée avec succès !");
      setSuccessData({ pdfUrl: data.pdfUrl });
      
      // Reset form
      setCart([]);
      setClientName("");
      setClientPhone("");
      setIsValidationModalOpen(false);
      
    } catch (error) {
      toast.error("Erreur lors de l'encaissement.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
  };

  if (successData) {
    return (
      <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center text-center space-y-6 mt-12 bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in py-16">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Encaissement Réussi !</h2>
        <p className="text-gray-500">La facture a été générée et la transaction ajoutée à la trésorerie.</p>
        
        <div className="flex gap-4 mt-8 w-full max-w-sm">
          {successData.pdfUrl && (
            <a 
              href={successData.pdfUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Voir la Facture (PDF)
            </a>
          )}
          <button 
            onClick={handleReset}
            className="flex-1 py-3 px-4 bg-[#ff5722] text-white rounded-xl font-medium hover:bg-[#f4511e] transition-colors"
          >
            Nouvelle Vente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden animate-fade-in bg-gray-50">
      
      {/* SECTION CATALOGUE (GAUCHE) */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 lg:border-r border-gray-200 overflow-hidden">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Point de Vente</h1>
          <p className="text-gray-500 mt-1">Sélectionnez les articles à facturer</p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full pl-11 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff5722] focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-24 lg:pb-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#ff5722] hover:shadow-md transition-all active:scale-95 group text-center h-32"
              >
                <span className="font-semibold text-gray-800 line-clamp-2 group-hover:text-[#ff5722] transition-colors">
                  {product.name}
                </span>
                <span className="mt-2 text-[#ff5722] font-bold">
                  {product.price.toLocaleString()} F
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500">
                Aucun produit trouvé.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION PANIER (DROITE) */}
      <div className="w-full lg:w-96 bg-white flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] z-10">
        
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Panier Courant</h2>
          <span className="ml-auto bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-bold">
            {cart.length}
          </span>
        </div>

        {/* Client Info */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
          <div className="relative">
            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Nom du Client (Optionnel)"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-[#ff5722]"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Téléphone WhatsApp (Optionnel)"
              value={clientPhone}
              onChange={e => setClientPhone(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-[#ff5722]"
            />
          </div>
        </div>

        {/* Liste Panier */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p>Le panier est vide</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex flex-col p-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-[#ff5722]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-[#ff5722]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-bold text-[#ff5722]">
                    {item.totalTTC.toLocaleString()} F
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Total & Bouton) */}
        <div className="p-4 border-t border-gray-200 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 font-medium">Total TTC</span>
            <span className="text-2xl font-black text-gray-900">{totalCart.toLocaleString()} FCFA</span>
          </div>
          
          <div className="mb-4">
            <select 
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 text-sm bg-gray-50 text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-[#ff5722]"
            >
              <option value="CASH">Espèces (Cash)</option>
              <option value="MOBILE_MONEY">Mobile Money (Orange/Wave...)</option>
              <option value="CARD">Carte Bancaire</option>
              <option value="BANK_TRANSFER">Virement</option>
            </select>
          </div>

          <button
            onClick={handleCheckoutClick}
            disabled={cart.length === 0}
            className="w-full py-4 bg-[#ff5722] text-white rounded-xl font-bold text-lg hover:bg-[#f4511e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/20"
          >
            Encaisser
          </button>
        </div>

      </div>

      {/* POP-UP DE VALIDATION */}
      {isValidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
              <CheckCircle className="w-6 h-6 text-[#ff5722]" />
              <h2 className="text-xl font-bold text-gray-900">Validation de l'encaissement</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">Veuillez vérifier les informations ci-dessous avant de générer la facture définitive.</p>
              
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Client :</span>
                  <span className="font-semibold text-gray-900">{clientName || "Client de passage"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Téléphone :</span>
                  <span className="font-semibold text-gray-900">{clientPhone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Moyen de paiement :</span>
                  <span className="font-semibold text-gray-900">{paymentMethod}</span>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  Résumé des articles ({cart.length})
                </div>
                <div className="max-h-40 overflow-y-auto p-4 space-y-2">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}x {item.name}</span>
                      <span className="font-medium text-gray-900">{item.totalTTC.toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                  <span className="font-bold">TOTAL À ENCAISSER</span>
                  <span className="text-xl font-black">{totalCart.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              <button
                onClick={() => setIsValidationModalOpen(false)}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors"
              >
                Retour
              </button>
              <button
                onClick={confirmCheckout}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 text-white bg-[#ff5722] hover:bg-[#f4511e] shadow-md shadow-orange-500/20 rounded-xl font-medium transition-all flex justify-center items-center gap-2"
              >
                {isProcessing ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Valider et Facturer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PointOfSale;
