/**
 * OpenRouter chat client — OpenAI-compatible, multi-model routing. Optional:
 * every call returns null when OPENROUTER_API_KEY is unset or the request
 * fails, so callers must carry a non-LLM fallback (e.g. the deterministic
 * Oracle narrative) the way Groq does.
 *
 * Use as a second-line fallback after Groq: different vendors, different
 * rate limits, different model availability. The conflict-tracker never
 * depends on a single LLM vendor for any visible output.
 *
 * OPENROUTER_MODEL (optional, default 'anthropic/claude-3.5-sonnet')
 * OPENROUTER_API_KEY (required to enable)
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

export const isOpenRouterEnabled = () => Boolean(process.env.OPENROUTER_API_KEY);

export const openrouterModel = () => DEFAULT_MODEL;

/**
 * @param messages OpenAI-style [{role, content}]
 * @returns assistant text, or null on missing key / error / timeout.
 */
export const openrouterChat = async (messages, { temperature = 0.4, maxTokens = 700, allowExternalAi = false } = {}) => {
    if (allowExternalAi !== true) return null;
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
                // OpenRouter ranks apps by these. Use the dashboard hostname so
                // calls land on the dashboard's OpenRouter stats, not "unknown".
                'HTTP-Referer': 'https://globalmonitor.nonarkara.org/',
                'X-Title': 'GlobeWatch Oracle'
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages,
                temperature,
                max_tokens: maxTokens
            }),
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) {
            console.error(`[openrouter] HTTP ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error(`[openrouter] request failed: ${error?.name || 'Error'}`);
        return null;
    }
};
