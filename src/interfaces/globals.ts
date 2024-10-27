export interface INR_BALANCES {
    [userId: string]: {
        balance: number;
        locked: number;
    }
}

export interface STOCK_BALANCES {
    [userId: string]: {
        [stockSymbol: string]: {
            yes?: {
                quantity: number;
                locked: number;
            };
            no?: {
                quantity: number;
                locked: number;
            };
        };
    };
}

export const priceValues = [
    0.5, 1, 1.5, 2, 2.5,
    3, 3.5, 4, 4.5, 5,
    5.5, 6, 6.5, 7, 7.5,
    8, 8.5, 9, 9.5
  ] as const;2

export type PriceOptions = typeof priceValues[number];

export type OrderDetails = {
    id: number;
    userId: string;
    quantity: number;
    type: "buy" | "sell";
}[];

export type Order = {
    price: PriceOptions;
    total: number;
    orders: OrderDetails;
}

export interface ORDERBOOKS {
    [stockSymbol: string]: 
    {
        yes: Order[];
        no: Order[];
    }
}