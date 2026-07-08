#!/bin/sh
set -eu

cert_dir='/etc/apache2/ssl'
cert_file="$cert_dir/fullchain.pem"
key_file="$cert_dir/privkey.pem"

if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
    mkdir -p "$cert_dir"
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -subj '/CN=localhost' -keyout "$key_file" -out "$cert_file" >/dev/null 2>&1
fi

exec docker-php-entrypoint "$@"
