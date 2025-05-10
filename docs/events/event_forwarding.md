# 🔁 Event Forwarding: Element Pay Listener

This document explains how the Element Pay listener forwards blockchain smart contract events to the FastAPI backend.

## 📦 Architecture Overview

- The listener connects to a smart contract deployed on Base Sepolia via WebSocket.
- It listens for three events: `OrderCreated`, `OrderSettled`, and `OrderRefunded`.
- Upon detecting an event, it constructs a payload and forwards it via HTTP POST to the appropriate FastAPI endpoint.

## 📤 Forwarded Events

### 🟢 OrderCreated

**Smart Contract Event:** `OrderCreated(orderId, requester, token, amount, messageHash, orderType)`

**Forwarded To:** `POST /events/order-created`  
**Headers:** `x-api-key: <API_KEY>`  
**Payload:**

```json
{
  "orderId": "ORD123",
  "requester": "0x...",
  "token": "USDC",
  "amount": "1000",
  "messageHash": "...",
  "orderType": 1,
  "transactionHash": "0xabc..."
}
```

### ✅ OrderSettled

**Event:** `OrderSettled(orderId)`  
**POST:** `/events/order-settled`  

```json
{ "orderId": "ORD123" }
```

### 🔁 OrderRefunded

**Event:** `OrderRefunded(orderId)`  
**POST:** `/events/order-refunded`  

```json
{ "orderId": "ORD123" }
```

## 🛠 Configuration

Environment variables required:

```bash
RPC_WS_URL=
CONTRACT_ADDRESS=
FASTAPI_BASE_URL=
API_KEY=
```

## 🔄 Reconnection Logic

If the WebSocket disconnects, the listener retries with exponential backoff (max 5 times).
