import express from 'express';
import { createUser } from "../controlllers/user";
import { createSymbol, mintTokens, reset } from "../controlllers/trade";
import {
    getInrBalanceByUserId,
    getInrBalances,
    getStockBalances,
    getStockBalancesByUserId,
    onRamp
} from "../controlllers/balance";
import { buyOrder, getOrderbook, sellOrder, viewOrders } from "../controlllers/orders"

const router = express.Router();

router.post("/user/create/:userId", createUser);
router.post("/symbol/create/:stockSymbol", createSymbol);
router.get("/balances/inr", getInrBalances);
router.get("/balances/inr/:userId", getInrBalanceByUserId);
router.get("/balances/stock", getStockBalances);
router.get("/balances/stock/:userId", getStockBalancesByUserId);
router.post("/onramp/inr", onRamp);

router.get("/orderbook", getOrderbook);
router.get("/orderbook/stockSymbol", viewOrders);
router.post("/order/buy", buyOrder);
router.post("/order/sell", sellOrder);
router.post("/order/cancel", cancelOrder);

router.post("/trade/mint", mintTokens);
router.post("/reset", reset);

export default router;
