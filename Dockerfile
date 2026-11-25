# نشر على Hugging Face Spaces (مجاني، بدون بطاقة): النوع Docker، والمنفذ 7860
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build && chown -R node:node /app
USER node
ENV PORT=7860 NODE_ENV=production
EXPOSE 7860
CMD ["node", "server/index.js"]
