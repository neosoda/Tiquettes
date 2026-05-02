'use strict';

/**
 * useSwitchboard — drop-in replacement for the inline setSwitchboard logic
 * scattered throughout App.jsx.
 *
 * Wraps useReducer(switchboardReducer) and exposes:
 *  - state: current Switchboard
 *  - dispatch: raw reducer dispatch (escape hatch)
 *  - helpers: named action creators for common operations
 *
 * Migration path: import { useSwitchboard } and replace individual
 * setSwitchboard(fn) calls with the corresponding helper.
 */

import { useCallback, useReducer, useMemo } from 'react';
import { switchboardReducer } from '../store/switchboardReducer.js';
import { isSwitchboard, validateSwitchboard } from '../types/index.js';

import * as pkg from '../../package.json';

// ─── Session persistence key ──────────────────────────────────────────────────
const STORAGE_KEY = pkg.name;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {import('../types/index.js').Switchboard} initialSwitchboard
 * @returns {{ state, dispatch, isEmpty, allIds, helpers }}
 */
export function useSwitchboard(initialSwitchboard) {
    const [state, dispatch] = useReducer(switchboardReducer, initialSwitchboard);

    // ── Derived values ────────────────────────────────────────────────────────

    const isEmpty = useMemo(() => {
        for (const row of state.rows) {
            for (const mod of row) {
                if (!mod.free) return false;
            }
        }
        return true;
    }, [state.rows]);

    const allIds = useMemo(() => {
        const ids = [];
        for (const row of state.rows) {
            for (const mod of row) {
                if (!mod.free && mod.id.trim()) ids.push(mod.id.trim());
            }
        }
        return ids;
    }, [state.rows]);

    // ── Persistence ───────────────────────────────────────────────────────────

    const persist = useCallback((swb) => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(swb ?? state));
        } catch {
            // quota exceeded — silent
        }
    }, [state]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const helpers = {
        setName: useCallback((name) => dispatch({ type: 'SET_NAME', payload: name }), []),
        setProjectType: useCallback((t) => dispatch({ type: 'SET_PROJECT_TYPE', payload: t }), []),
        setVref: useCallback((v) => dispatch({ type: 'SET_VREF', payload: v }), []),
        setTheme: useCallback((theme) => dispatch({ type: 'SET_THEME', payload: theme }), []),

        updateModule: useCallback((r, c, module) =>
            dispatch({ type: 'UPDATE_MODULE', payload: { r, c, module } }), []),

        clearModule: useCallback((r, c) =>
            dispatch({ type: 'CLEAR_MODULE', payload: { r, c } }), []),

        swapModules: useCallback((from, to) =>
            dispatch({ type: 'SWAP_MODULES', payload: { from, to } }), []),

        pasteModule: useCallback((r, c, module, mode, source) =>
            dispatch({ type: 'PASTE_MODULE', payload: { r, c, module, mode, source } }), []),

        addRow: useCallback(() =>
            dispatch({ type: 'ADD_ROW' }), []),

        removeRow: useCallback((rowIndex) =>
            dispatch({ type: 'REMOVE_ROW', payload: { rowIndex } }), []),

        setLayout: useCallback((layout) =>
            dispatch({ type: 'SET_LAYOUT', payload: layout }), []),

        reassignAllIds: useCallback((defaultModuleId) =>
            dispatch({ type: 'REASSIGN_ALL_IDS', payload: { defaultModuleId } }), []),

        autoFixDuplicateIds: useCallback((defaultModuleId) =>
            dispatch({ type: 'AUTO_FIX_DUPLICATE_IDS', payload: { defaultModuleId } }), []),

        reassignParentRefs: useCallback((originalId, newId) =>
            dispatch({ type: 'REASSIGN_PARENT_REFS', payload: { originalId, newId } }), []),

        toggleFlag: useCallback((flag) =>
            dispatch({ type: 'TOGGLE_FLAG', payload: { flag } }), []),

        setFlag: useCallback((flag, value) =>
            dispatch({ type: 'SET_FLAG', payload: { flag, value } }), []),

        updateDb: useCallback((db) =>
            dispatch({ type: 'UPDATE_DB', payload: db }), []),

        load: useCallback((swb) => {
            const errors = validateSwitchboard(swb);
            if (errors.length) {
                console.error('[useSwitchboard] load rejected:', errors);
                return false;
            }
            dispatch({ type: 'LOAD', payload: swb });
            return true;
        }, []),

        reset: useCallback((defaultSwb) =>
            dispatch({ type: 'RESET', payload: defaultSwb }), []),

        // Next available ID for a given prefix
        nextId: useCallback((prefix, existingIds = allIds) => {
            let n = 1;
            while (existingIds.includes(`${prefix}${n}`)) n++;
            return `${prefix}${n}`;
        }, [allIds]),

        // Validate current state
        validate: useCallback(() => validateSwitchboard(state), [state]),

        // Check structural integrity
        isValid: useCallback(() => isSwitchboard(state), [state]),

        persist,
    };

    return { state, dispatch, isEmpty, allIds, helpers };
}
