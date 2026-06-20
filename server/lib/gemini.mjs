import axios from 'axios';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Generate a concise intelligence summary from a list of news headlines.
 * Returns null if the key is missing or the call fails (caller falls back to static summary).
 *
 * @param {string} topic - Briefing topic label (e.g. "Iran strikes")
 * @param {Array<{title: string, source: string}>} items - Top ranked news items
 * @returns {Promise<string|null>}
 */
export const generateBriefingSummary = async (topic, items) => {
    if (!isConfigured() || !items?.length) return null;

    const headlines = items
        .slice(0, 8)
        .map((item, i) => `${i + 1}. [${item.source}] ${item.title}`)
        .join('\n');

    const prompt = `You are an intelligence analyst producing a classified briefing summary.
Topic: ${topic}
Latest signals (ranked by source credibility + recency):
${headlines}

Write a single dense paragraph (3–4 sentences) synthesising the key developments. Use precise language. No filler. No "based on the above". Output only the paragraph.`;

    try {
        const response = await axios.post(
            `${GEMINI_BASE}/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 256 }
            },
            { timeout: 10000 }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return typeof text === 'string' ? text.trim() : null;
    } catch (err) {
        console.error(`[GEMINI] summary failed for "${topic}": ${err.message}`);
        return null;
    }
};
