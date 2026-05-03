/**
 * useClipboard — module copy / cut / paste / swap operations.
 * Requires a reference to setSwitchboard from useSwitchboard.
 */

import { useCallback, useState } from 'react';

/**
 * @param {object} swbRef - { switchboard, setSwitchboard }
 */
export function useClipboard({ switchboard, setSwitchboard }) {
    const [clipboard, setClipboard] = useState(null);
    const [clipboardMode, setClipboardMode] = useState(null); // 'copy' | 'cut' | 'inter'

    const clear = useCallback(() => {
        setClipboard(null);
        setClipboardMode(null);
    }, []);

    // ── paste eligibility ─────────────────────────────────────────────────────

    /**
     * Returns true when a paste at [rowIndex, moduleIndex] is allowed.
     * Rules: target must have enough consecutive empty slots to fit the clipboard module's span.
     */
    const pasteAllowed = useCallback((rowIndex, moduleIndex) => {
        if (!clipboard || !switchboard) return false;
        const row = switchboard.rows[rowIndex];
        if (!row) return false;
        const span = clipboard.span ?? 1;
        if (moduleIndex + span > row.length) return false;
        for (let i = 0; i < span; i++) {
            if (!row[moduleIndex + i]?.free) return false;
        }
        return true;
    }, [clipboard, switchboard]);

    const interAllowed = useCallback((rowIndex, moduleIndex) => {
        if (clipboardMode !== 'inter' || !clipboard || !switchboard) return false;
        const m = switchboard.rows[rowIndex]?.[moduleIndex];
        if (!m) return false;
        return m.span === clipboard.span;
    }, [clipboard, clipboardMode, switchboard]);

    // ── operations ────────────────────────────────────────────────────────────

    const copy = useCallback((rowIndex, moduleIndex) => {
        const m = switchboard.rows[rowIndex]?.[moduleIndex];
        if (!m) return;
        setClipboard({ ...m });
        setClipboardMode('copy');
    }, [switchboard]);

    const cut = useCallback((rowIndex, moduleIndex) => {
        const m = switchboard.rows[rowIndex]?.[moduleIndex];
        if (!m) return;
        setClipboard({ ...m });
        setClipboardMode('cut');
    }, [switchboard]);

    const paste = useCallback((rowIndex, moduleIndex) => {
        if (!clipboard) return;
        const span = clipboard.span ?? 1;

        setSwitchboard(prev => {
            const rows = prev.rows.map((row, ri) => {
                if (ri !== rowIndex) return row;
                const newRow = [...row];
                // place the clipboard module at target
                newRow[moduleIndex] = { ...clipboard };
                // clear slots covered by span (beyond the first)
                for (let i = 1; i < span; i++) {
                    if (moduleIndex + i < newRow.length) {
                        newRow[moduleIndex + i] = {
                            id: '', icon: null, text: '', desc: '', func: '', type: '',
                            crb: '', modtype: '', current: '', sensibility: '', coef: 0.5,
                            pole: '', wire: '', line: '', grp: '', parentId: '', kcId: '',
                            partialKc: false, free: true, span: 1, half: 'none',
                        };
                    }
                }
                return newRow;
            });
            return { ...prev, rows };
        });

        // if cut: clear the source
        if (clipboardMode === 'cut') {
            clear();
        }
    }, [clipboard, clipboardMode, setSwitchboard, clear]);

    const startInter = useCallback((rowIndex, moduleIndex) => {
        const m = switchboard.rows[rowIndex]?.[moduleIndex];
        if (!m) return;
        setClipboard({ ...m, _sourceRow: rowIndex, _sourceModule: moduleIndex });
        setClipboardMode('inter');
    }, [switchboard]);

    const inter = useCallback((rowIndex, moduleIndex) => {
        if (!clipboard || clipboardMode !== 'inter') return;
        const { _sourceRow, _sourceModule } = clipboard;

        setSwitchboard(prev => {
            const rows = prev.rows.map(row => [...row]);
            const a = { ...rows[_sourceRow][_sourceModule] };
            const b = { ...rows[rowIndex][moduleIndex] };
            rows[_sourceRow][_sourceModule] = b;
            rows[rowIndex][moduleIndex] = a;
            return { ...prev, rows };
        });

        clear();
    }, [clipboard, clipboardMode, setSwitchboard, clear]);

    return {
        clipboard,
        clipboardMode,
        clear,
        copy,
        cut,
        paste,
        startInter,
        inter,
        pasteAllowed,
        interAllowed,
    };
}
