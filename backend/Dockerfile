FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=backend
COPY backend ./backend
RUN npx prisma generate --schema=backend/prisma/schema.prisma
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && npm run start --workspace=backend"]
