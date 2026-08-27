FROM node:20-alpine AS runner
WORKDIR /app

# Install system libraries needed for graphics/canvas/tesseract if needed
RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads/reports

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
