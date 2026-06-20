FROM php:8.2-apache

# Installiere die MySQL-Erweiterungen für PHP
RUN docker-php-ext-install mysqli pdo pdo_mysql \
    && a2enmod rewrite \
    && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
