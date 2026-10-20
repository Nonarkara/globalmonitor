import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

const attachMeta = (payload, meta) => {
    if (!payload || typeof payload !== 'object') return payload;

    Object.defineProperty(payload, '__meta', {
        value: meta,
        enumerable: false,
        configurable: true
    });

    return payload;
};

export const fetchBackendJson = async (path, params = {}, options = {}) => {
    const response = await axios.get(`${API_BASE_URL}${path}`, {
        params,
        // The city wall's probe is the slow one: the frame gate needs two
        // fetches six seconds apart, so a cold cache can take longer than
        // the default timeout and the client would give up while the
        // server was still working. That timeout has to outlast the probe.
        timeout: options.timeout || 15000
    });

    return attachMeta(response.data, {
        status: response.headers['x-tech-status'] || 'live',
        updatedAt: response.headers['x-tech-updated-at'] || null,
        cache: response.headers['x-tech-cache'] || 'miss',
        // 'sample' status + the source name let useLiveResource/DataStatus
        // badge demo or fallback content at the same weight as STALE.
        source: response.headers['x-tech-source'] || null
    });
};
