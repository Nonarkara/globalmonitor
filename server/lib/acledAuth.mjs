/**
 * ACLED authentication (myACLED OAuth).
 *
 * ACLED retired the legacy `?key=&email=` API on 15 Sep 2025. Programmatic
 * access now needs an OAuth password-grant token from
 * https://acleddata.com/oauth/token (valid 24 h), sent as a Bearer header to
 * https://acleddata.com/api/acled/read. Credentials are the myACLED account
 * email + password, read at call time from ACLED_EMAIL / ACLED_PASSWORD.
 * A legacy ACLED_API_KEY alone cannot authenticate any more.
 *
 * Never log or return the credentials or the token.
 */
export const ACLED_READ_URL = 'https://acleddata.com/api/acled/read';
const ACLED_TOKEN_URL = 'https://acleddata.com/oauth/token';

let tokenCache = null; // { token, expiresAt, email }

export const acledCredentials = () => {
    const email = process.env.ACLED_EMAIL || '';
    const password = process.env.ACLED_PASSWORD || '';
    return { email, password, configured: Boolean(email && password) };
};

export const missingAcledVars = () => {
    const { email, password } = acledCredentials();
    return [!email && 'ACLED_EMAIL', !password && 'ACLED_PASSWORD'].filter(Boolean);
};

export const getAcledToken = async ({ fetchImpl = fetch } = {}) => {
    const { email, password, configured } = acledCredentials();
    if (!configured) return null;
    if (tokenCache && tokenCache.email === email && tokenCache.expiresAt > Date.now() + 60_000) {
        return tokenCache.token;
    }
    const body = new URLSearchParams({
        username: email,
        password,
        grant_type: 'password',
        client_id: 'acled',
        scope: 'authenticated',
    });
    const res = await fetchImpl(ACLED_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`ACLED auth: HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.access_token) throw new Error('ACLED auth: no token in response');
    const ttlMs = (Number(json.expires_in) || 86400) * 1000;
    tokenCache = { token: json.access_token, expiresAt: Date.now() + ttlMs, email };
    return tokenCache.token;
};

export const resetAcledTokenCache = () => { tokenCache = null; };

/** ACLED's filter syntax for several values of one field: a:OR:field=b */
export const acledOr = (field, values) => values.join(`:OR:${field}=`);
