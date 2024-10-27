import { Request, Response } from "express";
import { inrBalances, stockBalances, orderbook } from "../config/globals";
import { Order, OrderDetails, PriceOptions } from "../interfaces/globals";
import { ORDER_REQUEST } from "../interfaces/requestModels";
import { publishOrderbook } from "../utils/redis";

export const getOrderbook = (req: Request, res: Response): any => {
    res.send(orderbook);
};

export const viewOrders = (req: Request, res: Response): any => {
    const stockSymbol = req.params.stockSymbol;

    if (!stockSymbol) {
        return res.status(400).send("Invalid input: stock symbol is required");
    }
    
    const symbolExists = orderbook[stockSymbol];
    if(!symbolExists) {
        res.status(400).send(`Stock symbol ${stockSymbol} does not exist`);
        return;
    }
    res.send(orderbook[stockSymbol]);
};

export const buyOrder = (req: Request, res: Response): any => {
  const { userId, stockSymbol } = req.body as ORDER_REQUEST;
  const quantity = Number(req.body.quantity);
  const price: PriceOptions = Number(req.body.price) as PriceOptions;
  const stockType = req.body.stockType as "yes" | "no";

  const userExists = inrBalances[userId];
  const symbolExists = orderbook[stockSymbol];

  if (!userExists) {
      res.send({ error: `User with user Id ${userId} does not exist` });
      return;
  }
  if (!symbolExists) {
      res.send({ error: `Stock with stockSymbol ${stockSymbol} does not exist` });
      return;
  }

  const requiredBalance = quantity * price;
  const userBalance = inrBalances[userId].balance / 100;

  if (requiredBalance > userBalance) {
      res.status(400).send({ message: "Insufficient INR balance" });
      return;
  }

  // Sort and Filter the orderbook for less than or equal to price
  const buyOrderArray = orderbook[stockSymbol][stockType]
  .sort((a, b) => a.price - b.price)
  .filter((item) => item.price <= price && item.total != 0);

  // Check for total available quantity of all stocks that can match
  let availableQuantity = buyOrderArray.reduce(
      (acc, item) => acc + item.total, 0 );

  // No stocks for sale -> Create a Pseudo Sell Order
  if (availableQuantity == 0) {
      initiateSellOrder(stockSymbol, stockType, price, quantity, userId, "buy");
      res.send({ message: "Bid Submitted" });
      return;
  }

  let requiredQuantity = quantity;

  // loop over yes/no orders -> one price at a time
  for (const buyOrder in buyOrderArray) {
    const orderPrice = Number(buyOrderArray[buyOrder].price) as PriceOptions;

    requiredQuantity = matchOrder(
      stockSymbol,
      stockType,
      orderPrice,
      requiredQuantity,
      buyOrderArray[buyOrder],
      userId,
      "buy"
    );
    publishOrderbook(stockSymbol); // Publish to all subscribers

    if (requiredQuantity == 0) {
      break;
    }

    availableQuantity = buyOrderArray.reduce(
      (acc, item) => acc + item.total,
      0
    );

    // Inititate a partial pseudo sell order for remaining quantities
    if (availableQuantity == 0) {
      initiateSellOrder(
        stockSymbol,
        stockType,
        price,
        requiredQuantity,
        userId,
        "buy"
      );
      break;
    }
  }

  res.status(200).send({
    message: `Buy order placed and trade executed`,
  });
};

export const sellOrder = (req: Request, res: Response): any => {
  const { userId, stockSymbol } = req.body as ORDER_REQUEST;
  const quantity = Number(req.body.quantity);
  const price = Number(req.body.price) as PriceOptions;
  const stockType = req.body.stockType as "yes" | "no";

  const userExists = inrBalances[userId];
  const symbolExists = orderbook[stockSymbol];

  if (!userExists) {
    res.send({ error: `User with user Id ${userId} does not exist` });
    return;
  }
  if (!symbolExists) {
    res.send({ error: `Stock symbol ${stockSymbol} does not exist` });
    return;
  }

  const requiredBalance = quantity * price;
  const userBalance = inrBalances[userId].balance / 100;

  if(userBalance < requiredBalance) {
      res.status(400).send({ message: "Insufficient INR balance" });
      return;
  }

  let pseudoType: "yes" | "no" = "yes";
  let pseudoPrice: PriceOptions = Number(10 - price) as PriceOptions;
  if (stockType == "yes") {
      pseudoType = "no";
  }
  const sellOrderObject = orderbook[stockSymbol][pseudoType].find(
    (item) => item.price == pseudoPrice
  );

  let totalAvailableQuantity: number = 0;

  if (sellOrderObject) {
    totalAvailableQuantity = sellOrderObject.orders.reduce((acc, item) => {
      if (item.type == "buy") {
        return (acc += item.quantity);
      } else {
        return acc;
      }
    }, 0);
  }

  if (totalAvailableQuantity == 0) {
    initiateSellOrder(stockSymbol, stockType, price, quantity, userId, "sell");

    res.send({
      message: `Sell order placed for ${quantity} '${stockType}' options at price ${price}.`,
    });
    return;
  }

  // Matching Sell Orders with Buy orders (pseudo Sell)
  let requiredQuantity = quantity;

  if (totalAvailableQuantity >= quantity) {
    requiredQuantity = matchOrder(
      stockSymbol,
      stockType,
      price,
      requiredQuantity,
      sellOrderObject!,
      userId,
      "sell"
    );
    publishOrderbook(stockSymbol); // Publish to all subscribers
    res.status(200).send({ message: "Sell order filled completely" });
    return;
  }

  // Sell Order with partial Matching
  requiredQuantity = matchOrder(
    stockSymbol,
    stockType,
    price,
    requiredQuantity,
    sellOrderObject!,
    userId,
    "sell"
  );
  publishOrderbook(stockSymbol); // Publish to all subscribers
  res
    .status(200)
    .send({ message: "Sell order partially filled and rest are initiated" });
  return;
};


