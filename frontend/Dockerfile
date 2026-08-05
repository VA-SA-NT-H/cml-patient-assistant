FROM node:22-alpine AS build

WORKDIR /app

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]