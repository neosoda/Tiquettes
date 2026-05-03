/**
 * Forward-only migration of switchboard objects across app versions.
 *
 * Each `migrateModule` and `migrateSwitchboard` function handles additions
 * introduced at a specific version boundary. Order matters: patches are applied
 * sequentially from oldest to newest so a v1.2 project goes through every step.
 */

/** @typedef {import('../App.jsx').Module} Module */
/** @typedef {import('../App.jsx').Switchboard} Switchboard */

/**
 * Apply all per-module migrations to a raw module object.
 * Safe to call on already-migrated modules (all guards are idempotent).
 *
 * @param {object} raw
 * @returns {object}
 */
export function migrateModule(raw) {
    let m = { ...raw };

    // <=1.4.0 : per-module theme was stored inline, now lives on the switchboard
    if ('theme' in m) delete m.theme;

    // <=2.0.3 : half-width module support added
    if (!m.half) m = { ...m, half: 'none' };

    // <=2.2.3 : modtype + wire
    if (!m.modtype) m = { ...m, modtype: '' };
    if (!m.wire)    m = { ...m, wire: '' };

    // <=2.2.4 : group colour
    if (!m.grp) m = { ...m, grp: '' };

    // <=2.2.5 : phase line
    if (!m.line) m = { ...m, line: '' };

    // <=2.2.6 : partial contactor mode
    if (m.partialKc === undefined || m.partialKc === null) m = { ...m, partialKc: false };

    return m;
}

/**
 * Normalise boolean fields that were sometimes stored as strings in old exports.
 *
 * @param {any} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function normBool(value, fallback) {
    if (value === true || value === false) return value;
    return fallback;
}

/**
 * Apply all switchboard-level migrations.
 *
 * @param {object} raw - raw JSON-parsed project object
 * @param {object} defaults - { defaultProject, defaultProjectProperties, defaultStepSize, defaultProjectType, defaultVRef }
 * @returns {object} migrated switchboard
 */
export function migrateSwitchboard(raw, defaults) {
    const {
        defaultProject,
        defaultProjectProperties,
        defaultStepSize,
        defaultProjectType,
        defaultVRef,
    } = defaults;

    const rows = (raw.rows ?? []).map(row => row.map(m => migrateModule(m)));

    return {
        ...defaultProject,
        ...raw,

        // <1.5.0 — date fields stored as strings
        prjcreated: raw.prjcreated ? new Date(raw.prjcreated) : new Date(),
        prjupdated: raw.prjupdated ? new Date(raw.prjupdated) : new Date(),
        prjversion: raw.prjversion ? parseInt(raw.prjversion, 10) : 1,

        // <2.0.0 — project-level fields
        projectType: raw.projectType ?? defaultProjectType,
        vref:        raw.vref ? parseInt(raw.vref, 10) : defaultVRef,
        db:          { ...defaultProjectProperties.db, ...(raw.db ?? {}) },
        withDb:          normBool(raw.withDb, false),
        withGroundLine:  normBool(raw.withGroundLine, false),
        schemaMonitor:   normBool(raw.schemaMonitor, false),
        switchboardMonitor: normBool(raw.switchboardMonitor, false),

        // summary column visibility flags
        summaryColumnRow:         normBool(raw.summaryColumnRow, false),
        summaryColumnPosition:    normBool(raw.summaryColumnPosition, false),
        summaryColumnType:        normBool(raw.summaryColumnType, true),
        summaryColumnId:          normBool(raw.summaryColumnId, true),
        summaryColumnFunction:    normBool(raw.summaryColumnFunction, true),
        summaryColumnLabel:       normBool(raw.summaryColumnLabel, true),
        summaryColumnDescription: normBool(raw.summaryColumnDescription, true),

        // <2.0.5 — stepSize
        stepSize: raw.stepSize ?? defaultStepSize,

        // <2.2.2 — project UUID
        prjid: raw.prjid ?? crypto.randomUUID(),

        rows,
    };
}
