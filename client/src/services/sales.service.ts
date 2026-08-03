import api from "../utils/api";

// Catalogue
export const getProducts = () => api.get("/sales/products");
export const createProduct = (data: any) => api.post("/sales/products", data);
export const updateProduct = (id: string, data: any) => api.put(`/sales/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete(`/sales/products/${id}`);

// POS (Caisse & Historique)
export const checkoutSale = (data: {
  clientName?: string;
  clientPhone?: string;
  paymentMethod: string;
  items: Array<{
    productId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;
}) => api.post("/sales/checkout", data);

export const getSalesHistory = () => api.get("/sales/history");
