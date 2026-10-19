/**
 * axios → native fetch adapter for Cloudflare Pages Functions.
 *
 * axios >= 1.19 builds every fetch-adapter request with a default
 * `cache: 'default'` RequestInit field. The Workers runtime (compat date
 * 2024-09-23) throws on that field ("The 'cache' field on
 * 'RequestInitializerDict' is not implemented"), so EVERY axios call in a
 * Function failed — markets, ACLED, FX, crypto, STAC — not only the oil feed
 * that was ported by hand. This adapter sends the request with plain fetch()
 * and only the fields Workers implements. It is installed by router.mjs, i.e.
 * only on the Functions path; the Node dev server keeps axios' own adapter.
 */
import axios from 'axios';

const toHeaderObject = (headers) => {
    const raw = headers && typeof headers.toJSON === 'function' ? headers.toJSON() : (headers || {});
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value == null || value === false) continue;
        out[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return out;
};

const timeoutSignal = (config) => {
    const signals = [];
    if (config.signal) signals.push(config.signal);
    if (config.timeout > 0) signals.push(AbortSignal.timeout(config.timeout));
    if (!signals.length) return undefined;
    if (signals.length === 1) return signals[0];
    return typeof AbortSignal.any === 'function' ? AbortSignal.any(signals) : signals[signals.length - 1];
};

export const workerFetchAdapter = async (config) => {
    const url = axios.getUri(config);
    const method = String(config.method || 'get').toUpperCase();
    const init = {
        method,
        headers: toHeaderObject(config.headers),
        redirect: config.maxRedirects === 0 ? 'manual' : 'follow',
    };
    if (config.data != null && method !== 'GET' && method !== 'HEAD') init.body = config.data;
    const signal = timeoutSignal(config);
    if (signal) init.signal = signal;

    let response;
    try {
        response = await fetch(url, init);
    } catch (error) {
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
        throw new axios.AxiosError(
            timedOut ? `timeout of ${config.timeout}ms exceeded` : (error?.message || 'Network Error'),
            timedOut ? axios.AxiosError.ECONNABORTED : axios.AxiosError.ERR_NETWORK,
            config,
        );
    }

    const responseType = config.responseType || 'json';
    let data;
    if (responseType === 'arraybuffer') data = await response.arrayBuffer();
    else if (responseType === 'stream') data = response.body;
    else if (responseType === 'blob' && typeof response.blob === 'function') data = await response.blob();
    else data = await response.text(); // axios' transformResponse parses JSON

    const axiosResponse = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: new axios.AxiosHeaders(Object.fromEntries(response.headers.entries())),
        config,
        request: null,
    };

    const validate = config.validateStatus;
    if (!validate || validate(response.status)) return axiosResponse;
    throw new axios.AxiosError(
        `Request failed with status code ${response.status}`,
        response.status >= 500 ? axios.AxiosError.ERR_BAD_RESPONSE : axios.AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        axiosResponse,
    );
};

let installed = false;
export const installAxiosWorkerAdapter = () => {
    if (installed) return;
    axios.defaults.adapter = workerFetchAdapter;
    installed = true;
};
