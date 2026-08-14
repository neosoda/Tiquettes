/**
 * aiService.js
 * Service IA compatible OpenAI (FreeLLM local, OpenRouter, etc.)
 * Configuration via variables d'environnement VITE_AI_*
 */

const AI_BASE_URL = import.meta.env.VITE_AI_BASE_URL || 'http://192.168.1.201:3001/v1';
const AI_API_KEY  = import.meta.env.VITE_AI_API_KEY  || '';
const AI_MODEL    = import.meta.env.VITE_AI_MODEL    || 'mistralai/mistral-7b-instruct:free';
const AI_ENABLED  = import.meta.env.VITE_AI_ENABLED  !== 'false';

/**
 * Envoie une liste de messages au LLM et retourne la réponse texte.
 *
 * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages
 * @param {object} [options]
 * @param {string}  [options.model]       - Surcharge le modèle par défaut
 * @param {number}  [options.temperature] - Créativité (0–2, défaut 0.7)
 * @param {number}  [options.maxTokens]   - Limite de tokens (défaut 1024)
 * @param {AbortSignal} [options.signal]  - Pour annuler la requête
 * @returns {Promise<string>} Texte de la réponse
 */
export async function chatCompletion(messages, options = {}) {
  if (!AI_ENABLED) {
    throw new Error('AI_DISABLED');
  }

  const {
    model       = AI_MODEL,
    temperature = 0.7,
    maxTokens   = 1024,
    signal,
  } = options;

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`AI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Génère une suggestion de nom/description pour un module électrique.
 *
 * @param {object} module - Données du module (type, courant, pôles, etc.)
 * @returns {Promise<{id?: string, text?: string, desc?: string}>}
 */
export async function suggestModuleLabel(module) {
  const systemPrompt = `Tu es un expert en électricité industrielle et résidentielle.
Tu aides à nommer des modules dans un tableau électrique (disjoncteurs, contacteurs, relais, etc.).
Réponds uniquement en JSON valide avec les champs : id (identifiant court ≤4 car), text (libellé court), desc (description).
Pas de markdown, pas d'explication.`;

  const userPrompt = `Module : type="${module.type || ''}", courant="${module.current || ''}", 
pôles="${module.poles || ''}", fonction="${module.function || ''}", parent="${module.parent || ''}".
Propose un id, text et desc adaptés.`;

  const raw = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt },
  ], { temperature: 0.4, maxTokens: 200 });

  try {
    // Extrait le JSON même si le modèle ajoute du texte autour
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

/**
 * Vérifie que l'API IA est accessible.
 * @returns {Promise<boolean>}
 */
export async function checkAIConnection() {
  try {
    await chatCompletion(
      [{ role: 'user', content: 'ping' }],
      { maxTokens: 5, temperature: 0 }
    );
    return true;
  } catch {
    return false;
  }
}

export const aiConfig = {
  enabled:  AI_ENABLED,
  baseUrl:  AI_BASE_URL,
  model:    AI_MODEL,
};
