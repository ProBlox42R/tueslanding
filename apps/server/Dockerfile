FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/server/package.json apps/server/package.json
RUN npm install --workspace=apps/server
COPY apps/server apps/server
WORKDIR /app/apps/server
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
