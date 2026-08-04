const POPUP_CLASS_BY_LAYER = {
    'vessels-icons': 'traffic-tooltip--vessel',
    'vessels-labels': 'traffic-tooltip--vessel',
    'flights-icons': 'traffic-tooltip--flight',
    'flights-labels': 'traffic-tooltip--flight',
    'airports-points': 'traffic-tooltip--airport',
    'airports-labels': 'traffic-tooltip--airport',
    'acled-circles': 'traffic-tooltip--conflict',
    'firms-circles': 'traffic-tooltip--heat',
};

/** MapLibre splits Popup className on spaces; never return an empty class token. */
export const buildPopupClassName = (layerId) => [
    'traffic-tooltip',
    POPUP_CLASS_BY_LAYER[layerId],
].filter(Boolean).join(' ');
