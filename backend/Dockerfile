FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts skips the postinstall Chrome download (Puppeteer scraping stays
# disabled via ENABLE_PUPPETEER_SCRAPING=false, so Chrome isn't needed in the image).
RUN npm install --omit=dev --ignore-scripts

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
