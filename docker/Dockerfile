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

# Installiere die MariaDB-kompatiblen Erweiterungen für PHP und das Tool für ein Default-Zertifikat
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && a2enmod rewrite ssl headers \
    && a2dismod -f autoindex

COPY docker/apache-http.conf /etc/apache2/sites-available/000-default.conf
COPY docker/apache-https.conf /etc/apache2/sites-available/default-ssl.conf
COPY docker/apache-entrypoint.sh /usr/local/bin/apache-entrypoint.sh
COPY --from=frontend-build /app/docker/src/ /var/www/html/

RUN chmod +x /usr/local/bin/apache-entrypoint.sh \
    && cp /var/www/html/gratulationsdienst/php-api/config.example.php /var/www/html/gratulationsdienst/php-api/config.php \
    && a2ensite default-ssl

ENTRYPOINT ["/usr/local/bin/apache-entrypoint.sh"]
CMD ["apache2-foreground"]
