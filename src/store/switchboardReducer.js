'use strict';

/**
 * Pure reducer for all switchboard state mutations.
 * Every case returns a NEW object — never mutates in place.
 *
 * Action types mirror the handler names in App.jsx so migration
 * can be done incrementally: replace setSwitchboard(fn) calls one by one.
 */

/** @param {import('../types/index.js').Module[][]} rows */
const cloneRows = (rows) => rows.map(row => [...row]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findModulePosition(rows, predicate) {
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            if (predicate(rows[r][c])) return { r, c };
        }
    }
    return null;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

/**
 * @param {import('../types/index.js').Switchboard} state
 * @param {{ type: string, payload: * }} action
 * @returns {import('../types/index.js').Switchboard}
 */
export function switchboardReducer(state, action) {
    switch (action.type) {

        // ── Project metadata ──────────────────────────────────────────────────

        case 'SET_NAME':
            return { ...state, prjname: action.payload, prjupdated: new Date() };

        case 'SET_PROJECT_TYPE':
            return { ...state, projectType: action.payload, prjupdated: new Date() };

        case 'SET_VREF':
            return { ...state, vref: action.payload, prjupdated: new Date() };

        case 'SET_THEME':
            return { ...state, theme: action.payload, prjupdated: new Date() };

        case 'TOUCH':
            return { ...state, prjupdated: new Date(), prjversion: state.prjversion + 1 };

        // ── Layout ────────────────────────────────────────────────────────────

        case 'SET_LAYOUT': {
            // payload: { rows: Module[][], stepsPerRows, height, stepSize }
            const { rows, stepsPerRows, height, stepSize } = action.payload;
            return {
                ...state,
                rows: rows ?? state.rows,
                stepsPerRows: stepsPerRows ?? state.stepsPerRows,
                height: height ?? state.height,
                stepSize: stepSize ?? state.stepSize,
                prjupdated: new Date(),
            };
        }

        case 'ADD_ROW': {
            const emptyRow = Array(state.stepsPerRows).fill(null).map(() => ({
                id: '',
                icon: null, text: '', desc: '', func: '', type: '', crb: '',
                modtype: '', current: '', sensibility: '', coef: 0.5,
                pole: '', wire: '', line: '', grp: '', parentId: '', kcId: '',
                partialKc: false, free: true, span: 1, half: 'none',
            }));
            return { ...state, rows: [...state.rows, emptyRow], prjupdated: new Date() };
        }

        case 'REMOVE_ROW': {
            const { rowIndex } = action.payload;
            if (state.rows.length <= 1) return state;
            const rows = state.rows.filter((_, i) => i !== rowIndex);
            return { ...state, rows, prjupdated: new Date() };
        }

        // ── Module CRUD ───────────────────────────────────────────────────────

        case 'UPDATE_MODULE': {
            const { r, c, module } = action.payload;
            const rows = cloneRows(state.rows);
            rows[r][c] = { ...rows[r][c], ...module };
            return { ...state, rows, prjupdated: new Date() };
        }

        case 'CLEAR_MODULE': {
            const { r, c } = action.payload;
            const rows = cloneRows(state.rows);
            rows[r][c] = {
                id: '', icon: null, text: '', desc: '', func: '', type: '', crb: '',
                modtype: '', current: '', sensibility: '', coef: 0.5,
                pole: '', wire: '', line: '', grp: '', parentId: '', kcId: '',
                partialKc: false, free: true, span: 1, half: 'none',
            };
            return { ...state, rows, prjupdated: new Date() };
        }

        case 'SWAP_MODULES': {
            const { from, to } = action.payload; // { r, c }
            const rows = cloneRows(state.rows);
            const tmp = rows[from.r][from.c];
            rows[from.r][from.c] = rows[to.r][to.c];
            rows[to.r][to.c] = tmp;
            return { ...state, rows, prjupdated: new Date() };
        }

        case 'PASTE_MODULE': {
            const { r, c, module, mode } = action.payload; // mode: 'copy'|'cut'
            const rows = cloneRows(state.rows);
            const target = rows[r][c];
            if (!target) return state;

            if (mode === 'cut') {
                // find source and clear it
                const pos = findModulePosition(state.rows, m => m === action.payload.source);
                if (pos) rows[pos.r][pos.c] = {
                    ...rows[pos.r][pos.c],
                    id: '', icon: null, text: '', desc: '', func: '', type: '', crb: '',
                    modtype: '', current: '', sensibility: '', coef: 0.5,
                    pole: '', wire: '', line: '', grp: '', parentId: '', kcId: '',
                    partialKc: false, free: true, span: 1, half: 'none',
                };
            }

            rows[r][c] = { ...module, id: target.id };
            return { ...state, rows, prjupdated: new Date() };
        }

        // ── ID management ─────────────────────────────────────────────────────

        case 'REASSIGN_ALL_IDS': {
            // payload: { defaultModuleId: string }
            const { defaultModuleId } = action.payload;
            let counters = {};
            let from = {};

            let rows = state.rows.map(row => row.map(module => {
                if (module.free) return { ...module, id: '' };

                let func = (module.func ?? '').trim().toUpperCase();
                if (!func) func = defaultModuleId;

                counters[func] = (counters[func] ?? 0) + 1;
                const newId = `${func}${counters[func]}`;
                from[module.id] = newId;
                return { ...module, id: newId };
            }));

            // re-assign parent references
            rows = rows.map(row => row.map(module => ({
                ...module,
                parentId: from[module.parentId] ?? module.parentId,
                kcId: (module.kcId ?? '').split('|')
                    .map(k => from[k] ?? k)
                    .filter(Boolean)
                    .join('|'),
            })));

            return { ...state, rows, prjupdated: new Date() };
        }

        case 'AUTO_FIX_DUPLICATE_IDS': {
            const { defaultModuleId } = action.payload;
            let ids = [];
            const rows = state.rows.map(row => row.map(module => {
                if (module.free) return { ...module, id: '' };
                if (!module.id.trim()) {
                    let count = 1;
                    while (ids.includes(`${defaultModuleId}${count}`)) count++;
                    const newId = `${defaultModuleId}${count}`;
                    ids.push(newId);
                    return { ...module, id: newId };
                }
                ids.push(module.id.trim());
                return module;
            }));
            return { ...state, rows };
        }

        case 'REASSIGN_PARENT_REFS': {
            const { originalId, newId } = action.payload;
            if (!originalId || originalId === newId) return state;
            const rows = state.rows.map(row => row.map(module => ({
                ...module,
                parentId: module.parentId === originalId ? newId : module.parentId,
                kcId: (module.kcId ?? '').split('|')
                    .map(k => k === originalId ? newId : k)
                    .filter(Boolean)
                    .join('|'),
            })));
            return { ...state, rows, prjupdated: new Date() };
        }

        // ── Flags ─────────────────────────────────────────────────────────────

        case 'TOGGLE_FLAG': {
            const { flag } = action.payload;
            const boolFlags = [
                'withDb', 'withGroundLine', 'schemaMonitor', 'switchboardMonitor',
                'summaryColumnRow', 'summaryColumnPosition', 'summaryColumnType',
                'summaryColumnId', 'summaryColumnFunction', 'summaryColumnLabel',
                'summaryColumnDescription',
            ];
            if (!boolFlags.includes(flag)) return state;
            return { ...state, [flag]: !state[flag], prjupdated: new Date() };
        }

        case 'SET_FLAG': {
            const { flag, value } = action.payload;
            return { ...state, [flag]: value, prjupdated: new Date() };
        }

        // ── DB module ─────────────────────────────────────────────────────────

        case 'UPDATE_DB':
            return { ...state, db: { ...state.db, ...action.payload }, prjupdated: new Date() };

        // ── Full replace (import / load from space) ───────────────────────────

        case 'LOAD':
            return { ...action.payload, prjupdated: new Date() };

        case 'RESET':
            return { ...action.payload };

        default:
            return state;
    }
}
