import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

const KEY_CART = '@RocketShoes:cart';
interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(KEY_CART);
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      if (productInCart != null) {
        updateProductAmount({ productId, amount: productInCart.amount + 1 });
      } else {
        const productResult = await api.get(`/products/${productId}`);
        if (productResult.data == null) {
          throw new Error();
        }
        const updatedProductList = [...cart, { ...productResult.data, amount: 1 }];
        updateCart(updatedProductList)
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      if (productInCart) {
        const updatedProductList = cart.filter(product => product.id !== productId);
        updateCart(updatedProductList);
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;
      const stockAmout = await getStock(productId);
      if (stockAmout !== undefined && stockAmout >= amount) {
        const updatedProductList = cart.map(product => {
          if (product.id === productId) product.amount = amount;
          return product;
        })
        updateCart(updatedProductList)
      }
      else {
        throw new Error('Quantidade solicitada fora de estoque')
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  };

  async function getStock(productId: number): Promise<number | undefined> {
    try {
      const resultStock = await api.get<Stock>(`/stock/${productId}`);
      if (resultStock.status === 200) return resultStock.data.amount;
      else new Error('Erro na alteração de quantidade do produto')
    } catch (e) {
      throw new Error('Erro na alteração de quantidade do produto');
    }
  }

  function updateCart(productList: Product[]) {
    setCart(productList)
    localStorage.setItem(KEY_CART, JSON.stringify(productList));
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
