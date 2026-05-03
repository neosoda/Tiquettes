/**
 * useSwitchboard — central state manager for the switchboard / project.
 *
 * Owns all mutations that were previously inlined in App.jsx:
 *   createProject, resetProject, importProject, exportProject,
 *   modulesAutoId, moduleGrow/Shrink/Clear/Insert/Move/Half,
 *   rowAdd/Delete, reassignAllParents, reassignModules.
 *
 * Does NOT own UI concerns (tabs, modals, clipboard) — those stay in App.jsx
 * or their own hooks.
 */

import { useCallback, useMemo, useState } from 'react';
import { satisfies } from 'compare-versions';
import sanitizeFilename from 'sanitize-filename';

import * as pkg from '../../package.json';
import themesList from '../themes.json';
import swbIcons from '../switchboard_icons.json';
import schemaFunctions from '../schema_functions.json';

import { migrateSwitchboard, migrateModule } from '../utils/switchboardMigration.js';
import { deduplicateIds } from '../utils/moduleValidation.js';
import { action } from '../../public/api/stats.js';

// ─── env constants ───────────────────────────────────────────────────────────

const DEFAULT_STEP_SIZE    = parseInt(import.meta.env.VITE_DEFAULT_STEPSIZE, 10);
const DEFAULT_PROJECT_NAME = import.meta.env.VITE_DEFAULT_PROJECT_NAME;
const DEFAULT_NP_ROWS      = parseInt(import.meta.env.VITE_DEFAULT_ROWS, 10);
const DEFAULT_H_ROW        = parseInt(import.meta.env.VITE_DEFAULT_ROWHEIGHT, 10);
const DEFAULT_SPR          = parseInt(import.meta.env.VITE_DEFAULT_STEPSPERROW, 10);
const DEFAULT_MODULE_ID    = import.meta.env.VITE_DEFAULT_ID;
const DEFAULT_PROJECT_TYPE = import.meta.env.VITE_DEFAULT_PROJECT_TYPE;
const DEFAULT_VREF         = parseInt(import.meta.env.VITE_DEFAULT_VREF, 10);
const VERSION_RANGE        = import.meta.env.VITE_APP_VERSION_RANGE;

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateUUID() {
    return crypto.randomUUID();
}

const DEFAULT_THEME = themesList.find(t => t.default);

const DEFAULT_MODULE = Object.freeze({
    id: '', icon: null, text: '', desc: '', func: '', type: '', crb: '',
    modtype: '', current: '', sensibility: '', coef: 0.5, pole: '', wire: '',
    line: '', grp: '', parentId: '', kcId: '', partialKc: false,
    free: true, span: 1, half: 'none',
});

const DEFAULT_DB_MODULE = Object.freeze({
    id: 'DB', free: false, func: 'db', icon: 'swb_puissance.svg',
    text: 'Disjonteur de branchement', desc: 'Disjonteur de branchement',
    type: 'S', crb: '', modtype: '', current: '30/60A', sensibility: '500mA',
    coef: 1, pole: '1P+N', wire: '16', line: '', grp: '', parentId: '',
    kcId: '', partialKc: false, span: 4, half: 'none',
});

function buildDefaultProject(rows) {
    return {
        prjid: generateUUID(),
        prjname: DEFAULT_PROJECT_NAME,
        prjcreated: new Date(),
        prjupdated: new Date(),
        prjversion: 1,
        projectType: DEFAULT_PROJECT_TYPE,
        vref: DEFAULT_VREF,
        theme: { ...DEFAULT_THEME },
        appversion: pkg.version,
        height: DEFAULT_H_ROW,
        stepsPerRows: DEFAULT_SPR,
        stepSize: DEFAULT_STEP_SIZE,
        rows,
        db: { ...DEFAULT_DB_MODULE },
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
}

function createEmptyRows(stepsPerRows, rowCount) {
    return Array.from({ length: rowCount }, (_, ri) =>
        Array.from({ length: stepsPerRows }, (_, ci) => ({
            ...DEFAULT_MODULE,
            id: `Q${ci + 1 + ri * stepsPerRows}`,
        }))
    );
}

function normTheme(swb) {
    let theme = swb?.theme;
    if (!theme || typeof theme?.name !== 'string') {
        for (const row of (swb?.rows ?? [])) {
            const found = row.find(m => !m.free && m.theme);
            if (found) { theme = found.theme; break; }
        }
        theme = theme ?? DEFAULT_THEME;
    }
    if (!theme.name.startsWith('custom|')) {
        theme = { ...theme, name: `custom|${theme.name}` };
    }
    if (!theme.data) {
        const base = themesList.find(t => t.name === theme.name);
        theme = { ...theme, data: base?.data ?? DEFAULT_THEME.data };
    }
    return theme;
}

function loadFromSession() {
    const key = pkg.name;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        const theme = normTheme(parsed);
        const rows = buildDefaultProject(createEmptyRows(DEFAULT_SPR, DEFAULT_NP_ROWS));
        const migrated = migrateSwitchboard(parsed, {
            defaultProject: rows,
            defaultProjectProperties: { db: DEFAULT_DB_MODULE },
            defaultStepSize: DEFAULT_STEP_SIZE,
            defaultProjectType: DEFAULT_PROJECT_TYPE,
            defaultVRef: DEFAULT_VREF,
        });
        return deduplicateIds_swb({ ...migrated, theme });
    } catch {
        sessionStorage.removeItem(key);
        return null;
    }
}

