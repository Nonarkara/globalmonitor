import { handleApiRequest } from '../_lib/router.mjs';
import { withEdgeCache } from '../_lib/edgeCache.mjs';

export async function onRequest(context) {
    return withEdgeCache(
        context.request,
        (request) => handleApiRequest(
            request,
            context.env,
            (req) => context.next(req),
        ),
        { waitUntil: context.waitUntil?.bind(context) },
    );
}
