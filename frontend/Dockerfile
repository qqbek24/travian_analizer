# Frontend Dockerfile - React + Vite
FROM node:18-alpine

WORKDIR /app

# Kopiuj package.json i instaluj zależności
COPY package*.json ./
RUN npm install

# Kopiuj kod aplikacji
COPY . .

# Eksponuj port
EXPOSE 3000

# Uruchom dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
