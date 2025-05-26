require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const abi = require('./abi.json');
const fs = require('fs');
const axiosRetry = require('axios-retry');

console.log("🚀 Starting listener...");



//  debug api key
if (process.env.API_KEY) {
  } else {
  console.log("❌ No API key provided. Exiting...");
  }
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


axiosRetry(axios, { 
  retries: 5, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.response?.status === 429 || axiosRetry.isNetworkOrIdempotentRequestError(error)
});

const LAST_BLOCK_FILE = './last_block.json';
function saveLastBlock(blockNumber) {
  fs.writeFileSync(LAST_BLOCK_FILE, JSON.stringify({ blockNumber }));
}
function loadLastBlock() {
  try {
    return JSON.parse(fs.readFileSync(LAST_BLOCK_FILE)).blockNumber;
  } catch {
    return null;
  }
}

const processedEvents = new Set();
const processedOrderSettled = new Set();
const processedOrderRefunded = new Set();

async function processOrderCreated(event) {
  const eventId = event.transactionHash + ':' + event.logIndex;
  if (processedEvents.has(eventId)) return;
  processedEvents.add(eventId);

  const payload = {
    orderId: event.args?.orderId?.toString?.() || "",
    requester: event.args?.requester || "",
    token: event.args?.token || "",
    amount: event.args?.amount?.toString?.() || "0",
    messageHash: event.args?.messageHash || "",
    orderType: Number(event.args?.orderType ?? 0),
    transactionHash: event.log?.transactionHash?.toString() || ""
  };

  try {
    const res = await axios.post(
      `${process.env.FASTAPI_BASE_URL}/events/order-created`,
      payload,
      { headers: { "x-api-key": process.env.API_KEY } }
    );
    console.log("✅ OrderCreated forwarded:", res.data);
    saveLastBlock(event.blockNumber);
  } catch (err) {
    console.error("❌ Failed to forward OrderCreated:", err.message);
    console.error("📦 Payload:", payload);
  }
}

async function catchUpOrderCreated() {
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = loadLastBlock() || (latestBlock - 1000);
  const events = await contract.queryFilter("OrderCreated", fromBlock, latestBlock);
  for (const event of events) {
    await processOrderCreated(event);
  }
}
catchUpOrderCreated().catch(console.error);

// Real-time listener
contract.on("OrderCreated", async (...args) => {
  const event = args[args.length - 1];
  await processOrderCreated(event);
});

provider._websocket?.on?.('close', async () => {
  console.warn("WebSocket closed. Attempting to catch up...");
  await catchUpOrderCreated();
});

    
// OrderSettled listener
contract.on("OrderSettled", async (...args) => {
  console.log("📥 OrderSettled event received");
  const event = args[args.length - 1];
  const eventId = event.transactionHash + ':' + event.logIndex;
  if (processedOrderSettled.has(eventId)) return;
  processedOrderSettled.add(eventId);

  const payload = {
    orderId: event.args[0],
    transactionHash: event?.log?.transactionHash || event.transactionHash || ""
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-settled`, payload, {
      headers: { "x-api-key": process.env.API_KEY }
    });
    console.log("✅ OrderSettled forwarded:", res.data);
  } catch (err) {
    console.error("❌ Failed to forward OrderSettled:", err.message, err.stack);
    console.error("📦 Payload:", payload);
  }
});



// 👉 OrderRefunded listener
contract.on("OrderRefunded", async (...args) => {
  console.log("📥 OrderRefunded event received");

  const event = args[args.length - 1];
  const eventId = event.transactionHash + ':' + event.logIndex;
  if (processedOrderRefunded.has(eventId)) return;
  processedOrderRefunded.add(eventId);

  const payload = {
    orderId: event.args.orderId,
    transactionHash: event?.log?.transactionHash || event.transactionHash || ""
  };

  try {
    const res = await axios.post(`${process.env.FASTAPI_BASE_URL}/events/order-refunded`, payload, {
      headers: { "x-api-key": process.env.API_KEY }
    });
    console.log("✅ OrderRefunded forwarded:", res.data);
  } catch (err) {
    console.error("❌ Failed to forward OrderRefunded:", err.message, err.stack);
    console.error("📦 Payload:", payload);
  }
});

console.log("🟢 Event listeners registered. Waiting for events...");
