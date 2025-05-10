# Element Pay Listener 🔁

A Node.js service that listens to smart contract events on the blockchain and forwards them to the FastAPI backend.

## 🔍 What it does

- Connects to Base Sepolia via WebSocket
- Listens for `OrderCreated`, `OrderSettled`, and `OrderRefunded`
- Forwards the events to the FastAPI backend for processing

## 🧱 Structure

- `listener.js`: Main logic
- `.env`: Environment variables (see below)
- `abi.json`: Contract ABI

## 🔧 Setup

```bash
cp .env.example .env
npm install
node listener.js
```

## 🔐 Environment Variables

```
RPC_WS_URL=
CONTRACT_ADDRESS=0x...
FASTAPI_BASE_URL=https://api.elementpay.net
API_KEY=your-api-key
```

## 📦 Event Forwarding

See [`docs/event_forwarding.md`](docs/events/event_forwarding.md)