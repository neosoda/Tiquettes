# VPanel — Architecture & Produit

> Version cible : **3.0.0** · Statut actuel : **2.2.7 stabilisé**  
> Audience : solo builder / contributeur entrant

---

## 1. VERSION PRODUIT

### Positionnement

**Outil SaaS/standalone de conception de tableaux électriques — du câblage au PDF réglementaire en 5 minutes.**

### Cible

| Segment | Profil | Priorité |
|---------|--------|----------|
| Primaire | Électriciens indépendants, TPE électricité (1-10 personnes) | P1 |
| Secondaire | Bureaux d'études électricité, techniciens maintenance industrielle | P2 |
| Tertiaire | Auto-constructeurs compétents, formateurs habilitation électrique | P3 |

### Proposition de valeur

Le seul générateur web français qui produit en un clic **étiquettes + schéma unifilaire + nomenclature NFC** — sans installation, sans compte, directement exportable en PDF imprimable.

### Modèle économique

| Tier | Prix | Limites | Différenciant |
|------|------|---------|---------------|
| Free (actuel) | 0 € | Standalone, pas de cloud | Toujours disponible, AGPL |
| Pro | 14 €/mois | Cloud illimité, partage, templates | Persistance + collaboration |
| Entreprise | 49 €/mois | Multi-users, API, rapports | Intégration bureau d'études |

---

## 2. FONCTIONNALITÉS

### MVP stabilisé (v2.2.x — actuel + corrections)

