# syntax=docker/dockerfile:1

# ============================================================
# ETAPA 1 - BUILD DO ANGULAR
# ============================================================
FROM node:22.14.0-alpine AS build

WORKDIR /app

# Copia primeiro os arquivos de dependências para aproveitar cache.
COPY package.json package-lock.json ./

RUN npm ci

# Copia o restante do projeto.
COPY . .

# Gera o bundle otimizado de produção.
RUN node ./node_modules/@angular/cli/bin/ng.js build --configuration production


# ============================================================
# ETAPA 2 - NGINX
# ============================================================
FROM nginx:1.27-alpine

# Remove a configuração padrão.
RUN rm -f /etc/nginx/conf.d/default.conf

# Configuração do CliniCar.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular 18 application builder gera os arquivos em /browser.
COPY --from=build /app/dist/clinicar/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]