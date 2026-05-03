/**
 * Module validation rules — pure functions, no side effects.
 * All validators return an array of error message strings (empty = valid).
 */

/** Pattern for acceptable module identifiers: word chars only */
const ID_PATTERN = /^\w+$/;

/**
 * @param {string} id
 * @returns {string[]} errors
 */
export function validateModuleId(id) {
    const v = (id ?? '').trim();
    if (!v) return ['Un identifiant valide est requis.'];
    if (!ID_PATTERN.test(v)) return ["L'identifiant ne doit contenir que des lettres, chiffres ou underscores."];
    return [];
}

/**
 * Validate that an ID is unique within the existing ID list.
 *
 * @param {string} id
 * @param {string} originalId - the module's current id (allowed duplicate of itself)
 * @param {string[]} allIds
 * @returns {string[]}
 */
export function validateModuleIdUniqueness(id, originalId, allIds) {
    const v = (id ?? '').trim().toUpperCase();
    const orig = (originalId ?? '').trim().toUpperCase();
    if (v !== orig && allIds.map(i => i.toUpperCase()).includes(v)) {
        return [`L'identifiant "${v}" est déjà utilisé par un autre module.`];
    }
    return [];
}

/**
 * @param {object} module - full module object
 * @param {object} schemaFunctions - function metadata map
 * @returns {string[]}
 */
export function validateModuleFields(module, schemaFunctions) {
    const errors = [];
    const fn = schemaFunctions[module.func];

    if (fn?.hasPole && module.pole === '') {
        errors.push('La configuration de pôles est requise pour ce type de module.');
    }
    if (fn?.hasWire && module.wire === '') {
        // Wire is recommended but not blocking — keep as warning, not error
    }

    return errors;
}

/**
 * Deduplicate IDs in a rows array by appending `_N` suffixes.
 * Returns a new rows array — does not mutate the input.
 *
 * @param {Array<Array<object>>} rows
 * @param {string} defaultPrefix - e.g. "Q"
 * @returns {Array<Array<object>>}
 */
export function deduplicateIds(rows, defaultPrefix = 'Q') {
    const seen = new Set();
    let counter = 1;

    return rows.map(row =>
        row.map(module => {
            if (module.free) return { ...module, id: '' };

            let id = (module.id ?? '').trim();

            if (!id) {
                while (seen.has(`${defaultPrefix}${counter}`)) counter++;
                id = `${defaultPrefix}${counter}`;
                counter++;
            } else if (seen.has(id)) {
                const base = id.split('_')[0];
                let n = 1;
                while (seen.has(`${base}_${n}`)) n++;
                id = `${base}_${n}`;
            }

            seen.add(id);
            return { ...module, id };
        })
    );
}

/**
 * Compute free-space statistics for NFC 15-100 monitoring.
 *
 * @param {Array<Array<object>>} rows
 * @param {number} stepsPerRow
 * @returns {{ used: number, total: number, percentFree: number, compliant: boolean }}
 */
export function computeSpaceStats(rows, stepsPerRow) {
    const used = rows
        .map(row => row.filter(m => !m.free).reduce((acc, m) => acc + (m.span ?? 1), 0))
        .reduce((a, b) => a + b, 0);
    const total = rows.length * stepsPerRow;
    const percentFree = total > 0 ? Math.round(100 - (used / total) * 100) : 100;
    return { used, total, percentFree, compliant: percentFree >= 20 };
}
