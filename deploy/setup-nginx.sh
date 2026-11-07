#!/bin/bash
set -e

echo "=== GOOLIX Nginx Security & Web Setup ==="

# 1. Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "[+] Installing Nginx..."
    apt update -y
    apt install -y nginx
fi

# 2. Disable default site
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "[+] Removing default Nginx site..."
    rm -f /etc/nginx/sites-enabled/default
fi

# 3. Copy Goolix Nginx Config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SOURCE="$SCRIPT_DIR/nginx/goolix.conf"

if [ -f "$CONF_SOURCE" ]; then
    echo "[+] Deploying Nginx config from $CONF_SOURCE to /etc/nginx/conf.d/goolix.conf..."
    cp "$CONF_SOURCE" /etc/nginx/conf.d/goolix.conf
else
    echo "[!] Error: $CONF_SOURCE not found!"
    exit 1
fi

# 4. Verify Nginx Syntax
echo "[+] Validating Nginx configuration..."
nginx -t

# 5. Enable and Restart Nginx
echo "[+] Restarting Nginx service..."
systemctl enable nginx
systemctl restart nginx

echo "=== Nginx Setup Completed Successfully ==="
systemctl status nginx --no-pager