export const cancelOrder = (req: Request, res: Response): any => {
    const { userId, stockSymbol, price, orderId } = req.body;
    const stockType = req.body.stockType as "yes" | "no";
    const userExists = inrBalances[userId];
    const symbolExists = orderbook[stockSymbol];
  
    if (!userExists) {
      res.send({ error: `User with user Id ${userId} does not exist` });
      return;
    }
    if (!symbolExists) {
      res.send({ error: `Stock with stockSymbol ${stockSymbol} does not exist` });
      return;
    }
  
    console.log(orderbook[stockSymbol][stockType]);
  
    res.send({ message: "Sell order canceled" });
}

// Create a Sell order (Either sell or buy(pseudo sell))
const initiateSellOrder = (
  stockSymbol: string,
  stockType: "yes" | "no",
  price: PriceOptions,
  quantity: number,
  userId: string,
  orderType: "buy" | "sell"
) => {
  let newPrice: PriceOptions =
    orderType == "buy" ? ((10 - price) as PriceOptions) : price;
  let newType: "yes" | "no" =
    orderType == "buy" ? (stockType == "yes" ? "no" : "yes") : stockType;

  // pseudo order -> Lock inr balance of the user (in paise)
  if (orderType == "buy") {
    inrBalances[userId].balance -= quantity * newPrice * 100;
    inrBalances[userId].locked += quantity * newPrice * 100;
  }

  // actual sell order -> Lock stock balance of user
  if (orderType == "sell") {
    stockBalances[userId][stockSymbol][newType]!.quantity -= quantity;
    stockBalances[userId][stockSymbol][newType]!.locked += quantity;
  }

  const sellOrderArray = orderbook[stockSymbol][newType];
  const sellOrder = sellOrderArray.find((item) => item.price == newPrice);

  // Add order to orderbook
  if (sellOrder) {
    sellOrder.total += quantity;
    sellOrder.orders.push({ userId, id: 15, quantity, type: orderType });
  } else {
    sellOrderArray.push({
      price: newPrice,
      total: quantity,
      orders: [{ userId, id: 10, quantity, type: orderType }],
    });
  }
  publishOrderbook(stockSymbol);
};

const matchOrder = (
  stockSymbol: string,
  stockType: "yes" | "no",
  orderPrice: PriceOptions,
  requiredQuantity: number,
  orderObject: Order,
  takerId: string,
  takerType: "buy" | "sell"
) => {
  const allOrders = orderObject.orders;
  let remainingQuantity = requiredQuantity;

  // loop over all orders -> one at a time
  for (const order in allOrders) {
    if (allOrders[order].quantity >= remainingQuantity) {
      // Update quantity in order book
      allOrders[order].quantity -= remainingQuantity;
      orderObject.total -= remainingQuantity;

      // update Stocks and INR balances
      updateBalances(
        stockSymbol,
        stockType,
        orderPrice,
        remainingQuantity,
        takerId,
        takerType,
        allOrders[order].userId,
        allOrders[order].type
      );

      // Order completely filled
      remainingQuantity = 0;

      return remainingQuantity;
    } else {
      remainingQuantity -= allOrders[order].quantity;
      orderObject.total -= allOrders[order].quantity;

      // update Stocks and INR balances
      updateBalances(
        stockSymbol,
        stockType,
        orderPrice,
        allOrders[order].quantity,
        takerId,
        takerType,
        allOrders[order].userId,
        allOrders[order].type
      );

      // Order partially filled
      allOrders[order].quantity = 0;
    }
  }
  return remainingQuantity;
};

// Update INR and stock balances after order matched
const updateBalances = (
  stockSymbol: string,
  stockType: "yes" | "no",
  price: PriceOptions,
  quantity: number,
  takerId: string,
  takerType: "buy" | "sell",
  makerId: string,
  makerType: "buy" | "sell"
) => {
  // Maker balance and stocks update
  if (makerType == "buy") {
    inrBalances[makerId].locked -= quantity * price * 100;

    let makerStockType: "yes" | "no" =
      takerType == "buy" ? (stockType == "yes" ? "no" : "yes") : stockType;

    if (stockBalances[makerId][stockSymbol]) {
      stockBalances[makerId][stockSymbol][makerStockType]!.quantity +=
        quantity;
    } else {
      stockBalances[makerId][stockSymbol] = {
        [makerStockType]: { quantity: quantity, locked: 0 },
      };
    }
  } else {
    inrBalances[makerId].balance += quantity * price * 100;
    stockBalances[makerId][stockSymbol][stockType]!.locked -= quantity;
  }

  // Taker balance and stock update
  if (takerType == "buy") {
    inrBalances[takerId].balance -= quantity * price * 100;

    if (stockBalances[takerId][stockSymbol]) {
      stockBalances[takerId][stockSymbol][stockType]!.quantity += quantity;
    } else {
      stockBalances[takerId][stockSymbol] = {
        [stockType]: { quantity: quantity, locked: 0 },
      };
    }
  } else {
    inrBalances[takerId].balance += quantity * price * 100;
    stockBalances[takerId][stockSymbol][stockType]!.quantity -= quantity;
  }
};
