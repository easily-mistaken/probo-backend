import { Request, Response } from "express";
import { inrBalances, stockBalances } from "../config/globals";

export const createUser = (req: Request, res: Response): any => {
    const userId: string = req.params.userId;

    if(!userId) {
        res.status(400).send({ error: "Invalid userId"});
        return;
    }

    const userExists = inrBalances[userId];

    if (userExists) {
        res.status(400).send({ error: "User already exists"});
        return;
    }

    inrBalances[userId] = {balance: 0, locked: 0};
    stockBalances[userId] = {};
    res.status(201).send({ message: `User ${userId} created`});
};