function deduplicateIds_swb(swb) {
    return { ...swb, rows: deduplicateIds(swb.rows, DEFAULT_MODULE_ID) };
}

// ─── hook ────────────────────────────────────────────────────────────────────

export function useSwitchboard() {
    const initialRows = createEmptyRows(DEFAULT_SPR, DEFAULT_NP_ROWS);
    const initialProject = buildDefaultProject(initialRows);

    const [switchboard, setSwitchboard] = useState(
        () => loadFromSession() ?? initialProject
    );

    // ── derived ──────────────────────────────────────────────────────────────

    const isEmpty = useMemo(() => {
        return switchboard.rows.every(row => row.every(m => m.free));
    }, [switchboard.rows]);

    const allIds = useMemo(() => {
        const ids = [];
        switchboard.rows.forEach(row =>
            row.forEach(m => { if (!m.free && m.id.trim()) ids.push(m.id.trim()); })
        );
        return ids;
    }, [switchboard.rows]);

    const lastFreeId = useMemo(() => {
        const ids = switchboard.rows.flatMap(row => row.map(m => m.id));
        let n = 1;
        while (ids.includes(`${DEFAULT_MODULE_ID}${n}`)) n++;
        return `${DEFAULT_MODULE_ID}${n}`;
    }, [switchboard]);

    // ── project-level mutations ───────────────────────────────────────────────

    const createProject = useCallback((name, stepsPerRows, rowCount, height) => {
        const rows = createEmptyRows(stepsPerRows, rowCount);
        setSwitchboard(deduplicateIds_swb({
            ...buildDefaultProject(rows),
            prjname: name,
            height,
            stepsPerRows,
            stepSize: DEFAULT_STEP_SIZE,
        }));
        action('create');
    }, []);

    const resetProject = useCallback(() => {
        createProject(DEFAULT_PROJECT_NAME, DEFAULT_SPR, DEFAULT_NP_ROWS, DEFAULT_H_ROW);
    }, [createProject]);

    const verifyVersion = useCallback((swb) => {
        if (!swb?.appversion) return false;
        return satisfies(swb.appversion, VERSION_RANGE);
    }, []);

    // ── import / export ───────────────────────────────────────────────────────

    const importProject = useCallback((data) => {
        try {
            const raw = typeof data === 'string' ? JSON.parse(data) : data;
            if (!verifyVersion(raw)) return null;

            const theme = normTheme(raw);

            // per-module migration + icon coef backfill
            const rows = (raw.rows ?? []).map(row =>
                row.map(m => {
                    let nm = migrateModule(m);
                    if (nm.icon) {
                        const sic = swbIcons.find(s => s.filename === nm.icon);
                        if (sic && !nm.coef) nm = { ...nm, coef: sic.coef };
                    }
                    return nm;
                })
            );

            const blankDefault = buildDefaultProject(createEmptyRows(DEFAULT_SPR, DEFAULT_NP_ROWS));
            const migrated = migrateSwitchboard({ ...raw, rows }, {
                defaultProject: blankDefault,
                defaultProjectProperties: { db: DEFAULT_DB_MODULE },
                defaultStepSize: DEFAULT_STEP_SIZE,
                defaultProjectType: DEFAULT_PROJECT_TYPE,
                defaultVRef: DEFAULT_VREF,
            });

            const final = deduplicateIds_swb({ ...migrated, theme });
            setSwitchboard(final);
            action('import');
            return final;
        } catch {
            return null;
        }
    }, [verifyVersion]);

    const exportProject = useCallback((sendChoiceFn) => {
        const exported = {
            ...switchboard,
            prjversion: (switchboard.prjversion ?? 0) + 1,
            appversion: pkg.version,
        };
        const json = encodeURIComponent(JSON.stringify(exported));
        const link = document.createElement('a');
        link.href = `data:text/json;charset=utf-8,${json}`;
        link.download = `${pkg.title} - ${sanitizeFilename(exported.prjname ?? DEFAULT_PROJECT_NAME)} - v${exported.prjversion}.json`;
        link.click();
        setSwitchboard(exported);
        action('export');
        if (sendChoiceFn) {
            sendChoiceFn('theme', ['total', `${switchboard.theme?.group} - ${switchboard.theme?.title}`], true);
        }
    }, [switchboard]);

    // ── module-level mutations ────────────────────────────────────────────────

    const applyModuleUpdate = useCallback((rowIndex, moduleIndex, patch) => {
        setSwitchboard(prev => {
            const rows = prev.rows.map((row, ri) =>
                ri !== rowIndex ? row :
                    row.map((m, mi) => mi !== moduleIndex ? m : { ...m, ...patch })
            );
            return { ...prev, rows };
        });
    }, []);

    const moduleClear = useCallback((rowIndex, moduleIndex) => {
        applyModuleUpdate(rowIndex, moduleIndex, { ...DEFAULT_MODULE, id: '' });
    }, [applyModuleUpdate]);

    const moduleInsert = useCallback((rowIndex, moduleIndex) => {
        setSwitchboard(prev => {
            const row = [...prev.rows[rowIndex]];
            row.splice(moduleIndex, 0, { ...DEFAULT_MODULE });
            row.pop();
            const rows = prev.rows.map((r, ri) => ri === rowIndex ? row : r);
            return { ...prev, rows };
        });
    }, []);

    const moduleGrow = useCallback((rowIndex, moduleIndex) => {
        setSwitchboard(prev => {
            const row = [...prev.rows[rowIndex]];
            const span = row[moduleIndex].span ?? 1;
            if (moduleIndex + span >= row.length) return prev;
            const newSpan = span + 1;
            row[moduleIndex] = { ...row[moduleIndex], span: newSpan };
            // remove the slot(s) that are now covered
            row.splice(moduleIndex + 1, 1);
            row.push({ ...DEFAULT_MODULE });
            const rows = prev.rows.map((r, ri) => ri === rowIndex ? row : r);
            return { ...prev, rows };
        });
    }, []);

    const moduleShrink = useCallback((rowIndex, moduleIndex) => {
        setSwitchboard(prev => {
            const row = [...prev.rows[rowIndex]];
            const span = row[moduleIndex].span ?? 1;
            if (span <= 1) return prev;
            row[moduleIndex] = { ...row[moduleIndex], span: span - 1 };
            row.splice(moduleIndex + span - 1, 0, { ...DEFAULT_MODULE });
            row.pop();
            const rows = prev.rows.map((r, ri) => ri === rowIndex ? row : r);
            return { ...prev, rows };
        });
    }, []);

    const moduleMoveLeft = useCallback((rowIndex, moduleIndex) => {
        if (moduleIndex === 0) return;
        setSwitchboard(prev => {
            const row = [...prev.rows[rowIndex]];
            [row[moduleIndex - 1], row[moduleIndex]] = [row[moduleIndex], row[moduleIndex - 1]];
            const rows = prev.rows.map((r, ri) => ri === rowIndex ? row : r);
            return { ...prev, rows };
        });
    }, []);

    const moduleMoveRight = useCallback((rowIndex, moduleIndex) => {
        setSwitchboard(prev => {
            const row = [...prev.rows[rowIndex]];
            if (moduleIndex >= row.length - 1) return prev;
            [row[moduleIndex], row[moduleIndex + 1]] = [row[moduleIndex + 1], row[moduleIndex]];
            const rows = prev.rows.map((r, ri) => ri === rowIndex ? row : r);
            return { ...prev, rows };
        });
    }, []);

    const moduleSetHalf = useCallback((rowIndex, moduleIndex, half) => {
        applyModuleUpdate(rowIndex, moduleIndex, { half });
    }, [applyModuleUpdate]);

    // ── row mutations ─────────────────────────────────────────────────────────

    const rowAddAfter = useCallback((rowIndex) => {
        setSwitchboard(prev => {
            const newRow = createEmptyRows(prev.stepsPerRows, 1)[0];
            const rows = [...prev.rows];
            rows.splice(rowIndex + 1, 0, newRow);
            return { ...prev, rows };
        });
    }, []);

    const rowDelete = useCallback((rowIndex) => {
        setSwitchboard(prev => {
            if (prev.rows.length <= 1) return prev;
            const rows = prev.rows.filter((_, i) => i !== rowIndex);
            return { ...prev, rows };
        });
    }, []);

    // ── parent/kc re-assignment ───────────────────────────────────────────────

    const reassignAllParents = useCallback((originalId, newId) => {
        if (!originalId || originalId === newId) return;
        setSwitchboard(prev => {
            const rows = prev.rows.map(row =>
                row.map(m => {
                    let nm = m;
                    if (m.parentId === originalId) nm = { ...nm, parentId: newId };
                    if (m.kcId === originalId)     nm = { ...nm, kcId: newId };
                    return nm;
                })
            );
            return deduplicateIds_swb({ ...prev, rows });
        });
    }, []);

    const reassignModules = useCallback(() => {
        if (!confirm("Êtes-vous certain de vouloir ré-assigner automatiquement les identifiants de l'ensemble des modules définis? Cette action est irréversible.")) return;

        setSwitchboard(prev => {
            const counters = {};
            const remap = {};

            const rows = prev.rows.map(row =>
                row.map(m => {
                    if (m.free) return { ...m, id: '' };
                    const func = (m.func ?? '').trim().toUpperCase() || DEFAULT_MODULE_ID;
                    counters[func] = (counters[func] ?? 0) + 1;
                    const newId = `${func}${counters[func]}`;
                    remap[m.id] = newId;
                    return { ...m, id: newId };
                })
            );

            const remapped = rows.map(row =>
                row.map(m => ({
                    ...m,
                    parentId: remap[m.parentId] ?? m.parentId,
                    kcId: (m.kcId ?? '').split('|')
                        .map(k => remap[k] ?? null)
                        .filter(Boolean)
                        .join('|'),
                }))
            );

            return { ...prev, rows: remapped };
        });
    }, []);

    // ── apply editor result ───────────────────────────────────────────────────

    const applyEditorResult = useCallback((rowIndex, moduleIndex, updatedModule, originalId) => {
        setSwitchboard(prev => {
            const rows = prev.rows.map((row, ri) =>
                ri !== rowIndex ? row :
                    row.map((m, mi) => mi !== moduleIndex ? m : { ...updatedModule })
            );
            let swb = deduplicateIds_swb({ ...prev, rows });

            // propagate id change to dependants
            if (originalId && originalId !== updatedModule.id) {
                swb = {
                    ...swb,
                    rows: swb.rows.map(row =>
                        row.map(m => ({
                            ...m,
                            parentId: m.parentId === originalId ? updatedModule.id : m.parentId,
                            kcId: (m.kcId ?? '').split('|')
                                .map(k => (k === originalId ? updatedModule.id : k))
                                .join('|'),
                        }))
                    ),
                };
            }
            return swb;
        });
    }, []);

    // ── patch top-level project fields ────────────────────────────────────────

    const patchSwitchboard = useCallback((patch) => {
        setSwitchboard(prev => ({ ...prev, ...patch }));
    }, []);

    // ── schema functions util ─────────────────────────────────────────────────

    const getModuleById = useCallback((id) => {
        for (const row of switchboard.rows) {
            const m = row.find(m => m.id === id);
            if (m) return m;
        }
        return null;
    }, [switchboard.rows]);

    return {
        switchboard,
        setSwitchboard,
        isEmpty,
        allIds,
        lastFreeId,
        schemaFunctions,

        // project
        createProject,
        resetProject,
        verifyVersion,
        importProject,
        exportProject,
        patchSwitchboard,

        // modules
        applyEditorResult,
        applyModuleUpdate,
        moduleClear,
        moduleInsert,
        moduleGrow,
        moduleShrink,
        moduleMoveLeft,
        moduleMoveRight,
        moduleSetHalf,
        getModuleById,

        // rows
        rowAddAfter,
        rowDelete,

        // id management
        reassignAllParents,
        reassignModules,

        // helpers exposed for Editor
        DEFAULT_MODULE,
        DEFAULT_MODULE_ID,
        normTheme,
    };
}
