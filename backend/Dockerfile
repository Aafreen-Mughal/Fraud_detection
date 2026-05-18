# ─── Stage 1: Dependencies ──────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files only (for cache efficiency)
COPY package*.json ./

# Install production deps only
RUN npm ci --only=production && npm cache clean --force

# ─── Stage 2: Builder ───────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ─── Stage 3: Production Runner ─────────────────
FROM node:18-alpine AS runner

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy production deps from deps stage
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy source from builder
COPY --from=builder --chown=nodeuser:nodejs /app/src ./src
COPY --from=builder --chown=nodeuser:nodejs /app/package*.json ./

# Switch to non-root
USER nodeuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start
CMD ["node", "src/index.js"]
