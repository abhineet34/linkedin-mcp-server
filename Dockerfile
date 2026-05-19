# syntax=docker/dockerfile:1
# Multi-stage build for the LinkedIn MCP server.

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Build the TypeScript source
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ----------------------------------------------------------------------------
# Runtime image — only ships compiled JS + production deps
# ----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

# The MCP server speaks over stdio by default. For container hosts that need
# HTTP introspection (e.g. Glama), set TRANSPORT=http.
# LINKEDIN_ACCESS_TOKEN is optional at startup — the server will start and
# respond to introspection without it, but tool calls will fail with an
# auth error until the token is provided.
ENV TRANSPORT=stdio

EXPOSE 3000

CMD ["node", "dist/index.js"]
