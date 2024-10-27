import { Request, Response } from "express";
import { createClient } from "redis";
import { orderbook } from "../config/globals";
// Publisher
const publisher = createClient();

export const connectToRedis = async () => {
  try {
    await publisher.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.error("Failed to connect to Redis");
  }
};

export const publishOrderbook = async (eventId: string) => {
  try {
    if (orderbook[eventId]) {
      const orderbook = getOrderBookByEvent(eventId);
      await publisher.publish(eventId, JSON.stringify(orderbook));
    }
    return;
  } catch (err) {
    console.log(err);
    return;
  }
};

const getOrderBookByEvent = (eventId: string) => {
  let orderBook;
  const symbolExists = orderbook[eventId];

  if (symbolExists) {
    orderBook = Object.fromEntries(
      Object.entries(symbolExists).map(([type, orders]) => {
        return [
          type,
          orders.map((item) => {
            return { price: item.price, quantity: item.total };
          }),
        ];
      })
    );
  } else {
    orderBook = { eventId: {} };
  }

  return orderBook;
};
