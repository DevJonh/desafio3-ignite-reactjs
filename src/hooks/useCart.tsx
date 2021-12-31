import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`/products/${productId}`);
      const cartQuantity = cart.filter(
        (productCart) => productCart.id === product.data.id
      );

      if (cartQuantity.length >= 1) {
        cartQuantity[0].amount = cartQuantity[0].amount
          ? cartQuantity[0].amount
          : 1;

        try {
          const { data } = await api.get<Stock>(`/stock/${productId}`);
          if (data.amount > 0) {
            if (!cart.includes(cartQuantity[0])) {
              setCart([...cart, cartQuantity[0]]);
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify([...cart, cartQuantity[0]])
              );
            } else {
              cartQuantity[0].amount++;
              const newCart = cart.map((cart) =>
                cart.id !== cartQuantity[0].id
                  ? cart
                  : { ...cart, amount: cartQuantity[0].amount }
              );
              setCart(newCart);
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify(newCart)
              );
            }

            await api.put<Stock>(`/stock/${productId}`, {
              amount: data.amount - 1,
            });
          } else {
            toast.error("Quantidade solicitada fora de estoque");
          }
        } catch (error) {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } else {
        setCart([...cart, { ...product.data, amount: 1 }]);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, { ...product.data, amount: 1 }])
        );
      }
    } catch {
      // TODO
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productsFiltered = cart.filter(
        (product) => product.id !== productId
      );
      const product = cart.filter((product) => product.id === productId);

      if (product.length === 1) {
        setCart(productsFiltered);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(productsFiltered)
        );
      } else {
        throw new Error();
      }
    } catch {
      // TODO
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // TODO
      const products = cart.filter((product) => product.id === productId)[0];
      const productsFiltered = cart.filter(
        (product) => product.id !== productId
      );
      if (products.amount + amount >= 1) {
        const { data } = await api.get(`/stock/${productId}`);
        if (data.amount > 0 || amount === -1) {
          await api.put(`/products/${productId}`, {
            ...products,
            amount: products.amount + amount,
          });
          setCart([
            ...productsFiltered,
            { ...products, amount: products.amount + amount },
          ]);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([
              ...productsFiltered,
              { ...products, amount: products.amount + amount },
            ])
          );
          await api.put(`/stock/${productId}`, {
            id: productId,
            amount: data.amount - amount,
          });
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      } else {
        removeProduct(productId);
      }
    } catch {
      // TODO
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

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
