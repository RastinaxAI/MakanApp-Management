#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MODE="${1:-deploy}"
case "$MODE" in
    deploy|--ssl-only|--diagnose) ;;
    --help|-h)
        echo 'Usage: sudo bash setup.sh [--ssl-only|--diagnose]'
        exit 0
        ;;
    *) echo 'Usage: sudo bash setup.sh [--ssl-only|--diagnose]' >&2; exit 1 ;;
esac
if [[ "$#" -gt 1 ]]; then
    echo 'Too many arguments.' >&2
    exit 1
fi
if [[ "${EUID}" -ne 0 ]]; then
    echo 'Run this script as root: sudo bash setup.sh [--ssl-only|--diagnose]' >&2
    exit 1
fi

DOMAIN=management.makanapp.org
SSL_EMAIL=rastinaxoffice@gmail.com
PROJECT_DIR=/var/www/makanapp/management
ENV_FILE="$PROJECT_DIR/.env.docker"
SITE_CONFIG=/etc/nginx/sites-available/makanapp-management.conf
ENABLED_SITE=/etc/nginx/sites-enabled/makanapp-management.conf
PROXY_CONFIG=/etc/nginx/snippets/makanapp-management-proxy.conf
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
ACME_ROOT=/var/www/letsencrypt
TLS_CHAIN=
SSL_BACKUP=

reload_nginx() {
    nginx -t
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
    else
        systemctl start nginx
    fi
}

usable_certificate() {
    [[ -s "$1" && -s "${1%/*}/privkey.pem" ]] &&
        openssl x509 -in "$1" -noout -checkend 86400 >/dev/null 2>&1 &&
        openssl verify -verify_hostname "$DOMAIN" -CApath /etc/ssl/certs \
            -untrusted "$1" "$1" >/dev/null 2>&1
}

# Restore just this site's files when certificate issuance, validation or reload fails.
rollback_ssl() {
    local status="$1" name target
    trap - ERR
    set +e
    for name in site proxy enabled; do
        case "$name" in
            site) target="$SITE_CONFIG" ;;
            proxy) target="$PROXY_CONFIG" ;;
            enabled) target="$ENABLED_SITE" ;;
        esac
        rm -f "$target"
        if [[ -e "$SSL_BACKUP/$name" || -L "$SSL_BACKUP/$name" ]]; then
            cp -a "$SSL_BACKUP/$name" "$target"
        fi
    done
    reload_nginx
    echo "SSL setup failed; previous management configuration restored. Backup: $SSL_BACKUP" >&2
    exit "$status"
}

write_management_site() {
    local staged
    staged=$(mktemp "${SITE_CONFIG}.XXXXXX")
    cat > "$staged" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name management.makanapp.org;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }
NGINX
    if [[ -n "$TLS_CHAIN" ]]; then
        cat >> "$staged" <<'NGINX'
    location / {
        return 301 https://management.makanapp.org$request_uri;
    }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name management.makanapp.org;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:MakanManagementSSL:10m;
    ssl_session_timeout 1d;
NGINX
        printf '    ssl_certificate "%s";\n' "$TLS_CHAIN" >> "$staged"
        printf '    ssl_certificate_key "%s/privkey.pem";\n' "${TLS_CHAIN%/*}" >> "$staged"
    fi
    cat >> "$staged" <<'NGINX'
    include /etc/nginx/snippets/makanapp-management-proxy.conf;
}
NGINX
    chmod 644 "$staged"
    mv -f "$staged" "$SITE_CONFIG"
}

