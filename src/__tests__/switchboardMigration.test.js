import { describe, it, expect } from 'vitest';
import { migrateModule, migrateSwitchboard } from '../utils/switchboardMigration.js';

// ─── migrateModule ────────────────────────────────────────────────────────────

describe('migrateModule', () => {
    it('removes inline theme from <=1.4.0 modules', () => {
        const m = { id: 'Q1', free: false, theme: { name: 'old' } };
        const result = migrateModule(m);
        expect(result).not.toHaveProperty('theme');
    });

    it('adds half=none when missing (<=2.0.3)', () => {
        const m = { id: 'Q1', free: false };
        expect(migrateModule(m).half).toBe('none');
    });

    it('does not overwrite existing half value', () => {
        const m = { id: 'Q1', free: false, half: 'left' };
        expect(migrateModule(m).half).toBe('left');
    });

    it('adds modtype and wire when missing (<=2.2.3)', () => {
        const m = { id: 'Q1', free: false };
        const r = migrateModule(m);
        expect(r.modtype).toBe('');
        expect(r.wire).toBe('');
    });

    it('adds grp when missing (<=2.2.4)', () => {
        const m = { id: 'Q1', free: false };
        expect(migrateModule(m).grp).toBe('');
    });

    it('adds line when missing (<=2.2.5)', () => {
        const m = { id: 'Q1', free: false };
        expect(migrateModule(m).line).toBe('');
    });

    it('adds partialKc=false when missing (<=2.2.6)', () => {
        const m = { id: 'Q1', free: false };
        expect(migrateModule(m).partialKc).toBe(false);
    });

    it('does not overwrite partialKc=true', () => {
        const m = { id: 'Q1', free: false, partialKc: true };
        expect(migrateModule(m).partialKc).toBe(true);
    });

    it('is idempotent on an already-migrated module', () => {
        const m = {
            id: 'Q1', free: false, half: 'none', modtype: '', wire: '',
            grp: '', line: '', partialKc: false,
        };
        expect(migrateModule(m)).toEqual(m);
    });
});

// ─── migrateSwitchboard ───────────────────────────────────────────────────────

const DB_MODULE = {
    id: 'DB', free: false, func: 'db', icon: 'swb_puissance.svg',
    text: 'Disjonteur de branchement', desc: '', type: 'S', crb: '', modtype: '',
    current: '30/60A', sensibility: '500mA', coef: 1, pole: '1P+N', wire: '16',
    line: '', grp: '', parentId: '', kcId: '', partialKc: false, span: 4, half: 'none',
};

const DEFAULT_PROJECT = {
    prjid: 'default-id',
    prjname: 'Nouveau projet',
    prjcreated: new Date('2024-01-01'),
    prjupdated: new Date('2024-01-01'),
    prjversion: 1,
    projectType: 'R',
    vref: 230,
    theme: { name: 'custom|default', data: {} },
    appversion: '2.2.7',
    height: 29,
    stepsPerRows: 13,
    stepSize: 18,
    rows: [],
    db: { ...DB_MODULE },
    withDb: false,
    withGroundLine: false,
    schemaMonitor: false,
    switchboardMonitor: false,
    summaryColumnRow: false,
    summaryColumnPosition: false,
    summaryColumnType: true,
    summaryColumnId: true,
    summaryColumnFunction: true,
    summaryColumnLabel: true,
    summaryColumnDescription: true,
};

const DEFAULTS = {
    defaultProject: DEFAULT_PROJECT,
    defaultProjectProperties: { db: DB_MODULE },
    defaultStepSize: 18,
    defaultProjectType: 'R',
    defaultVRef: 230,
};

describe('migrateSwitchboard', () => {
    it('parses date strings into Date objects', () => {
        const raw = { ...DEFAULT_PROJECT, rows: [], prjcreated: '2023-06-15T00:00:00.000Z', prjupdated: '2023-06-15T00:00:00.000Z' };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(result.prjcreated).toBeInstanceOf(Date);
        expect(result.prjupdated).toBeInstanceOf(Date);
    });

    it('coerces numeric fields stored as strings', () => {
        const raw = { ...DEFAULT_PROJECT, rows: [], prjversion: '5', vref: '400' };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(result.prjversion).toBe(5);
        expect(result.vref).toBe(400);
    });

    it('defaults boolean fields to correct values', () => {
        const raw = { ...DEFAULT_PROJECT, rows: [], withDb: undefined };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(result.withDb).toBe(false);
        expect(result.summaryColumnType).toBe(true);
        expect(result.summaryColumnRow).toBe(false);
    });

    it('applies per-module migration to all rows', () => {
        const raw = {
            ...DEFAULT_PROJECT,
            rows: [[{ id: 'Q1', free: false, theme: { name: 'old' } }]],
        };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(result.rows[0][0]).not.toHaveProperty('theme');
        expect(result.rows[0][0].half).toBe('none');
    });

    it('merges partial db with defaults', () => {
        const raw = { ...DEFAULT_PROJECT, rows: [], db: { current: '63A' } };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(result.db.current).toBe('63A');
        expect(result.db.id).toBe('DB');
    });

    it('generates prjid when missing', () => {
        const raw = { ...DEFAULT_PROJECT, rows: [], prjid: undefined };
        const result = migrateSwitchboard(raw, DEFAULTS);
        expect(typeof result.prjid).toBe('string');
        expect(result.prjid.length).toBeGreaterThan(0);
    });
});
