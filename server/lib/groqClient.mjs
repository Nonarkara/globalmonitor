/**
 * Groq chat client — OpenAI-compatible, fast inference. Optional: every call
 * returns null when GROQ_API_KEY is unset or the request fails, so callers must
 * carry a non-LLM fallback. Powers the Oracle's narrative reports today and can
 * back any other summary task later.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const isGroqEnabled = () => Boolean(process.env.GROQ_API_KEY);

export const groqModel = () => DEFAULT_MODEL;

/**
 * @param messages OpenAI-style [{role, content}]
 * @returns assistant text, or null on missing key / error / timeout.
 */
export const groqChat = async (messages, { temperature = 0.4, maxTokens = 700, allowExternalAi = false } = {}) => {
    // A configured key is not permission to spend it. Public routes never set
    // this option; future trusted jobs need authentication and a shared budget.
    if (allowExternalAi !== true) return null;
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    try {
        const res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages,
                temperature,
                max_tokens: maxTokens,
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            console.error(`[groq] HTTP ${res.status}`);
            return null;
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error(`[groq] request failed: ${error?.name || 'Error'}`);
        return null;
    }
};
