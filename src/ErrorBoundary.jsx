/**
 * ErrorBoundary — production-grade class error boundary for VPanel.
 *
 * Catches render/lifecycle errors from any child tree and displays
 * a recoverable error screen instead of crashing the entire app.
 *
 * Usage in main.jsx:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */

'use strict';

import { Component } from 'react';
import * as pkg from '../package.json';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
        this.handleReset = this.handleReset.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Non-blocking: log to console without breaking the error screen
        console.error('[VPanel] Unhandled render error:', error, errorInfo);
    }

    handleReset() {
        // Clear session data and reload — safest recovery path
        try {
            sessionStorage.removeItem(pkg.name);
        } catch {
            // ignore
        }
        window.location.reload();
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const msg = this.state.error?.message ?? 'Erreur inconnue';

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '2rem',
                fontFamily: 'system-ui, sans-serif',
                background: '#f8f9fa',
                color: '#212529',
            }}>
                <div style={{
                    maxWidth: '560px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '2.5rem',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
                    <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                        {pkg.title} — Erreur inattendue
                    </h1>
                    <p style={{ color: '#6c757d', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        Une erreur interne a interrompu l&apos;application.
                        Votre projet local n&apos;est pas perdu — il est sauvegardé dans votre navigateur.
                    </p>
                    <p style={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        background: '#f1f3f5',
                        borderRadius: '4px',
                        padding: '0.75rem',
                        marginBottom: '1.5rem',
                        color: '#e03131',
                        textAlign: 'left',
                        wordBreak: 'break-word',
                    }}>
                        {msg}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '4px',
                                border: '1px solid #dee2e6',
                                background: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                        >
                            Recharger la page
                        </button>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#e03131',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                            }}
                        >
                            Réinitialiser (dernier recours)
                        </button>
                    </div>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#adb5bd' }}>
                        Si le problème persiste, signalez-le sur{' '}
                        <a href={pkg.repository.url} target="_blank" rel="noreferrer"
                            style={{ color: '#495057' }}>
                            GitHub
                        </a>.
                    </p>
                </div>
            </div>
        );
    }
}
