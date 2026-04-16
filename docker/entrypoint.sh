#!/bin/sh
# =============================================================
# entrypoint.sh — Tiquettes
# Génère les fichiers constants.*.php depuis les variables
# d'environnement, attend la DB, puis démarre supervisord.
# =============================================================
set -e

# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
log() { echo "[entrypoint] $*"; }

bool_php() {
    # Convertit "true"/"1"/"yes" en "true" PHP, tout le reste en "false"
    case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
        true|1|yes) echo "true" ;;
        *)          echo "false" ;;
    esac
}

# ──────────────────────────────────────────────────────────────
# Valeurs par défaut des variables d'environnement
# ──────────────────────────────────────────────────────────────
MYSQL_HOST="${MYSQL_HOST:-db}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_BASE="${MYSQL_BASE:-tiquettes}"
MYSQL_USER="${MYSQL_USER:-tiquettes}"
MYSQL_PASS="${MYSQL_PASS:-changeme}"

SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_AUTH="$(bool_php "${SMTP_AUTH:-false}")"
SMTP_USERNAME="${SMTP_USERNAME:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_SECURE="${SMTP_SECURE:-}"
SMTP_FROM="${SMTP_FROM:-}"

STATS_IGNORE_LOCALHOST="$(bool_php "${STATS_IGNORE_LOCALHOST:-false}")"
STATS_VISITS_INTERVAL="${STATS_VISITS_INTERVAL:-30 minutes}"

# Hostname nu (sans scheme) exposé pour la validation du Referer PHP
APP_HOSTNAME="${APP_HOSTNAME:-localhost}"

# ──────────────────────────────────────────────────────────────
# Génération des fichiers constants.*.php
# Les deux fichiers (development + production) reçoivent les
# mêmes credentials afin qu'un appel avec ?m=development ne
# soit pas refusé silencieusement en cas de configuration mixte.
# ──────────────────────────────────────────────────────────────
generate_constants() {
    local MODE="$1"
    local DEST="/var/www/api/libs/constants.${MODE}.php"

    log "Génération de ${DEST}..."

    cat > "$DEST" << PHPEOF
<?php
// Auto-généré par docker/entrypoint.sh au démarrage du conteneur.
// Ne pas éditer manuellement.

// Base de données
define('MYSQL_HOST', '${MYSQL_HOST}');
define('MYSQL_PORT', '${MYSQL_PORT}');
define('MYSQL_BASE', '${MYSQL_BASE}');
define('MYSQL_USER', '${MYSQL_USER}');
define('MYSQL_PASS', '${MYSQL_PASS}');

// SMTP (optionnel)
define('SMTP_HOST',     '${SMTP_HOST}');
define('SMTP_PORT',     ${SMTP_PORT});
define('SMTP_AUTH',     ${SMTP_AUTH});
define('SMTP_USERNAME', '${SMTP_USERNAME}');
define('SMTP_PASSWORD', '${SMTP_PASSWORD}');
define('SMTP_SECURE',   '${SMTP_SECURE}');
define('SMTP_FROM',     '${SMTP_FROM}');

// Statistiques
define('STATS_IGNORE_LOCALHOST', ${STATS_IGNORE_LOCALHOST});
define('STATS_VISITS_INTERVAL',  '${STATS_VISITS_INTERVAL}');

// Hôtes autorisés pour la validation du Referer (ajoutés à la liste par défaut)
define('ALLOWED_HOSTS', [
    '${APP_HOSTNAME}',
]);
PHPEOF

    chown www-data:www-data "$DEST"
    chmod 640 "$DEST"
    log "${DEST} généré."
}

generate_constants "production"
generate_constants "development"

# ──────────────────────────────────────────────────────────────
# Attente de la disponibilité de la base de données
# ──────────────────────────────────────────────────────────────
log "Attente de la base de données ${MYSQL_HOST}:${MYSQL_PORT}..."
MAX_TRIES=30
TRIES=0
until php -r "
    try {
        new PDO(
            'mysql:host=${MYSQL_HOST};port=${MYSQL_PORT};dbname=${MYSQL_BASE}',
            '${MYSQL_USER}',
            '${MYSQL_PASS}'
        );
        exit(0);
    } catch (PDOException \$e) {
        exit(1);
    }
" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        log "ERREUR : la base de données n'est pas disponible après ${MAX_TRIES} tentatives."
        log "Vérifiez MYSQL_HOST, MYSQL_PORT, MYSQL_BASE, MYSQL_USER, MYSQL_PASS."
        exit 1
    fi
    log "Base de données non prête, nouvelle tentative dans 2 s... (${TRIES}/${MAX_TRIES})"
    sleep 2
done
log "Base de données disponible."

# ──────────────────────────────────────────────────────────────
# Démarrage des services via supervisord
# ──────────────────────────────────────────────────────────────
log "Démarrage des services (Nginx + PHP-FPM)..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
