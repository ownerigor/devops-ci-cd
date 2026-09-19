FROM node:24.19.0-alpine

WORKDIR /app
RUN npm install --global npm@11.17.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["npm", "start"]

# Construir imagem Docker...
# docker build -t do-git-ao-deploy:latest .

# Executar container...
# docker run --rm -p 3000:3000 --name devops-ci-cd do-git-ao-deploy:latest