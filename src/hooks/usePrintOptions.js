/**
 * usePrintOptions — manages print configuration with sessionStorage persistence.
 */

import { useMemo, useState } from 'react';
import * as pkg from '../../package.json';

const STORAGE_KEY = `${pkg.name}_printOptions`;

function deepMerge(base, override) {
    return [base, override].reduce((result, obj) =>
        Object.entries(obj).reduce((q, [k, v]) => ({
            ...q,
            [k]: v && typeof v === 'object' && !Array.isArray(v)
                ? deepMerge(q[k] ?? {}, v)
                : v,
        }), result),
    {});
}

const DEFAULT_PRINT_OPTIONS = {
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

function loadFromSession() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRINT_OPTIONS };
    try {
        return deepMerge(DEFAULT_PRINT_OPTIONS, JSON.parse(raw));
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return { ...DEFAULT_PRINT_OPTIONS };
    }
}

export function usePrintOptions() {
    const [printOptions, _setPrintOptions] = useState(loadFromSession);

    const setPrintOptions = (updater) => {
        _setPrintOptions(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const resetPrintOptions = () => setPrintOptions({ ...DEFAULT_PRINT_OPTIONS });

    const patchPrintOptions = (patch) => {
        setPrintOptions(prev => deepMerge(prev, patch));
    };

    const defaults = useMemo(() => DEFAULT_PRINT_OPTIONS, []);

    return {
        printOptions,
        setPrintOptions,
        resetPrintOptions,
        patchPrintOptions,
        defaults,
    };
}
