'use strict';

/**
 * Centralized API client for VPanel.
 *
 * Replaces scattered axios calls in SpaceProvider, scanner/openrouter.js,
 * and public/api/stats.js with a single, testable, typed interface.
 *
 * All methods return Promises. Callers handle UI feedback.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_APP_API_URL ?? '/api/';

// ─── Internal transport ───────────────────────────────────────────────────────

/**
 * @param {string} endpoint  - Relative path (e.g. "toPdf.php")
 * @param {Object} body      - Form fields
 * @param {Object} [headers] - Extra request headers
 * @returns {Promise<Object>}
 */
async function post(endpoint, body = {}, headers = {}) {
    const url = BASE_URL + endpoint;

    const response = await axios.post(url, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers,
        },
        timeout: 30_000,
    });

    const data = response.data;

    if (data?.error) throw new Error(data.error);

    return data;
}

// ─── Cloud project API (Space) ────────────────────────────────────────────────

/**
 * @param {string} ufiid
 * @returns {Promise<{ project: Object, params: Object, printOptions: Object, instanceId: string }>}
 */
export async function loadProject(ufiid) {
    const data = await post('load.php', {}, { 'X-UFIID': ufiid });

    if (!data.instanceId || data.instanceId !== ufiid || !data.project) {
        throw new Error('Réponse serveur invalide lors du chargement du projet.');
    }
    if (!data.project.switchboard) {
        throw new Error('Document de projet corrompu.');
    }

    return data;
}

/**
 * @param {string} ufiid
 * @param {Object} switchboard
 * @returns {Promise<void>}
 */
export async function saveProject(ufiid, switchboard) {
    const data = await post(
        'save.php',
        { switchboard: JSON.stringify(switchboard) },
        { 'X-UFIID': ufiid }
    );

    if (!data.instanceId || data.instanceId !== ufiid || !data.ok) {
        throw new Error('Impossible de sauvegarder ce projet.');
    }
}

// ─── Statistics API ───────────────────────────────────────────────────────────

/**
 * Fire-and-forget analytics — errors are silenced intentionally.
 * @param {string} name
 */
export function trackAction(name) {
    post('action.php', { action: name }).catch(() => {});
}

/**
 * Fire-and-forget choice tracking.
 * @param {string} name
 * @param {string[]} keys
 */
export function trackChoices(name, keys) {
    if (!keys?.length) return;
    post('choices.php', { name, keys: keys.join(',') }).catch(() => {});
}

/**
 * Fire-and-forget visit tracking.
 */
export function trackVisit() {
    post('visit.php').catch(() => {});
}

// ─── PDF export ───────────────────────────────────────────────────────────────

/**
 * Request server-side PDF generation and return a blob URL or open a window.
 * @param {Object} payload - { switchboard, printOptions, … }
 * @returns {Promise<string>} URL to the generated PDF
 */
export async function generatePdf(payload) {
    const response = await axios.post(BASE_URL + 'toPdf.php', payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseType: 'blob',
        timeout: 60_000,
    });

    if (response.data.type === 'application/pdf') {
        return URL.createObjectURL(response.data);
    }

    // Server returned JSON error
    const text = await response.data.text();
    throw new Error(JSON.parse(text)?.error ?? 'Erreur de génération PDF.');
}

// ─── Health ───────────────────────────────────────────────────────────────────

/** @returns {Promise<boolean>} */
export async function checkHealth() {
    try {
        const data = await post('health.php');
        return data?.ok === true;
    } catch {
        return false;
    }
}

// ─── Error message factory ────────────────────────────────────────────────────

/**
 * Convert an Axios/fetch error into a user-facing French message.
 * @param {Error} error
 * @returns {{ code: string, message: string, text: string }}
 */
export function formatApiError(error) {
    if (error?.response) {
        return {
            code: 'RESPONSE_ERROR',
            message: error.message ?? '',
            text: "Oh là, il semble que la réponse du serveur ne corresponde pas à la demande.<br /><br />Impossible de traiter cette action.",
        };
    }
    if (error?.request) {
        return {
            code: 'REQUEST_ERROR',
            message: error.message ?? '',
            text: "Aucune réponse reçue du serveur. Vérifiez votre connexion et réessayez.<br /><br />Si le problème persiste, contactez-nous.",
        };
    }
    return {
        code: 'COMMON_ERROR',
        message: error?.message ?? '',
        text: "Une erreur inattendue s'est produite.",
    };
}