- Création/édition tableau électrique (jusqu'à 15 rangées × 13/18/24 modules)
- Identification modules : fonction, courant, pôle, section conducteur, ligne, groupe couleur
- Génération PDF : étiquettes + schéma unifilaire + nomenclature
- Thèmes personnalisables avec éditeur intégré
- Import/export JSON (format versionné, migration automatique)
- Monitoring espace libre NFC 15-100 (alerte < 20%)
- PWA installable offline
- Schéma unifilaire avec hiérarchie parent/contacteur/folio

### Version complète (roadmap v3.x)

- Auth JWT (infrastructure déjà en place — à activer)
- Stockage cloud projets (load.php/save.php — stubs créés)
- Templates projets (studio, T2, T3, bureau, industriel)
- Partage lecture-seule par lien tokenisé
- Historique 5 versions par projet
- API REST documentée (OpenAPI)
- Export DXF (AutoCAD) pour bureaux d'études
- Collaboration temps réel (WebSocket)

---

## 3. WORKFLOWS MÉTIER

### WF-1 : Nouveau projet (standalone — flux principal)

```
INIT
 └─ CRÉER(nom, rangées, modules/rangée, hauteur)
     └─ ÉDITER modules (click → Editor popup)
         ├─ RENSEIGNER (id, fonction, courant, pôle, fil, texte, icône)
         └─ VALIDER
             ├─ OK → mise à jour switchboard, auto-save sessionStorage 1s
             └─ ERREUR → afficher erreurs inline dans l'éditeur
 └─ EXPORTER JSON (version++, téléchargement)
 └─ IMPRIMER PDF
     ├─ CONFIGURER (étiquettes / schéma / nomenclature, format, thème)
     └─ POST → toPdf.php → PDF affiché dans nouvel onglet
```

### WF-2 : Import projet existant

```
CHOISIR FICHIER (.json)
 └─ VALIDER version (satisfies semver range)
 └─ MIGRER (propriétés manquantes selon version source)
 └─ AUTO-ID (déduplication identifiants)
 └─ CHARGER → remplace le projet courant
```

### WF-3 : Génération PDF

```
OUVRIR menu impression
 └─ SÉLECTIONNER sections (étiquettes / schéma / nomenclature / page de garde)
 └─ CONFIGURER (format A4/A3, traits de coupe, courants, grille schéma)
 └─ CONFIRMER (avertissement échelle 100%)
     └─ POST form → toPdf.php (JSON switchboard + printOptions)
         ├─ OK → PDF inline dans nouvel onglet
         └─ ERREUR PHP → page d'erreur
```

### WF-4 : Scan QR/NFC module

```
OUVRIR scanner
 └─ SCANNER code (caméra)
     └─ DÉCODER moduleId
         ├─ TROUVÉ → ouvrir Editor sur ce module
         └─ INTROUVABLE → message d'erreur
```

### États module

| État | Condition |
|------|-----------|
| `free` | Aucune donnée, slot vide |
| `partial` | ID seul, pas de fonction |
| `defined` | ID + fonction + courant renseignés |
| `invalid` | Incohérence détectée (pole/wire mismatch) |

### États projet

| État | Condition |
|------|-----------|
| `draft` | Non exporté depuis la dernière modification |
| `exported` | JSON exporté, version à jour |
| `printed` | PDF généré depuis la dernière version |

### Transitions cloud (v3.x)

```
anonymous → register → free
free → subscribe → pro
pro → cancel → free (pas de downgrade immédiat, fin de période)
free/pro → share(token) → read-only access for recipient
```

---

## 4. MODÈLE DE DONNÉES

### 4.1 Fichier projet JSON (format canonique v2.2+)

```json
{
  "prjid": "uuid-v4",
  "prjname": "string (max 255)",
  "prjcreated": "ISO8601",
  "prjupdated": "ISO8601",
  "prjversion": 1,
  "appversion": "semver (ex: 2.2.7)",
  "projectType": "R | T | I | O",
  "vref": 230,
  "height": 29,
  "stepsPerRows": 13,
  "stepSize": 18,
  "withDb": false,
  "withGroundLine": false,
  "schemaMonitor": false,
  "switchboardMonitor": false,
  "summaryColumnRow": false,
  "summaryColumnPosition": false,
  "summaryColumnType": true,
  "summaryColumnId": true,
  "summaryColumnFunction": true,
  "summaryColumnLabel": true,
  "summaryColumnDescription": true,
  "theme": { "...ThemeObject" },
  "db": { "...ModuleObject" },
  "rows": [["...ModuleObject"]]
}
```

### 4.2 Module (canonique)

```json
{
  "id": "Q1",
  "free": false,
  "span": 1,
  "half": "none | left | right",
  "func": "q | i | dd | id | kc | sw | prd | fus | trf | cpt | pc | o | db",
  "type": "A | B | C | S | ''",
  "crb": "C60 | ...",
  "modtype": "string",
  "current": "16A | ...",
  "sensibility": "30mA | 100mA | 300mA | 500mA | ''",
  "pole": "1P | 1P+N | 3P | 3P+N | 4P | ''",
  "wire": "1.5 | 2.5 | 4 | 6 | 10 | 16 | ... | Automatique | Inconnue | ''",
  "line": "L1 | L2 | L3 | N | ''",
  "coef": 0.5,
  "grp": "color-group-key | ''",
  "parentId": "module-id | ''",
  "kcId": "id1|id2 | ''",
  "partialKc": false,
  "icon": "filename.svg | null",
  "text": "string (multiline, max 3 lignes)",
  "desc": "string"
}
```

### 4.3 Thème (canonique)

```json
{
  "name": "custom|NomDuTheme",
  "group": "Créations",
  "title": "Mon Thème",
  "default": false,
  "data": {
    "label": {
      "backColor": [255, 255, 255],
      "borderColor": [0, 0, 0],
      "borderWidth": 0.5
    },
    "text": { "color": [0,0,0], "fontName": "Arial", "fontSize": 12 },
    "icon": { "width": 20, "height": 20, "align": "center" }
  }
}
```

### 4.4 SQLite — Analytics (existant, opérationnel)

```sql
stats_visits            (id, ip, country, city, type, struct, url, ua, rfr, datetime)
stats_visits_details    (id, visit_id, date, counters JSON)
stats_action_web        (date PK, struct, counters JSON)
stats_action_app        (date PK, struct, counters JSON)
stats_allowed_structs   (id, key UNIQUE, description)
stats_allowed_actions   (id, key UNIQUE, description)
stats_allowed_choices   (id, key UNIQUE, description)
```

### 4.5 SQLite — Cloud projects (à implémenter pour v3.x)

```sql
CREATE TABLE users (
  id           TEXT PRIMARY KEY,              -- UUID v4
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,               -- Argon2id
  display_name TEXT,
  plan         TEXT NOT NULL DEFAULT 'free', -- free | pro | enterprise
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login   DATETIME
);

CREATE TABLE projects (
  id           TEXT PRIMARY KEY,             -- prjid (UUID v4)
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  data         TEXT NOT NULL,               -- JSON blob (switchboard complet)
  print_options TEXT,                       -- JSON blob
  app_version  TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME                     -- soft delete
);

CREATE TABLE project_shares (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token        TEXT UNIQUE NOT NULL,        -- 32 bytes URL-safe random
  access       TEXT NOT NULL DEFAULT 'read', -- read | write
  expires_at   DATETIME,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT UNIQUE NOT NULL,        -- SHA-256 du refresh token
  expires_at   DATETIME NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at   DATETIME
);

CREATE INDEX idx_projects_user    ON projects(user_id, deleted_at);
CREATE INDEX idx_shares_token     ON project_shares(token);
CREATE INDEX idx_tokens_user      ON auth_tokens(user_id, revoked_at);
```

---

## 5. ARCHITECTURE TECHNIQUE

### Stack (invariante)

| Couche | Technologie | Justification |
|--------|------------|---------------|
| Frontend | React 19 + Vite 7 | En place, stable |
| Backend | PHP 8.2+ | En place, PDF/SQLite natif |
| PDF | FPDF 1.86 + ImageMagick | En place, éprouvé |
| Base de données | SQLite | Zéro infrastructure, suffisant |
| Conteneur | Docker Alpine + nginx + PHP-FPM | En place |
| Auth | JWT (RS256) + Argon2id | Infra présente, à activer |

### Structure fichiers frontend (cible v3.0)

```
src/
  hooks/
    useSwitchboard.js       # État tableau + toutes les mutations
    usePrintOptions.js      # Options impression + persistance session
    useClipboard.js         # Copier / couper / coller / intervertir
    useSpaceMonitor.js      # Calcul monitoring NFC + alertes
  utils/
    switchboardMigration.js # Migration inter-versions (testable isolément)
    moduleValidation.js     # Validation métier modules
    color.js                # (existant)
    colorSolver.js          # (existant)
    generateDisplayName.js  # (existant)
  components/
    editor/
      Editor.jsx
      EditorFunctionSelector.jsx
      EditorTypeSelector.jsx
      EditorCurrentSelector.jsx
      EditorPoleSelector.jsx
      EditorWireSelector.jsx
      EditorLineSelector.jsx
      EditorSensibilitySelector.jsx
      EditorCrbSelector.jsx
      EditorParentSelector.jsx
      EditorContactSelector.jsx
      EditorContactAsservSelector.jsx
    schema/
      SchemaTab.jsx
      SchemaItem.jsx
      SchemaSymbol.jsx
      SchemaDescription.jsx
    summary/
      SummaryTab.jsx
    module/
      Module.jsx
      Row.jsx
    theme/
      ThemeEditorPopup.jsx
      ThemeEngine.jsx
      TextPartStyleEditor.jsx
      IconPartStyleEditor.jsx
    popups/
      WelcomePopup.jsx
      NewProjectEditor.jsx
      LoadingPopup.jsx
      LoadingErrorPopup.jsx
      NewVersionPopup.jsx
    common/
      Popup.jsx
      ContentEditable.jsx
      GroupColorSelector.jsx
      GroupColorSelectorItem.jsx
      GroupColorSelectorSeparator.jsx
      GroupColorChooser.jsx
      HorizontalRule.jsx
      VerticalRule.jsx
      IconSelector.jsx
      IconSelectorItem.jsx
      PasswordInput.jsx
    scanner/
      ScannerWorkflow.jsx  (existant)
  App.jsx                  # Orchestrateur < 400 lignes (cible)
  main.jsx
  ErrorBoundary.jsx        # Empêche écran blanc en production
  SpaceProvider.jsx
  SpaceContext.jsx
```

### Structure backend PHP (cible v3.0)

```
public/api/
  toPdf.php             # Génération PDF (existant, inchangé)
  health.php            # Health check (existant, amélioré)
  stats.php             # Setup analytics SQLite (existant)
  action.php            # Log actions (existant)
  choices.php           # Log choix (existant)
  visit.php             # Log visites (existant)
  reports.php           # Rapports analytics (existant)
  resume.php            # Stats résumé (existant)
  myip.php              # IP + géolocalisation (existant)

  # À implémenter (v3.x — Cloud + Auth)
  auth/
    login.php           # POST {email, password} → {access_token, refresh_token}
    register.php        # POST {email, password, name} → user créé
    refresh.php         # POST {refresh_token} → {access_token}
    logout.php          # POST → révocation refresh token
  projects/
    list.php            # GET (auth) → [{id, name, updated_at}]
    load.php            # GET ?id= (auth) → projet complet
    save.php            # POST (auth) {switchboard, printOptions} → {id}
    delete.php          # DELETE ?id= (auth) → soft delete
  shares/
    create.php          # POST (auth) {project_id, access, expires} → {token}
    load.php            # GET ?token= → projet lecture seule (sans auth)
  libs/
    config.php          # (existant, amélioré)
    jwt_middleware.php  # À créer : validation JWT sur routes protégées
    rate_limiter.php    # À créer : limitation par IP via SQLite
```

### App.jsx : refactorisation cible

**Avant (actuel) :** 2 474 lignes, 50+ fonctions dans un seul composant.

**Après (cible) :** < 400 lignes. App.jsx ne fait qu'orchestrer :

```jsx
function App() {
  const swb  = useSwitchboard();        // état + mutations
  const po   = usePrintOptions();       // options impression
  const clip = useClipboard(swb);       // clipboard
  const mon  = useSpaceMonitor(swb.switchboard); // NFC monitoring

  // UI state local (tabs, modals, menus) → reste dans App.jsx
  // Render → délègue à sous-composants
}
```

---

## 6. SÉCURITÉ

### Authentification (v3.x)

- **Access token** : JWT RS256, TTL 15 min, payload `{sub: userId, plan}`
- **Refresh token** : 32 bytes random, hashé SHA-256 en base, TTL 30 jours, httpOnly cookie
- **Pas de localStorage** pour les tokens (XSS protection)
- **Rotation** : chaque refresh génère un nouveau pair access + refresh

### Rôles et permissions

| Action | anonymous | free | pro | enterprise |
|--------|-----------|------|-----|------------|
| Créer / éditer projet local | ✓ | ✓ | ✓ | ✓ |
| Exporter PDF | ✓ | ✓ | ✓ | ✓ |
| Cloud save (projets) | — | 5 max | illimité | illimité |
| Partager par lien | — | — | ✓ | ✓ |
| Accès templates | — | — | ✓ | ✓ |
| API REST (key) | — | — | — | ✓ |
| Dashboard admin | — | — | — | ✓ |

### Sécurité PHP backend

**CORS :**
```php
// Production : valider l'origine contre ALLOWED_HOSTS (déjà implémenté côté host)
// Ne jamais renvoyer Access-Control-Allow-Origin: * en production avec credentials
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']); // après validation
```

**Headers sécurité à ajouter dans config.php :**
```php
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
```

**Validation input :**
- `json_validate()` avant `json_decode()` sur tous les POST body (PHP 8.3)
- Taille max POST : 2 MB (projets JSON typiques < 200 KB)
- Pas d'upload de fichiers côté API (SVG transmis en base64 dans JSON)

**Rate limiting auth (SQLite) :**
```sql
CREATE TABLE rate_limits (
  key  TEXT PRIMARY KEY,    -- "login:{ip}" ou "register:{ip}"
  hits INTEGER DEFAULT 1,
  window_start DATETIME NOT NULL
);
-- Règle : 5 tentatives / 60s par IP sur /auth/login.php
```

**PDF generation :**
- Validation `prjid` UUID, `prjname` longueur max
- Couleur grille : validation RGB 0-255 avant usage
- Pas d'exécution de commande shell avec données utilisateur non-échappées

---

## 7. EXPLOITATION

### Logs

```
/data/logs/
  app.log       # PHP errors → stderr docker → docker logs vpanel
  pdf.log       # Timing génération PDF (entrée : taille projet, durée, succès/erreur)
  access.log    # nginx access log (dans conteneur nginx)
```

Format PDF log (une ligne par génération) :
```
[2026-05-03T14:23:11Z] prjid=abc123 modules=42 sections=labels,schema duration_ms=1240 status=ok
```

### Monitoring

**Health endpoint** (`GET /api/health.php`) retourne :
```json
{
  "status": "ok | error",
  "mode": "production",
  "timestamp": "ISO8601",
  "checks": {
    "sqlite": {"ok": true},
    "schema_functions_json": {"ok": true},
    "pdf_backend_available": {"ok": true, "imagick": true, "convert_cli": false},
    "sqlite_directory_writable": {"ok": true},
    "icon_cache_writable": {"ok": true}
  }
}
```

**Uptime monitoring externe :** UptimeRobot (gratuit) ou Checkly — sonde `/api/health.php` toutes les 60s, alerte email si 503 > 3 min.

**Métriques à suivre** (disponibles via `/api/resume.php`) :
- PDFs générés / jour
- Nouveaux projets / jour
- Imports / jour
- Taux d'erreur PDF (ratio erreurs/total)

### Backup

**Script quotidien (`/data/backup.sh`) :**
```bash
#!/bin/sh
set -e
DATE=$(date +%Y%m%d_%H%M%S)
DEST="/data/backups/vpanel_${DATE}.sqlite"
sqlite3 /data/vpanel.sqlite ".backup '${DEST}'"
# Rotation : 30 derniers fichiers
ls -t /data/backups/vpanel_*.sqlite | tail -n +31 | xargs -r rm
echo "[${DATE}] Backup OK: ${DEST}"
```

**Cron dans docker-compose :**
```yaml
services:
  backup:
    image: alpine
    volumes:
      - vpanel_data:/data
    entrypoint: crond -f -d 8
    # /etc/crontabs/root : 0 2 * * * /data/backup.sh >> /data/logs/backup.log 2>&1
```

**Restauration :**
```bash
# Arrêter l'app, restaurer, redémarrer
docker compose stop app
cp /data/backups/vpanel_20260503_020000.sqlite /data/vpanel.sqlite
docker compose start app
```

---

## 8. ROADMAP BUILD

### Sprint 1 — Stabilisation technique (1 semaine)

**Objectif :** rendre le code maintenable et robuste sans casser l'existant.

1. `src/ErrorBoundary.jsx` — empêche écran blanc en production ✓ (livré)
2. `src/utils/switchboardMigration.js` — extraire logique migration inter-versions ✓ (livré)
3. `src/utils/moduleValidation.js` — extraire validation métier modules ✓ (livré)
4. `src/hooks/useSwitchboard.js` — extraire état + mutations tableau ✓ (livré)
5. `src/hooks/usePrintOptions.js` — extraire état + persistance options impression ✓ (livré)
6. `src/hooks/useClipboard.js` — extraire clipboard ✓ (livré)
7. Vitest setup + tests unitaires migration + validation ✓ (livré)
8. Headers sécurité PHP (`X-Content-Type-Options`, `X-Frame-Options`) ✓ (livré)
9. Refactor App.jsx pour consommer les hooks (< 600 lignes)

### Sprint 2 — Qualité & CI (1 semaine)

**Objectif :** confiance dans le code, pas de régression silencieuse.

1. Tests round-trip import/export JSON (toutes versions 1.x → 2.x)
2. Tests monitoring NFC (calculs espace libre)
3. Tests PDF smoke (vérifier que toPdf.php répond 200 sur projet minimal)
4. Playwright setup : 3 scénarios E2E (créer projet, éditer module, imprimer PDF)
5. GitHub Actions CI : lint + vitest + build (ghpages mode)
6. Dockerfiles : build multi-stage, image < 80 MB

### Sprint 3 — Cloud & Auth (2 semaines)

**Objectif :** Tier Pro fonctionnel.

1. SQLite schema : `users`, `projects`, `project_shares`, `auth_tokens`
2. PHP : `auth/register.php`, `auth/login.php`, `auth/refresh.php`, `auth/logout.php`
3. PHP : `libs/jwt_middleware.php` (validation RS256)
4. PHP : `libs/rate_limiter.php` (5 req/min auth par IP)
5. PHP : `projects/list.php`, `projects/load.php`, `projects/save.php`, `projects/delete.php`
6. Frontend : `AuthContext.jsx` + login/register popup
7. Frontend : intégration auto-save cloud dans `useSwitchboard` (quand connecté)
8. Frontend : indicateur de sauvegarde (SpaceContext déjà préparé)

### Sprint 4 — Features Pro (2 semaines)

**Objectif :** valeur visible pour abonnés Pro.

1. 5 templates projets (studio, T2, T3, bureau standard, industriel léger)
2. Partage par lien tokenisé (`shares/create.php` + `shares/load.php`)
3. Historique 5 versions (stockage versions précédentes dans `projects_history`)
4. Notifications email partage (PHPMailer déjà configuré)
5. UI : liste projets cloud dans toolbar (remplace "Projets" actuel)

### Sprint 5 — API & Enterprise (3 semaines)

**Objectif :** intégration bureau d'études, revenus Enterprise.

1. REST API : CRUD projets + génération PDF via API (JSON body)
2. API keys management (table `api_keys` + middleware)
3. OpenAPI spec (`/api/openapi.json`)
4. Export DXF (librairie PHP dxf ou génération manuelle pour schémas simples)
5. Dashboard admin React (stats, users, abonnements)
6. Multi-users workspace (table `workspaces` + `workspace_members`)

---

## Décisions d'architecture tranchées

| Décision | Choix | Raison |
|----------|-------|--------|
| Base de données | SQLite uniquement | Zéro infra, suffisant pour le volume, backup simple |
| PDF | FPDF + ImageMagick | En place, éprouvé, pas de dépendance externe |
| Auth tokens | httpOnly cookie (refresh) + mémoire JS (access) | XSS-safe |
| Format projet | JSON versionné, migration forward-only | Simplicité, pas de backward compat à maintenir |
| Internationalisation | French only (hors scope) | Solo builder, marché FR d'abord |
| Tests E2E | Playwright (pas Cypress) | Plus rapide, pas de paywall |
| CSS | CSS modules actuels conservés | Refactor CSS n'est pas une priorité |
| TypeScript | Non (JSDoc à la place) | Migration coûteuse pour un solo builder |
| Websocket (collab) | Sprint 5+ seulement | Complexité infra injustifiée avant product-market fit |
