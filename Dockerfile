FROM node:18-slim

# Set working dir
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --no-audit --production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/healthz || exit 1


# Run the listener
CMD ["node", "listener.js"]
