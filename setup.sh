#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MODE="${1:-deploy}"
case "$MODE" in
    deploy|--repair|--update|--start|--ssl-only|--diagnose) ;;
    --help|-h)
        cat <<'HELP'
Usage: sudo bash setup.sh [--update|--start|--repair|--ssl-only|--diagnose]

Default       Install missing dependencies, configure HTTPS, build and run the panel.
--update      Build and deploy code updates; preserve existing Nginx and TLS settings.
--start       Start the existing image without rebuilding or changing Nginx/TLS.
--repair      Rebuild the panel and repair this domain's Nginx/TLS configuration.
--ssl-only    Repair this domain's HTTPS without rebuilding the application.
--diagnose    Print a read-only diagnostic report.

Upload the complete project to /var/www/makanapp/management first.
Release inputs: vNext-20261105 (manager memberships, exact provisioning lookup and typed education).
Build modes back up private settings and retain the prior management image when available.
Rollback: sudo docker image tag makan-management-panel:previous makan-management-panel:local
          sudo bash setup.sh --start
Public URL: https://management.makanapp.org/login
HELP
        exit 0
        ;;
    *) echo 'Usage: sudo bash setup.sh [--update|--start|--repair|--ssl-only|--diagnose]' >&2; exit 1 ;;
esac
if [[ "$#" -gt 1 ]]; then
    echo 'Too many arguments.' >&2
    exit 1
fi
if [[ "${EUID}" -ne 0 ]]; then
    echo 'Run this script as root: sudo bash setup.sh [--update|--start|--repair|--ssl-only|--diagnose]' >&2
    exit 1
fi

DOMAIN=management.makanapp.org
SSL_EMAIL=rastinaxoffice@gmail.com
PROJECT_DIR=/var/www/makanapp/management
ENV_FILE="$PROJECT_DIR/.env.docker"
COMPOSE_PROJECT=makan-management-panel
MANAGEMENT_PORT=3101
SITE_CONFIG=/etc/nginx/sites-available/makanapp-management.conf
ENABLED_SITE=/etc/nginx/sites-enabled/makanapp-management.conf
PROXY_CONFIG=/etc/nginx/snippets/makanapp-management-proxy.conf
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
ACME_ROOT=/var/www/letsencrypt
TLS_CHAIN=
SSL_BACKUP=
DEPLOY_BACKUP=

check_project_inputs() {
    local required
    for required in Dockerfile compose.yaml package.json package-lock.json .env.docker.example \
        next.config.ts tsconfig.json postcss.config.mjs contracts/platform-permissions.json \
        scripts/docker-start.mjs src/app/api/health/route.ts \
        src/app/login/page.tsx src/features/auth/login.tsx \
        src/features/personal-classes/pages.tsx src/features/personal-classes/review.tsx \
        src/app/api/realtime/route.ts src/lib/personal-class-policy.ts \
        src/generated/api/contract.json \
        src/features/personal-classes/membership-picker.tsx src/lib/personal-class-context.ts \
        'src/app/(protected)/admin/[[...section]]/page.tsx'; do
        if [[ ! -f "$PROJECT_DIR/$required" ]]; then
            echo "Missing $PROJECT_DIR/$required. Upload the complete project first." >&2
            return 1
        fi
    done
    if [[ ! -d "$PROJECT_DIR/public" ]]; then
        echo "Missing $PROJECT_DIR/public. Upload the complete public assets folder first." >&2
        return 1
    fi
    if ! grep -Fq 'data-application="makan-management-panel"' "$PROJECT_DIR/src/features/auth/login.tsx"; then
        echo 'Wrong source: the owner management login is missing. Upload MakanManagement, not the web app.' >&2
        return 1
    fi
}

snapshot_settings() {
    install -d -m 700 /var/backups/makanapp-management
    DEPLOY_BACKUP=$(mktemp -d /var/backups/makanapp-management/app.XXXXXX)
    cp -p "$ENV_FILE" "$DEPLOY_BACKUP/env.before"
    cp "$PROJECT_DIR/compose.yaml" "$DEPLOY_BACKUP/compose.yaml"
    chmod 600 "$DEPLOY_BACKUP/env.before" "$DEPLOY_BACKUP/compose.yaml"
    printf '%s\n' 'vNext-20261105' > "$DEPLOY_BACKUP/release"
    echo "Private deployment backup: $DEPLOY_BACKUP"
}

