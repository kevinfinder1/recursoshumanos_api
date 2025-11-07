FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci                                   # usa el lockfile → versiones exactas

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
