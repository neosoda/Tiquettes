/**
 Vpanel - Générateur d'étiquettes pour tableaux et armoires électriques
 Copyright (C) 2024-2026 Neosoda
 AGPL-3.0 — see LICENSE
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('[VPanel] Uncaught error:', error, info.componentStack);
    }

    handleReload() {
        sessionStorage.clear();
        window.location.reload();
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh', padding: '2rem',
                fontFamily: 'system-ui, sans-serif', textAlign: 'center',
                background: '#f8f9fa'
            }}>
                <div style={{
                    background: '#fff', border: '1px solid #dee2e6',
                    borderRadius: '8px', padding: '2rem', maxWidth: '480px',
                    boxShadow: '0 2px 8px rgba(0,0,0,.08)'
                }}>
                    <h2 style={{ color: '#dc3545', marginTop: 0 }}>Une erreur est survenue</h2>
                    <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
                        L&apos;application a rencontré un problème inattendu.
                        Votre projet local est conservé dans la session du navigateur.
                    </p>
                    <details style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                        <summary style={{ cursor: 'pointer', color: '#6c757d', fontSize: '0.875rem' }}>
                            Détails de l&apos;erreur
                        </summary>
                        <pre style={{
                            fontSize: '0.75rem', background: '#f8f9fa',
                            padding: '0.75rem', borderRadius: '4px',
                            overflow: 'auto', maxHeight: '200px', marginTop: '0.5rem'
                        }}>
                            {this.state.error?.message}
                            {'\n\n'}
                            {this.state.error?.stack}
                        </pre>
                    </details>
                    <button
                        onClick={this.handleReload}
                        style={{
                            background: '#0d6efd', color: '#fff', border: 'none',
                            borderRadius: '6px', padding: '0.5rem 1.25rem',
                            cursor: 'pointer', fontSize: '1rem', marginRight: '0.5rem'
                        }}
                    >
                        Recharger l&apos;application
                    </button>
                    <button
                        onClick={() => this.setState({ error: null })}
                        style={{
                            background: 'transparent', color: '#6c757d',
                            border: '1px solid #dee2e6', borderRadius: '6px',
                            padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '1rem'
                        }}
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }
}
