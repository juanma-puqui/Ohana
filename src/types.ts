export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  category?: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  timestamp: number;
  label?: string;
}
