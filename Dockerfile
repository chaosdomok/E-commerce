# ============================================================================
# PRODUCTION-GRADE MULTI-STAGE DOCKERFILE
# Next.js 16.2.10 + Prisma + Tailwind CSS v4
# Security-First Build with Least Privilege
# ============================================================================

# ============================================================================
# STAGE 1: DEPENDENCIES (Production Only)
# ============================================================================
FROM node:20-alpine AS deps

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set security flags
ENV NODE_ENV=production \
    npm_config_omit=dev \
    npm_config_audit=false \
    npm_config_fund=false

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# ============================================================================
# STAGE 2: BUILDER (Full Dependencies for Build)
# ============================================================================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache libc6-compat dumb-init

# Set build environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PRIVATE_SKIP_VALIDATION=1

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for PostCSS/Tailwind)
RUN npm ci --include=dev

# Copy source code and Prisma schema
COPY . .

# Set ownership to non-root user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user for build
USER nextjs

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# ============================================================================
# STAGE 3: RUNNER (Production Image)
# ============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PRIVATE_SKIP_VALIDATION=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create non-root user and group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json

# Copy Next.js standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma client and schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init to handle signals properly and run as non-root
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
