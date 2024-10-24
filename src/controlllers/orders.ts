import { Request, Response } from "express";
import { inrBalances, stockBalances, orderbook } from "../config/globals";
import { PriceOptions } from "../interfaces/globals";
import { ORDER_REQUEST } from "../interfaces/requestModels";

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