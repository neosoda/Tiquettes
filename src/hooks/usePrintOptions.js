'use strict';

/**
 * usePrintOptions — manages print/PDF export configuration.
 * Extracted from App.jsx getSavedPrintOptions / printOptions state.
 * Persists to sessionStorage automatically on every change.
 */

import { useCallback, useEffect, useState } from 'react';
import * as pkg from '../../package.json';

const STORAGE_KEY = `${pkg.name}_printOptions`;

/** @returns {import('../types/index.js').PrintOptions} */
function buildDefaults() {
    return {
        firstPage: false,
        labels: true,
        summary: false,
        schema: false,
        freeModules: false,
        pdfOptions: {
            openWindow: true,
            autoPrint: false,
            schemaGridColor: [230, 230, 230],
            labelsCutLines: true,
            printCurrents: false,
            labelsPrintFormat: 'A4',
            schemaPrintFormat: 'A4',
            summaryPrintFormat: 'A4',
        },
        firstPageOptions: {
            photo: false,
            name: false,
            siret: false,
            postalAddress: false,
            contacts: false,
            phones: false,
            projectName: true,
            projectRevision: true,
            projectCreated: true,
            projectUpdated: true,
            projectElectricalType: true,
            projectElectricalVoltage: true,
        },
    };
}

function deepMerge(base, override) {
    return Object.entries(override).reduce((acc, [k, v]) => ({
        ...acc,
        [k]: v && typeof v === 'object' && !Array.isArray(v)
            ? deepMerge(acc[k] ?? {}, v)
            : v,
    }), { ...base });
}

function loadFromSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) return deepMerge(buildDefaults(), JSON.parse(raw));
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
    }
    return buildDefaults();
}

/**
 * @returns {{
 *   printOptions: import('../types/index.js').PrintOptions,
 *   setPrintOption: (path: string[], value: *) => void,
 *   setPrintOptions: (opts: Partial<import('../types/index.js').PrintOptions>) => void,
 *   resetPrintOptions: () => void,
 * }}
 */
export function usePrintOptions() {
    const [printOptions, setPrintOptionsState] = useState(loadFromSession);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(printOptions));
        } catch {
            // quota exceeded
        }
    }, [printOptions]);

    // Set a single option at any depth via dot-path array
    // e.g. setPrintOption(['pdfOptions', 'autoPrint'], true)
    const setPrintOption = useCallback((path, value) => {
        setPrintOptionsState(prev => {
            if (path.length === 1) return { ...prev, [path[0]]: value };
            if (path.length === 2) return {
                ...prev,
                [path[0]]: { ...prev[path[0]], [path[1]]: value },
            };
            return prev;
        });
    }, []);

    const setPrintOptions = useCallback((partial) => {
        setPrintOptionsState(prev => deepMerge(prev, partial));
    }, []);

    const resetPrintOptions = useCallback(() => {
        setPrintOptionsState(buildDefaults());
    }, []);

    return { printOptions, setPrintOption, setPrintOptions, resetPrintOptions };
}