retain_previous_image() {
    local metadata previous
    # Inspect only identity and application labels; never print image environment values.
    if ! metadata=$(docker image inspect --format \
        '{"id":{{json .Id}},"labels":{{json .Config.Labels}}}' "$COMPOSE_PROJECT:local" 2>/dev/null); then
        echo 'No previous local management image; image rollback is unavailable for this installation.'
        return 0
    fi
    previous=$(python3 -c '
import json, re, sys
try:
    value = json.load(sys.stdin)
except (ValueError, TypeError):
    sys.exit("Cannot verify the previous management image.")
image = value.get("id", "")
if (not re.fullmatch(r"sha256:[a-f0-9]{64}", image)
        or (value.get("labels") or {}).get("org.makan.application") != "makan-management-panel"):
    sys.exit("Existing management image has an unexpected identity; refusing to replace its rollback tag.")
print(image)
' <<< "$metadata")
    docker image tag "$previous" "$COMPOSE_PROJECT:previous"
    printf '%s\n' "$previous" > "$DEPLOY_BACKUP/previous-image-id"
    echo 'Rollback image retained: makan-management-panel:previous'
}

check_management_port() {
    local metadata= container_ids
    local -a containers=()
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        container_ids=$(docker ps -aq)
        if [[ -n "$container_ids" ]]; then
            read -r -a containers <<< "${container_ids//$'\n'/ }"
            # Inspect only ownership and ports, never environment values.
            metadata=$(docker inspect --format \
                '{"name":{{json .Name}},"running":{{json .State.Running}},"labels":{{json .Config.Labels}},"ports":{{json .HostConfig.PortBindings}}}' \
                "${containers[@]}")
        fi
    fi
    python3 - "$COMPOSE_PROJECT" "$MANAGEMENT_PORT" 3<<< "$metadata" <<'PYTHON'
import errno
import json
import os
import socket
import sys

project, port = sys.argv[1], int(sys.argv[2])
owned_listener = False
for line in os.fdopen(3):
    if not line.strip():
        continue
    container = json.loads(line)
    labels = container.get('labels') or {}
    own_project = labels.get('com.docker.compose.project') == project
    own_app = own_project and labels.get('org.makan.application') == project
    if own_project and not own_app:
        sys.exit(f'Docker project {project} is already used by another application; no containers were changed.')
    if not container.get('running'):
        continue
    for target, bindings in (container.get('ports') or {}).items():
        for binding in bindings or []:
            if binding.get('HostPort') != str(port):
                continue
            if (own_app and labels.get('com.docker.compose.service') == 'web'
                    and target == '3000/tcp' and binding.get('HostIp') == '127.0.0.1'):
                owned_listener = True
            else:
                sys.exit(f'Management port {port} belongs to {container["name"]}; no service was stopped or replaced.')
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
    # A recently stopped server can leave TIME_WAIT sockets behind. They do not
    # represent another active service, and Docker's TCP listener can reuse them.
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        listener.bind(('127.0.0.1', port))
    except OSError as error:
        if error.errno != errno.EADDRINUSE or not owned_listener:
            sys.exit(f'Cannot safely use management port {port}: {error}. No service was stopped or replaced.')
print(f'Management port {port}: available or owned by {project}.')
PYTHON
}

check_management_identity() {
    curl --fail --silent --show-error --noproxy '*' --connect-timeout 5 --max-time 15 "$@" | \
        python3 -c '
import json, sys
try:
    body = json.load(sys.stdin)
except (ValueError, TypeError):
    sys.exit("Unexpected application response: management identity could not be verified.")
sys.exit(0 if body == {"application": "makan-management-panel", "status": "ok"}
         else "Unexpected application: refusing to accept the web app as the management panel.")
'
}

check_management_login() {
    curl --fail --silent --show-error --noproxy '*' --connect-timeout 5 --max-time 15 "$@" | \
        python3 -c '
from html.parser import HTMLParser
import sys

class OwnerLogin(HTMLParser):
    found = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if (attrs.get("data-application") == "makan-management-panel"
                and attrs.get("data-screen") == "owner-login"):
            self.found = True

page = OwnerLogin()
page.feed(sys.stdin.read())
sys.exit(0 if page.found else
         "Wrong login page: management is serving another app or an old image. Check the uploaded source and duplicate Nginx server_name entries.")
'
}

reload_nginx() {
    local validation
    if ! validation=$(nginx -t 2>&1); then
        printf '%s\n' "$validation" >&2
        return 1
    fi
    printf '%s\n' "$validation"
    if [[ "$validation" == *'conflicting server name "management.makanapp.org"'* ]]; then
        echo 'Duplicate management.makanapp.org virtual host. Run setup.sh --diagnose and keep this domain in one active site only.' >&2
        return 1
    fi
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
    local candidate name target staged entry_redirect https_status attempt
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
    for candidate in "$CERT_DIR/fullchain.pem" "$CERT_DIR"-*/fullchain.pem; do
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
client_max_body_size 21m;

location = / {
    return 302 /login$is_args$args;
}
location / {
NGINX
    printf '    proxy_pass http://127.0.0.1:%s;\n' "$MANAGEMENT_PORT" >> "$staged"
    cat >> "$staged" <<'NGINX'
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
    # A successful reload returns before the new workers accept connections.
    # Retry the verified handshake briefly while old workers leave the listener.
    for attempt in {1..10}; do
        if https_status=$(curl --silent --show-error --noproxy '*' --connect-timeout 3 --max-time 5 \
            --resolve "$DOMAIN:443:127.0.0.1" --output /dev/null \
            --write-out '%{http_code}' "https://$DOMAIN/login" 2>&1); then
            break
        fi
        if [[ "$attempt" -eq 10 ]]; then
            printf '%s\n' "$https_status" >&2
            rollback_ssl 1
        fi
        sleep 1
    done
    entry_redirect=$(curl --silent --show-error --noproxy '*' --connect-timeout 10 --max-time 30 \
        --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null \
        --write-out '%{redirect_url}' "http://$DOMAIN/")
    if [[ "$entry_redirect" != "https://$DOMAIN/" ]]; then
        echo 'Management HTTP root is not redirecting to the same URL over HTTPS. Check duplicate server_name entries.' >&2
        rollback_ssl 1
    fi
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
    if [[ "$https_status" != 200 ]]; then
        echo "TLS is valid, but management /login returned HTTP $https_status. Check the application with: sudo bash setup.sh --diagnose" >&2
    fi
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
        ss -ltnp "( sport = :80 or sport = :443 or sport = :$MANAGEMENT_PORT )" || true
    fi
    echo '--- Management Docker containers ---'
    if command -v docker >/dev/null 2>&1; then
        docker ps -a --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" \
            --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
    else
        echo 'Docker is not installed.'
    fi
    if command -v curl >/dev/null 2>&1; then
        echo '--- Direct application response ---'
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --output /dev/null --write-out 'Upstream /login: HTTP %{http_code}\n' \
            -H "Host: $DOMAIN" "http://127.0.0.1:$MANAGEMENT_PORT/login" || true
        echo '--- Management application identity ---'
        check_management_identity "http://127.0.0.1:$MANAGEMENT_PORT/api/health" && \
            echo "Identity verified: $COMPOSE_PROJECT" || true
        echo '--- Local Nginx responses for the management hostname ---'
        curl --silent --show-error --connect-timeout 3 --max-time 8 \
            --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null \
            --write-out 'Local HTTP /: %{http_code}; redirect: %{redirect_url}\n' \
            "http://$DOMAIN/" || true
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

if [[ "$MODE" != --ssl-only ]]; then
    check_project_inputs
    install -d -m 755 /var/www/makanapp "$PROJECT_DIR"
    echo "Deploying management panel: project=$COMPOSE_PROJECT; upstream=127.0.0.1:$MANAGEMENT_PORT"
fi

if [[ "$MODE" == deploy ]]; then
    apt-get update
    apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" install nginx ufw certbot python3-certbot-nginx python3 openssl ca-certificates curl
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
else
    # Repair without a system upgrade or restarting existing applications.
    missing=0
    for dependency in nginx certbot openssl curl python3; do
        if ! command -v "$dependency" >/dev/null 2>&1; then missing=1; fi
    done
    if [[ "$missing" -eq 1 ]]; then
        apt-get update
        apt-get install -y nginx certbot openssl ca-certificates curl python3
    fi
    if [[ "$MODE" != --update && "$MODE" != --start ]] && command -v ufw >/dev/null 2>&1; then
        ufw allow 'Nginx Full'
    fi
fi

if [[ "$MODE" == --ssl-only ]]; then
    check_management_port
    configure_ssl
    exit 0
fi

# Keep an existing Docker installation; install missing Ubuntu packages only.
if ! command -v docker >/dev/null 2>&1; then apt-get install -y docker.io; fi
if ! docker compose version >/dev/null 2>&1; then apt-get install -y docker-compose-v2; fi
if ! docker buildx version >/dev/null 2>&1; then apt-get install -y docker-buildx; fi
systemctl enable --now docker
docker compose version
docker buildx version
check_management_port

if [[ ! -f "$ENV_FILE" ]]; then
    # A missing file in an existing installation is not a request to rotate the key.
    existing_management=$(docker ps -aq \
        --filter "label=com.docker.compose.project=$COMPOSE_PROJECT" \
        --filter 'label=com.docker.compose.service=web')
    if [[ -n "$existing_management" ]]; then
        echo 'Existing management installation has no .env.docker. Restore its private settings from backup before updating; refusing to replace the session key.' >&2
        exit 1
    fi
    install -m 600 "$PROJECT_DIR/.env.docker.example" "$ENV_FILE"
fi
chown root:root "$ENV_FILE"
chmod 600 "$ENV_FILE"
if [[ "$MODE" != --start ]]; then snapshot_settings; fi

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
    'MAKAN_PORT': '3101',
    'COMPOSE_PROJECT_NAME': 'makan-management-panel',
}
# Migrate only the old unported origin; preserve deliberately configured alternatives.
if settings.get('BACKEND_BASE_URL', '').strip("\"'") in ('', 'http://94.184.32.84', 'http://94.184.32.84/'):
    updates['BACKEND_BASE_URL'] = 'http://94.184.32.84:8090'

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
if [[ -n "$DEPLOY_BACKUP" ]]; then
    cp -p "$ENV_FILE" "$DEPLOY_BACKUP/env.deployed"
    chmod 600 "$DEPLOY_BACKUP/env.deployed"
fi

cd "$PROJECT_DIR"
# Match the loopback upstream even when the invoking shell has MAKAN_PORT set.
export MAKAN_PORT="$MANAGEMENT_PORT"
COMPOSE=(docker compose --project-name "$COMPOSE_PROJECT" --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/compose.yaml" --env-file "$ENV_FILE")
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" config --format json | python3 -c '
import json, sys
config = json.load(sys.stdin)
web = config["services"]["web"]
ports = web.get("ports", [])
volumes = web.get("volumes", [])
valid = (
    config["name"] == "makan-management-panel"
    and web["image"] == "makan-management-panel:local"
    and web.get("labels", {}).get("org.makan.application") == "makan-management-panel"
    and len(ports) == 1 and ports[0].get("host_ip") == "127.0.0.1"
    and str(ports[0].get("published")) == "3101" and ports[0].get("target") == 3000
    and any(v.get("source") == "management_sessions" and v.get("target") == "/app/.makan-sessions" for v in volumes)
    and config["volumes"]["management_sessions"]["name"] == "makan-management-panel_management_sessions"
)
sys.exit(0 if valid else "Deployment configuration is not isolated for the management panel. Upload the current project files.")
'

# TLS repair is separate from routine updates and restarts.
if [[ "$MODE" == deploy || "$MODE" == --repair ]]; then configure_ssl; fi
if [[ "$MODE" == --start ]]; then
    "${COMPOSE[@]}" up -d --no-build --pull never --wait --wait-timeout 240 web
else
    retain_previous_image
    "${COMPOSE[@]}" build web
    if [[ "$MODE" == --repair ]]; then
        "${COMPOSE[@]}" up -d --force-recreate --wait --wait-timeout 240 web
    else
        "${COMPOSE[@]}" up -d --no-build --wait --wait-timeout 240 web
    fi
fi

check_management_identity "http://127.0.0.1:$MANAGEMENT_PORT/api/health"
check_management_identity --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health"
check_management_identity "https://$DOMAIN/api/health"
check_management_login "http://127.0.0.1:$MANAGEMENT_PORT/login"
check_management_login --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/login"
check_management_login "https://$DOMAIN/login"

echo 'Setup complete: https://management.makanapp.org/login'