configure_ssl() {
    local candidate name target staged
    install -d -m 755 /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/snippets
    install -d -m 755 "$ACME_ROOT" "$ACME_ROOT/.well-known" "$ACME_ROOT/.well-known/acme-challenge"
    install -d -m 700 /var/backups/makanapp-management
    SSL_BACKUP=$(mktemp -d /var/backups/makanapp-management/ssl.XXXXXX)
    for name in site proxy enabled; do
        case "$name" in
            site) target="$SITE_CONFIG" ;;
            proxy) target="$PROXY_CONFIG" ;;
            enabled) target="$ENABLED_SITE" ;;
        esac
        if [[ -d "$target" ]]; then
            echo "Expected a file, found directory: $target" >&2
            return 1
        fi
        if [[ -e "$target" || -L "$target" ]]; then
            cp -a "$target" "$SSL_BACKUP/$name"
        fi
    done
    trap 'rollback_ssl "$?"' ERR

    # A lineage can have a suffix such as -0001. Validate its actual hostname,
    # dates and trust chain instead of assuming that its directory name is valid.
    for candidate in "$CERT_DIR/fullchain.pem" /etc/letsencrypt/live/*/fullchain.pem; do
        if usable_certificate "$candidate"; then
            TLS_CHAIN="$candidate"
            break
        fi
    done

    staged=$(mktemp "${PROXY_CONFIG}.XXXXXX")
    cat > "$staged" <<'NGINX'
gzip on;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_types text/plain text/css text/javascript application/javascript application/json application/xml text/xml image/svg+xml;

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 300s;
}
NGINX
    chmod 644 "$staged"
    mv -f "$staged" "$PROXY_CONFIG"
    write_management_site
    ln -sfn "$SITE_CONFIG" "$ENABLED_SITE"
    systemctl enable nginx
    reload_nginx

    if [[ -z "$TLS_CHAIN" ]]; then
        # Webroot changes no other site's certificate or Nginx configuration.
        certbot certonly --webroot --webroot-path "$ACME_ROOT" \
            --non-interactive --agree-tos --email "$SSL_EMAIL" \
            --domain "$DOMAIN" --cert-name "$DOMAIN" --renew-with-new-domains
        TLS_CHAIN="$CERT_DIR/fullchain.pem"
        if ! usable_certificate "$TLS_CHAIN"; then
            echo "Issued certificate does not validate for $DOMAIN." >&2
            rollback_ssl 1
        fi
        write_management_site
        reload_nginx
    fi

    # Check SNI, hostname and the trust chain locally, independently of Docker.
    # An HTTP 502 can mean the application is stopped; it is not a TLS failure.
    curl --silent --show-error --connect-timeout 10 --max-time 30 \
        --resolve "$DOMAIN:443:127.0.0.1" --output /dev/null "https://$DOMAIN/login"
    trap - ERR

    install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/makanapp-management-reload <<'HOOK'
#!/bin/sh
set -e
nginx -t
systemctl reload nginx
HOOK
    chmod 755 /etc/letsencrypt/renewal-hooks/deploy/makanapp-management-reload
    systemctl enable --now certbot.timer
    echo "SSL ready: https://$DOMAIN (Nginx backup: $SSL_BACKUP)"
}

diagnose() {
    echo "Management diagnostic report: $DOMAIN"
    date -Is
    echo '--- Nginx service and configuration check ---'
    systemctl is-active nginx || true
    if command -v nginx >/dev/null 2>&1; then
        nginx -t || true
        echo '--- Site files and server names (not the full configuration) ---'
        if [[ -e "$ENABLED_SITE" || -L "$ENABLED_SITE" ]]; then
            ls -ld "$SITE_CONFIG" "$ENABLED_SITE" "$PROXY_CONFIG" || true
        else
            echo "Management site is not enabled: $ENABLED_SITE"
        fi
        nginx -T 2>&1 | awk '
            /^# configuration file / { source = $0 }
            /^[[:space:]]*server_name[[:space:]]/ { print source; print }
            /conflicting server name|\[emerg\]|test failed/ { print }
        ' || true
    else
        echo 'Nginx is not installed.'
    fi
    echo '--- Processes listening on HTTP, HTTPS and the application port ---'
    if command -v ss >/dev/null 2>&1; then
        ss -ltnp '( sport = :80 or sport = :443 or sport = :3000 )' || true
    fi
    echo '--- Management Docker containers ---'
    if command -v docker >/dev/null 2>&1; then
        docker ps -a --filter label=com.docker.compose.project=makan-management \
            --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
    else
        echo 'Docker is not installed.'
    fi
    if command -v curl >/dev/null 2>&1; then
        echo '--- Direct application response ---'
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --output /dev/null --write-out 'Upstream /login: HTTP %{http_code}\n' \
            -H "Host: $DOMAIN" http://127.0.0.1:3000/login || true
        echo '--- Local Nginx responses for the management hostname ---'
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null \
            --write-out 'Local HTTP /login: %{http_code}; redirect: %{redirect_url}\n' \
            "http://$DOMAIN/login" || true
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --resolve "$DOMAIN:443:127.0.0.1" --output /dev/null \
            --write-out 'Local HTTPS /login: %{http_code}; TLS verify: %{ssl_verify_result}\n' \
            "https://$DOMAIN/login" || true
        echo '--- Public DNS, TLS and application response ---'
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --output /dev/null \
            --write-out 'Public HTTPS /login: %{http_code}; IP: %{remote_ip}; TLS verify: %{ssl_verify_result}\n' \
            "https://$DOMAIN/login" || true
    fi
    echo 'Diagnostic report complete. No configuration was changed.'
}

if [[ "$MODE" == --diagnose ]]; then
    diagnose
    exit 0
fi

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

if [[ "$MODE" == deploy ]]; then
    for required in Dockerfile compose.yaml package.json package-lock.json .env.docker.example scripts/docker-start.mjs; do
        if [[ ! -f "$PROJECT_DIR/$required" ]]; then
            echo "Missing $PROJECT_DIR/$required. Upload the complete project first." >&2
            exit 1
        fi
    done
    apt-get update
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install nginx ufw certbot python3-certbot-nginx python3 openssl ca-certificates curl
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    ufw --force enable
else
    # Repair TLS without apt upgrade, Docker, application files or session changes.
    missing=0
    for dependency in nginx certbot openssl curl; do
        if ! command -v "$dependency" >/dev/null 2>&1; then missing=1; fi
    done
    if [[ "$missing" -eq 1 ]]; then
        apt-get update
        apt-get install -y nginx certbot openssl ca-certificates curl
    fi
    if command -v ufw >/dev/null 2>&1; then ufw allow 'Nginx Full'; fi
fi

# Provision TLS before application builds so a build failure cannot skip SSL.
configure_ssl
if [[ "$MODE" == --ssl-only ]]; then
    exit 0
fi

# Keep an existing Docker installation; install missing Ubuntu packages only.
if ! command -v docker >/dev/null 2>&1; then apt-get install -y docker.io; fi
if ! docker compose version >/dev/null 2>&1; then apt-get install -y docker-compose-v2; fi
if ! docker buildx version >/dev/null 2>&1; then apt-get install -y docker-buildx; fi
systemctl enable --now docker
docker compose version
docker buildx version

if [[ ! -f "$ENV_FILE" ]]; then
    install -m 600 "$PROJECT_DIR/.env.docker.example" "$ENV_FILE"
fi
chown root:root "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Read dotenv as data, never as executable shell code. Retain configured secrets
# and backend/permission settings while selecting the public HTTPS origin.
python3 - "$ENV_FILE" <<'PYTHON'
import re
import secrets
import sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text().splitlines()
settings = {}
for line in lines:
    key, separator, value = line.partition('=')
    if separator and not key.lstrip().startswith('#'):
        settings[key.strip()] = value.strip()

secret = settings.get('SESSION_SECRET', '').strip('"\'')
if not secret:
    secret = secrets.token_hex(32)
if not re.fullmatch(r'[a-fA-F0-9]{64}', secret):
    sys.exit('Invalid SESSION_SECRET in .env.docker; expected 64 hexadecimal characters.')

updates = {
    'SESSION_SECRET': secret,
    'APP_ORIGIN': 'https://management.makanapp.org',
    'COOKIE_SECURE': 'true',
    'MAKAN_PORT': '3000',
}
result = []
written = set()
for line in lines:
    key = line.partition('=')[0].strip()
    if key in updates:
        if key not in written:
            result.append(f'{key}={updates[key]}')
            written.add(key)
    else:
        result.append(line)
result.extend(f'{key}={value}' for key, value in updates.items() if key not in written)
path.write_text('\n'.join(result) + '\n')
PYTHON

cd "$PROJECT_DIR"
# Match the loopback upstream even when the invoking shell has MAKAN_PORT set.
export MAKAN_PORT=3000
COMPOSE=(docker compose --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/compose.yaml" --env-file "$ENV_FILE")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d --wait --wait-timeout 240 web

curl --fail --silent --show-error --connect-timeout 10 --max-time 30 --output /dev/null https://management.makanapp.org/login

echo 'Setup complete: https://management.makanapp.org'
