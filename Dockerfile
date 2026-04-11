# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# OpenSSL is required by the Prisma engine at runtime on Alpine.
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

# Next.js standalone output.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma needs the schema + migrations at runtime for `migrate deploy`,
# plus the generated client that standalone bundling does not always include.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# SQLite file lives under /app/data so it survives container rebuilds via volume.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# Apply migrations on boot, then start Next.js.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
