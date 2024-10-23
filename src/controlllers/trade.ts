import { Request, Response } from "express";
import { inrBalances, stockBalances, orderbook} from "../config/globals";
import { MINT_REQUEST } from "../interfaces/requestModels";

export const createSymbol = (req: Request, res: Response): any => {
    const stockSymbol = req.params.stockSymbol;

    if(!stockSymbol) {
        res.status(400).send({ error: ""});
        return;
    }

    const symbolExists = orderbook[stockSymbol];

    if(symbolExists) {
        res.status(400).send({ error: "Symbol already exists"});
        return;
    }

    orderbook[stockSymbol] = { yes: [], no: []};

    res.status(201).send({ message: `Symbol ${stockSymbol} created`});
};

export const mintToken = (req: Request, res: Response) => {
    const { userId, stockSymbol } = req.body as MINT_REQUEST;
    const quantity = Number(req.body.quantity);
    const price = Number(req.body.price) || 10;
  
    if (!userId || !stockSymbol || !quantity || !price) {
      res.send({ error: `Invalid Input` });
      return;
    }
    
    const userExists = inrBalances[userId];
  const symbolExists = orderbook[stockSymbol];

  if (!userExists) {
    res.send({ error: `User for Id ${userId} does not exist` });
    return;
  }
  if (!symbolExists) {
    res.send({ error: `Symbol with symbol ${stockSymbol} does not exist` });
    return;
  }

  const requiredBalance = quantity * price;
  const userBalance = inrBalances[userId].balance / 100;

  if (requiredBalance > userBalance) {
    res.send({ message: "Insufficient INR Balance" });
    return;
  }

  if (!stockBalances?.[userId]?.[stockSymbol]) {
    stockBalances[userId] = {
      [stockSymbol]: {
        yes: {
          quantity,
          locked: 0,
        },
        no: {
          quantity,
          locked: 0,
        },
      },
    };
  } else {
    const initalYesStocks = stockBalances[userId][stockSymbol]?.yes;
    const initalNoStocks = stockBalances[userId][stockSymbol].no;

    stockBalances[userId][stockSymbol].yes = {
      quantity: (initalYesStocks?.quantity || 0) + quantity,
      locked: initalYesStocks?.locked || 0,
    };

    stockBalances[userId][stockSymbol].no = {
      quantity: (initalNoStocks?.quantity || 0) + quantity,
      locked: initalNoStocks?.locked || 0,
    };
  }

  const remainingBalance = userBalance - requiredBalance;
  inrBalances[userId].balance = remainingBalance * 100;

  res.status(200).send({
    message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
  });
};

export const reset = (req: Request, res: Response): any => {
    for (let key in inrBalances) {
        delete inrBalances[key];
    }

    for (let key in stockBalances) {
    delete stockBalances[key];
    }

    for (let key in orderbook) {
        delete orderbook[key];
    }
    res.status(200).send({ message: "Reset done"});
};