/**
 * Canonical data model for VPanel — single source of truth for all entity shapes.
 * Use these for prop validation, runtime assertions, and documentation.
 */

'use strict';

/**
 * @typedef {'none'|'left'|'right'} HalfMode
 * @typedef {'1P'|'1P+N'|'2P'|'2P+N'|'3P'|'3P+N'|'4P'|''} Pole
 * @typedef {'A'|'B'|'C'|'N'|''} Line
 * @typedef {'R'|'T'|'I'|''} ProjectType
 */

/**
 * @typedef {Object} Module
 * @property {string}   id         - Unique alphanumeric identifier (e.g. "Q1", "DD3")
 * @property {string|null} icon    - Icon filename or null
 * @property {string}   text       - Main label displayed on the sticker
 * @property {string}   desc       - Additional description
 * @property {string}   func       - Electrical function code (see schema_functions.json)
 * @property {string}   type       - Sub-type (A, AC, …)
 * @property {string}   crb        - CRB curve (B, C, D, …)
 * @property {string}   modtype    - Module physical form factor code
 * @property {string}   current    - Rated current (e.g. "16A", "20A")
 * @property {string}   sensibility- RCD sensitivity (e.g. "30mA", "300mA")
 * @property {number}   coef       - Usage coefficient [0–1]
 * @property {Pole}     pole       - Pole configuration
 * @property {string}   wire       - Wire cross-section in mm² (e.g. "2.5", "6", "10")
 * @property {Line}     line       - Phase line assignment
 * @property {string}   grp        - Group color identifier
 * @property {string}   parentId   - ID of parent module (differential for breakers, etc.)
 * @property {string}   kcId       - Pipe-separated IDs of associated contactors
 * @property {boolean}  partialKc  - Partial contactor servitude
 * @property {boolean}  free       - Whether this slot is empty
 * @property {number}   span       - Width in 18mm steps (≥1)
 * @property {HalfMode} half       - Half-width positioning
 */

/**
 * @typedef {Object} Theme
 * @property {string} name  - Theme identifier (prefixed with "custom|" at runtime)
 * @property {string} title - Human-readable theme name
 * @property {Object} data  - Theme styling data
 */

/**
 * @typedef {Object} Switchboard
 * @property {string}     prjid               - UUID
 * @property {string}     prjname             - Project name
 * @property {Date}       prjcreated          - Creation date
 * @property {Date}       prjupdated          - Last update date
 * @property {number}     prjversion          - Increment counter
 * @property {string}     appversion          - Vpanel version that created this project
 * @property {ProjectType} projectType        - Installation type
 * @property {number}     vref                - Reference voltage (V)
 * @property {Theme}      theme               - Active label theme
 * @property {number}     height              - Row height in mm
 * @property {number}     stepsPerRows        - Number of 18mm slots per row
 * @property {number}     stepSize            - Slot width in mm (standard: 18)
 * @property {Module[][]} rows                - 2D grid of modules [row][position]
 * @property {Module}     db                  - Disconnector breaker (incoming supply)
 * @property {boolean}    withDb              - Show disconnector breaker
 * @property {boolean}    withGroundLine      - Show ground protective earth bar
 * @property {boolean}    schemaMonitor       - NFC 15-100 monitoring on schema tab
 * @property {boolean}    switchboardMonitor  - NFC 15-100 monitoring on labels tab
 * @property {boolean}    summaryColumnRow    - Show row column in nomenclature
 * @property {boolean}    summaryColumnPosition - Show position column in nomenclature
 * @property {boolean}    summaryColumnType   - Show type column in nomenclature
 * @property {boolean}    summaryColumnId     - Show ID column in nomenclature
 * @property {boolean}    summaryColumnFunction - Show function column in nomenclature
 * @property {boolean}    summaryColumnLabel  - Show label column in nomenclature
 * @property {boolean}    summaryColumnDescription - Show description column in nomenclature
 */

/**
 * @typedef {Object} PrintOptions
 * @property {boolean} firstPage   - Include cover page
 * @property {boolean} labels      - Include labels sheet
 * @property {boolean} summary     - Include nomenclature sheet
 * @property {boolean} schema      - Include single-line diagram sheet
 * @property {boolean} freeModules - Print free/empty module slots
 * @property {Object}  pdfOptions  - PDF-specific options
 * @property {Object}  firstPageOptions - Cover page field visibility
 */

// ─── Runtime validators ──────────────────────────────────────────────────────

const VALID_POLES = new Set(['1P', '1P+N', '2P', '2P+N', '3P', '3P+N', '4P', '']);
const VALID_HALF  = new Set(['none', 'left', 'right']);
const VALID_LINES = new Set(['A', 'B', 'C', 'N', '']);
const VALID_PROJECT_TYPES = new Set(['R', 'T', 'I', '']);

/** @param {unknown} m @returns {m is Module} */
export function isModule(m) {
    if (!m || typeof m !== 'object') return false;
    return (
        typeof m.id          === 'string'  &&
        typeof m.text        === 'string'  &&
        typeof m.desc        === 'string'  &&
        typeof m.func        === 'string'  &&
        typeof m.free        === 'boolean' &&
        typeof m.span        === 'number'  &&
        m.span >= 1                        &&
        VALID_POLES.has(m.pole)            &&
        VALID_HALF.has(m.half)             &&
        VALID_LINES.has(m.line)
    );
}

/** @param {unknown} swb @returns {swb is Switchboard} */
export function isSwitchboard(swb) {
    if (!swb || typeof swb !== 'object') return false;
    return (
        typeof swb.prjid        === 'string'  &&
        typeof swb.prjname      === 'string'  &&
        typeof swb.stepsPerRows === 'number'  &&
        typeof swb.height       === 'number'  &&
        typeof swb.stepSize     === 'number'  &&
        Array.isArray(swb.rows)               &&
        swb.rows.every(Array.isArray)
    );
}

/** @param {unknown} swb @returns {string[]} list of validation errors */
export function validateSwitchboard(swb) {
    const errors = [];
    if (!swb || typeof swb !== 'object') return ['Not an object'];

    if (!swb.prjid)        errors.push('Missing prjid');
    if (!swb.prjname)      errors.push('Missing prjname');
    if (!Array.isArray(swb.rows)) errors.push('rows must be an array');
    if (swb.stepsPerRows < 1)    errors.push('stepsPerRows must be ≥ 1');
    if (swb.height < 10 || swb.height > 50) errors.push('height must be 10–50 mm');
    if (!VALID_PROJECT_TYPES.has(swb.projectType)) errors.push('Invalid projectType');

    return errors;
}

// ─── Default factories ────────────────────────────────────────────────────────

/** @returns {Module} */
export function createEmptyModule(id = '') {
    return {
        id,
        icon: null,
        text: '',
        desc: '',
        func: '',
        type: '',
        crb: '',
        modtype: '',
        current: '',
        sensibility: '',
        coef: 0.5,
        pole: '',
        wire: '',
        line: '',
        grp: '',
        parentId: '',
        kcId: '',
        partialKc: false,
        free: true,
        span: 1,
        half: 'none',
    };
}

/** @param {string} id @returns {Module} */
export function createDefaultDb(id = 'DB') {
    return {
        ...createEmptyModule(id),
        free: false,
        func: 'db',
        icon: 'swb_puissance.svg',
        pole: '1P+N',
        wire: '16',
        sensibility: '500mA',
        coef: 1,
        span: 4,
        text: 'Disjoncteur de branchement',
        desc: 'Disjoncteur de branchement',
        current: '30/60A',
        type: 'S',
    };
}
