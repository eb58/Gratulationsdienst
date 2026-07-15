#!/bin/sh
set -eu

cert_dir='/etc/apache2/ssl'
cert_file="$cert_dir/fullchain.pem"
key_file="$cert_dir/privkey.pem"
allow_self_signed="${ALLOW_SELF_SIGNED_CERT:-false}"

if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
    if [ "$allow_self_signed" != 'true' ]; then
        echo 'TLS-Zertifikate fehlen. Für Produktion fullchain.pem und privkey.pem bereitstellen.' >&2
        exit 1
    fi

    mkdir -p "$cert_dir"
    umask 077
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -subj '/CN=localhost' -keyout "$key_file" -out "$cert_file" >/dev/null 2>&1
    chmod 600 "$key_file"
fi

exec docker-php-entrypoint "$@"
