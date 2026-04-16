-- =============================================================
-- Vpanel — Initialisation du schéma MySQL / MariaDB
-- Exécuté automatiquement par MySQL au premier démarrage du
-- conteneur (via /docker-entrypoint-initdb.d/).
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Structures de statistiques autorisées ───────────────────
-- Clés correspondant aux paramètres ?s= appelés par le frontend
CREATE TABLE IF NOT EXISTS `stats_allowed_structs` (
    `id`  INT(11)      NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `stats_allowed_structs` (`key`) VALUES
    ('web'),   -- utilisé par visit('web')
    ('app');   -- utilisé par action() et choices()

-- ─── Actions de statistiques autorisées ──────────────────────
-- Clés correspondant aux paramètres ?a= appelés par le frontend
CREATE TABLE IF NOT EXISTS `stats_allowed_actions` (
    `id`  INT(11)      NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `stats_allowed_actions` (`key`) VALUES
    ('create'),   -- action('create')
    ('import'),   -- action('import')
    ('export'),   -- action('export')
    ('print');    -- action('print')

-- ─── Choix de statistiques autorisés ─────────────────────────
-- Clés correspondant aux paramètres ?c= appelés par le frontend
CREATE TABLE IF NOT EXISTS `stats_allowed_choices` (
    `id`  INT(11)      NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50)  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `stats_allowed_choices` (`key`) VALUES
    ('theme'),         -- sendChoice('theme', ...)
    ('print'),         -- sendChoice('print', ...)
    ('print_format');  -- sendChoice('print_format', ...)

-- ─── Visites ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `stats_visits` (
    `id`         INT(11)       NOT NULL AUTO_INCREMENT,
    `ip`         VARCHAR(45)   NOT NULL,
    `country`    VARCHAR(100)  NOT NULL DEFAULT '',
    `regionName` VARCHAR(100)  NOT NULL DEFAULT '',
    `city`       VARCHAR(100)  NOT NULL DEFAULT '',
    `timezone`   VARCHAR(100)  NOT NULL DEFAULT '',
    `type`       VARCHAR(10)   NOT NULL DEFAULT 'user',
    `struct`     VARCHAR(50)   NOT NULL DEFAULT '',
    `url`        TEXT          NOT NULL,
    `ua`         TEXT          NOT NULL,
    `rfr`        TEXT          NOT NULL,
    `datetime`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_ip_url` (`ip`, `url`(255)),
    INDEX `idx_datetime` (`datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── Détail des visites (compteurs par heure/jour) ───────────
CREATE TABLE IF NOT EXISTS `stats_visits_details` (
    `id`       INT(11) NOT NULL AUTO_INCREMENT,
    `visit_id` INT(11) NOT NULL,
    `date`     DATE    NOT NULL,
    `counters` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}',
    PRIMARY KEY (`id`),
    INDEX `idx_visit_date` (`visit_id`, `date`),
    CONSTRAINT `fk_visit_details` FOREIGN KEY (`visit_id`)
        REFERENCES `stats_visits`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
