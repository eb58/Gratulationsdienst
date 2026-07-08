FROM php:8.2-apache

# Installiere die MariaDB-kompatiblen Erweiterungen für PHP und das Tool für ein Default-Zertifikat
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && docker-php-ext-install mysqli pdo pdo_mysql \
    && a2enmod rewrite ssl \
    && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

COPY docker/apache-http.conf /etc/apache2/sites-available/000-default.conf
COPY docker/apache-https.conf /etc/apache2/sites-available/default-ssl.conf
COPY docker/apache-entrypoint.sh /usr/local/bin/apache-entrypoint.sh

RUN chmod +x /usr/local/bin/apache-entrypoint.sh \
    && a2ensite default-ssl

ENTRYPOINT ["/usr/local/bin/apache-entrypoint.sh"]
CMD ["apache2-foreground"]
