import { Request, Response } from "express";
import { inrBalances, stockBalances, orderbook } from "../config/globals";

export const getInrBalances = (req: Request, res: Response): any => {
    res.status(200).send(inrBalances);
};

export const getInrBalanceByUserId = (req: Request, res: Response): any => {
    const userId = req.params.userId;

    const userExists = inrBalances[userId];

    if(!userExists) {
        res.send({ error: `User with ID ${userId} does not exist` });
    return;
    }

    const balance = inrBalances[userId].balance;
    res.send({ balance });
};

export const getStockBalances = (req: Request, res: Response): any => {
    res.send(stockBalances)
};

export const getStockBalancesByUserId = (req: Request, res: Response): any => {
    const userId = req.params.userId;

    const userExists = inrBalances[userId];
  const stocksExists = stockBalances[userId];

  if (!userExists) {
    res.send({ error: `User with Id ${userId} does not exist` });
    return;
  }
  if (!stocksExists) {
    res.send({ message: `No stocks for user with userId ${userId}` });
    return;
  }

  res.send(stockBalances[userId]);
};

export const onRamp = (req: Request, res: Response): any => {
    const userId = req.body.userId;
    const amount: number = req.body.amount;

    const userExists = inrBalances[userId];

    if (!userExists) {
    res.send({ error: `User with ID ${userId} does not exist` });
    return;
    }

    inrBalances[userId].balance += amount;

    res.status(200).send({
    message: `Onramped ${userId} with amount ${amount}`,
    });
};