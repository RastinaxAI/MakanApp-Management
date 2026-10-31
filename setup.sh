#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${EUID}" -ne 0 ]]; then
    echo 'Run this script as root: sudo ./setup.sh' >&2
    exit 1
fi

PROJECT_DIR=/var/www/makanapp/management
ENV_FILE="$PROJECT_DIR/.env.docker"
SITE_CONFIG=/etc/nginx/sites-available/makanapp-management.conf
PROXY_CONFIG=/etc/nginx/snippets/makanapp-management-proxy.conf
CERT_DIR=/etc/letsencrypt/live/management.makanapp.org

# Upload the complete project before running this installer.
for required in Dockerfile compose.yaml package.json package-lock.json .env.docker.example scripts/docker-start.mjs; do
    if [[ ! -f "$PROJECT_DIR/$required" ]]; then
        echo "Missing $PROJECT_DIR/$required. Upload the complete project first." >&2
        exit 1
    fi
done

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

apt-get update
apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade
apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install nginx ufw certbot python3-certbot-nginx python3 curl

# Keep an existing Docker installation; install missing Ubuntu packages only.
if ! command -v docker >/dev/null 2>&1; then
    apt-get install -y docker.io
fi
if ! docker compose version >/dev/null 2>&1; then
    apt-get install -y docker-compose-v2
fi
if ! docker buildx version >/dev/null 2>&1; then
    apt-get install -y docker-buildx
fi
systemctl enable --now docker
docker compose version
docker buildx version

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

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

# Publish Nginx only after Docker reports the application healthy.
install -d -m 755 /etc/nginx/snippets
cat > "$PROXY_CONFIG" <<'NGINX'
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

cat > "$SITE_CONFIG" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name management.makanapp.org;
NGINX

# Keep HTTPS available on repeat runs, including when Certbot cannot renew.
if [[ -s "$CERT_DIR/fullchain.pem" && -s "$CERT_DIR/privkey.pem" ]]; then
    cat >> "$SITE_CONFIG" <<'NGINX'
    return 301 https://management.makanapp.org$request_uri;
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name management.makanapp.org;
    ssl_certificate /etc/letsencrypt/live/management.makanapp.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/management.makanapp.org/privkey.pem;
NGINX
    if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
        echo '    include /etc/letsencrypt/options-ssl-nginx.conf;' >> "$SITE_CONFIG"
    else
        echo '    ssl_protocols TLSv1.2 TLSv1.3;' >> "$SITE_CONFIG"
    fi
fi
cat >> "$SITE_CONFIG" <<'NGINX'
    include /etc/nginx/snippets/makanapp-management-proxy.conf;
}
NGINX
chmod 644 "$SITE_CONFIG" "$PROXY_CONFIG"

rm -f /etc/nginx/sites-enabled/default
ln -sfn "$SITE_CONFIG" /etc/nginx/sites-enabled/makanapp-management.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

certbot --nginx --non-interactive --agree-tos --redirect -m rastinaxoffice@gmail.com -d management.makanapp.org --cert-name management.makanapp.org
systemctl enable --now certbot.timer
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --output /dev/null https://management.makanapp.org/login

echo 'Setup complete: https://management.makanapp.org'
