FROM node:22.23.1-bookworm-slim AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY .env.production index.html app.js styles.css vite.config.js ./
COPY modules ./modules
COPY public ./public
COPY scripts/prepare-release.js ./scripts/prepare-release.js
COPY php-api ./php-api

RUN npm run build:release

FROM php:8.2.32-apache-bookworm

# MariaDB-kompatible PHP-Erweiterungen und benoetigte Apache-Module
RUN docker-php-ext-install mysqli pdo pdo_mysql \
    && a2enmod rewrite headers \
    && a2dismod -f autoindex

COPY docker/apache-http.conf /etc/apache2/sites-available/000-default.conf
COPY --from=frontend-build /app/docker/src/ /var/www/html/

RUN cp /var/www/html/gratulationsdienst/php-api/config.example.php /var/www/html/gratulationsdienst/php-api/config.php

CMD ["apache2-foreground"]
