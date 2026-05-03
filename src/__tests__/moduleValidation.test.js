import { describe, it, expect } from 'vitest';
import {
    validateModuleId,
    validateModuleIdUniqueness,
    deduplicateIds,
    computeSpaceStats,
} from '../utils/moduleValidation.js';

// ─── validateModuleId ─────────────────────────────────────────────────────────

describe('validateModuleId', () => {
    it('accepts alphanumeric id', () => {
        expect(validateModuleId('Q1')).toEqual([]);
        expect(validateModuleId('DB')).toEqual([]);
        expect(validateModuleId('KM_01')).toEqual([]);
    });

    it('rejects empty or blank id', () => {
        expect(validateModuleId('')).toHaveLength(1);
        expect(validateModuleId('   ')).toHaveLength(1);
        expect(validateModuleId(null)).toHaveLength(1);
    });

    it('rejects special characters', () => {
        expect(validateModuleId('Q-1')).toHaveLength(1);
        expect(validateModuleId('Q 1')).toHaveLength(1);
    });
});

// ─── validateModuleIdUniqueness ───────────────────────────────────────────────

describe('validateModuleIdUniqueness', () => {
    const existing = ['Q1', 'Q2', 'K1'];

    it('allows the module to keep its own id', () => {
        expect(validateModuleIdUniqueness('Q1', 'Q1', existing)).toEqual([]);
    });

    it('rejects an id already used by another module', () => {
        expect(validateModuleIdUniqueness('Q2', 'Q1', existing)).toHaveLength(1);
    });

    it('allows a new unique id', () => {
        expect(validateModuleIdUniqueness('Q3', 'Q1', existing)).toEqual([]);
    });

    it('is case-insensitive', () => {
        expect(validateModuleIdUniqueness('q1', 'Q5', existing)).toHaveLength(1);
    });
});

// ─── deduplicateIds ───────────────────────────────────────────────────────────

describe('deduplicateIds', () => {
    it('clears ids on free modules', () => {
        const rows = [[{ id: 'Q1', free: true }]];
        const result = deduplicateIds(rows, 'Q');
        expect(result[0][0].id).toBe('');
    });

    it('generates id for module with blank id', () => {
        const rows = [[{ id: '', free: false }]];
        const result = deduplicateIds(rows, 'Q');
        expect(result[0][0].id).toBe('Q1');
    });

    it('renames duplicate ids with _N suffix', () => {
        const rows = [[
            { id: 'Q1', free: false },
            { id: 'Q1', free: false },
        ]];
        const result = deduplicateIds(rows, 'Q');
        const ids = result[0].map(m => m.id);
        expect(ids[0]).toBe('Q1');
        expect(ids[1]).toBe('Q1_1');
    });

    it('handles multiple rows', () => {
        const rows = [
            [{ id: 'Q1', free: false }],
            [{ id: 'Q1', free: false }],
        ];
        const result = deduplicateIds(rows, 'Q');
        expect(result[0][0].id).toBe('Q1');
        expect(result[1][0].id).toBe('Q1_1');
    });

    it('does not mutate the input', () => {
        const row = [{ id: 'Q1', free: false }];
        const rows = [row];
        deduplicateIds(rows, 'Q');
        expect(rows[0]).toBe(row);
    });
});

// ─── computeSpaceStats ────────────────────────────────────────────────────────

describe('computeSpaceStats', () => {
    it('counts used span correctly', () => {
        const rows = [[
            { free: false, span: 2 },
            { free: true,  span: 1 },
            { free: false, span: 1 },
        ]];
        const stats = computeSpaceStats(rows, 3);
        expect(stats.used).toBe(3);
        expect(stats.total).toBe(3);
        expect(stats.percentFree).toBe(0);
        expect(stats.compliant).toBe(false);
    });

    it('reports compliant when >= 20% free', () => {
        const rows = [[
            { free: false, span: 1 },
            { free: true,  span: 1 },
            { free: true,  span: 1 },
            { free: true,  span: 1 },
            { free: true,  span: 1 },
        ]];
        const stats = computeSpaceStats(rows, 5);
        expect(stats.percentFree).toBe(80);
        expect(stats.compliant).toBe(true);
    });

    it('reports non-compliant at exactly 19% free', () => {
        // 81 used / 100 total = 19% free
        const usedModules = Array.from({ length: 81 }, () => ({ free: false, span: 1 }));
        const freeModules = Array.from({ length: 19 }, () => ({ free: true,  span: 1 }));
        const rows = [[...usedModules, ...freeModules]];
        const stats = computeSpaceStats(rows, 100);
        expect(stats.percentFree).toBe(19);
        expect(stats.compliant).toBe(false);
    });

    it('handles empty rows', () => {
        const stats = computeSpaceStats([], 13);
        expect(stats.used).toBe(0);
        expect(stats.total).toBe(0);
        expect(stats.compliant).toBe(true);
    });
});
