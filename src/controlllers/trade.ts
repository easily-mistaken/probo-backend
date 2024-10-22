import { Request, Response } from "express";
import { inrBalances, stockBalances, orderbook} from "../config/globals";

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