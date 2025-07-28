require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const abi = require('./abi.json');

let provider, contract;
let reconnectAttempts = 0;
const MAX_RECONNECTS = 5;

// --- Setup Event Handlers ---
async function handleOrderCreated(...args) {
  const event = args[args.length - 1];
  console.log("📥 OrderCreated received:", event.args);

  const payload = {
    orderId: event.args?.orderId?.toString() || "",
    requester: event.args?.requester || "",
    token: event.args?.token || "",
    amount: event.args?.amount?.toString() || "0",
    messageHash: event.args?.messageHash || "",
    orderType: Number(event.args?.orderType ?? 0),
    transactionHash: event.log?.transactionHash?.toString() || ""
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-created`, payload, {
      headers: { "x-api-key": process.env.API_KEY }
    });
    console.log("✅ OrderCreated forwarded:", res.data);
  } catch (err) {
  if (err.response) {
    console.error("❌ OrderCreated forwarding failed with status:", err.response.status);
    console.error("📨 Response data:", err.response.data);
  } else {
    console.error("❌ OrderCreated forwarding failed:", err.message);
  }
  console.error("📦 Payload:", payload);
}

}

async function handleOrderSettled(...args) {
  const event = args[args.length - 1];
  console.log("📥 OrderSettled received:", event.args);

  const payload = {
    orderId: event.args?.orderId || event.args[0],
    transactionHash: event?.log?.transactionHash || null
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-settled`, payload, {
      headers: { "x-api-key": process.env.API_KEY }
    });
    console.log("✅ OrderSettled forwarded:", res.data);
  } catch (err) {
    console.error("❌ OrderSettled forwarding failed:", err.message);
    console.error("📦 Payload:", payload);
  }
}

async function handleOrderRefunded(...args) {
  const event = args[args.length - 1];

  console.log("📥 OrderRefunded received:", event.args);

  const payload = {
    orderId: event.args?.orderId || event.args[0],
    transactionHash: event?.log?.transactionHash || null
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-refunded`, payload, {
      headers: { "x-api-key": process.env.API_KEY }
    });
    console.log("✅ OrderRefunded forwarded:", res.data);
  } catch (err) {
    console.error("❌ OrderRefunded forwarding failed:", err.message);
    console.error("📦 Payload:", payload);
  }
}

// --- Reconnection Logic ---
function reconnectWithBackoff() {
  if (reconnectAttempts >= MAX_RECONNECTS) {
    console.error("🛑 Max reconnection attempts reached. Exiting.");
    process.exit(1);
  }

  const delay = Math.min(5000 * 2 ** reconnectAttempts, 30000);
  console.warn(`🔁 Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts + 1})`);
  setTimeout(() => {
    reconnectAttempts++;
    setupListeners();
  }, delay);
}

// --- Setup Listeners ---
function setupListeners() {
  console.log("🔧 Initializing provider and listeners...");
  provider = new ethers.WebSocketProvider(process.env.RPC_WS_URL);
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, provider);

  // Keep-alive
  provider.on("block", (blockNumber) => {
    console.log("💓 New block:", blockNumber);
  });

  provider._websocket?.on("open", () => {
    reconnectAttempts = 0;
    console.log("✅ WebSocket connected");
  });

  provider._websocket?.on("close", (code, reason) => {
    console.warn(`⚠️ WebSocket closed: ${code} - ${reason}`);
    reconnectWithBackoff();
  });

  provider._websocket?.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
  });

  // Register event listeners
  contract.on("OrderCreated", handleOrderCreated);
  contract.on("OrderSettled", handleOrderSettled);
  contract.on("OrderRefunded", handleOrderRefunded);

  console.log("🟢 Listeners registered. Awaiting events...");
}

// ──────────────────────────────────────────────────────────────
// Health endpoint
// ──────────────────────────────────────────────────────────────
const express = require('express');
const healthApp = express();
const healthPort = process.env.HEALTH_PORT || 3000;

healthApp.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

healthApp.listen(healthPort, () => {
  console.log(`🩺 Health check listening on port ${healthPort}`);
});

setupListeners();
