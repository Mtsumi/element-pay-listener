require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const abi = require('./abi.json');

console.log("🚀 Starting listener...");

// WebSocket provider
const provider = new ethers.WebSocketProvider(process.env.RPC_WS_URL);

provider._websocket?.on?.('open', () => {
  console.log("📡 WebSocket connected to:", process.env.RPC_WS_URL);
});

provider._websocket?.on?.('error', (err) => {
  console.error("❌ WebSocket error:", err.message);
});

provider._websocket?.on?.('close', (code, reason) => {
  console.warn(`⚠️ WebSocket closed: ${code} - ${reason}`);
});

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

setInterval(async () => {
  const block = await provider.getBlockNumber();
  console.log("💓 Heartbeat — latest block:", block);
}, 10000);


// OrderCreated listener
contract.on("OrderCreated", async (...args) => {
    console.log("whole args", args);
    const event = args[args.length - 1];
    console.log("📥 OrderCreated event received");
    console.log("🔍 Raw event.args:", event.args);
  
    try {
      const payload = {
        orderId: event.args?.orderId?.toString?.() || "",
        requester: event.args?.requester || "",
        token: event.args?.token || "",
        amount: event.args?.amount?.toString?.() || "0",
        messageHash: event.args?.messageHash || "",
        orderType: Number(event.args?.orderType ?? 0),
        transactionHash: event.log?.transactionHash?.toString() || ""
      };
  
      const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-created`, payload);
      console.log("✅ OrderCreated forwarded:", res.data);
    } catch (err) {
      console.error("❌ Failed to forward OrderCreated:", err.message);
      console.error("🧾 Payload that caused error:", err.config?.data);
    }
  });
    
// OrderSettled listener
contract.on("OrderSettled", async (...args) => {
  const event = args[args.length - 1];
  console.log("📥 OrderSettled event received");
  console.log("🔍 Raw event.args:", event.args);

  const payload = {
    orderId: event.args[0],
    transactionHash: event?.log?.transactionHash || ""
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-settled`, payload, {
      headers: {
        "x-api-key": process.env.API_KEY,
      }
    });
    console.log("✅ OrderSettled forwarded:", res.data);
  } catch (err) {
    console.error("❌ Failed to forward OrderSettled:", err.message);
    console.error("📦 Payload:", payload);
  }
});



// 👉 OrderRefunded listener
contract.on("OrderRefunded", async (...args) => {
  const event = args[args.length - 1];
  console.log("📥 OrderRefunded event received");

  const payload = {
    orderId: event.args.orderId,
    transactionHash: event.transactionHash
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-refunded`, payload);
    console.log("✅ OrderRefunded forwarded:", res.data);
  } catch (err) {
    console.error("❌ Failed to forward OrderRefunded:", err.message);
  }
});

console.log("🟢 Event listeners registered. Waiting for events...");
