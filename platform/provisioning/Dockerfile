FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
EXPOSE 3002
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
