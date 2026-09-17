FROM node:20-slim

# Instalar dependencias para fuentes y librsvg
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-dejavu-core \
    fonts-liberation \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3001
EXPOSE 3001

CMD ["node", "src/server.js"]
