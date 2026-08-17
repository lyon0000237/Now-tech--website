/**
 * The placeholder every product photograph fades in from.
 *
 * THIS FILE SHIPPED BROKEN AND NOBODY COULD SEE IT, WHICH IS THE WHOLE LESSON.
 * The constant below was written by a generator whose own template leaked into
 * its output: the exported value was the literal characters of a Python
 * f-string splice rather than a data URI. Next did its half correctly and
 * wrapped that string in the SVG it uses for blur placeholders, so every
 * product page served an `<image>` inside a Gaussian filter whose href was not
 * a URL, and drew NOTHING. `placeholder="blur"` has been a no-op in
 * ProductMedia and ProductGallery since the day it was added. It failed
 * silently because a placeholder that fails looks exactly like a placeholder
 * that has not been reached yet.
 *
 * ONE PLACEHOLDER FOR 4 254 PHOTOGRAPHS, AND THE FIRST ARGUMENT FOR IT WAS
 * WRONG. It was priced on a single file, judged 58 per cent near-white, and
 * generalised to "every one of these blurs would be a pale square with a faint
 * smudge in it". Measured since on six pieces from across the catalogue, that
 * does not hold: the battery keeps its orange lid over a grey body, the Canon
 * toner keeps its yellow band, the 16U cabinet keeps a black column on white,
 * and the power strip keeps the diagonal it is photographed on. A packshot is
 * shot on white, but the product is not white, and twelve pixels is enough to
 * carry it.
 *
 * So the honest reason to keep one shared blur is cost, not resemblance: these
 * images live on the client's WordPress, so per-image blurs mean fetching 6 654
 * files once and versioning the table. Until that is decided this is the
 * fallback, and it is a real one now: eight by eight, flattened onto white, 294
 * bytes. It says "a photograph on a white ground is coming", which is true of
 * every one of them, and Next does the part that matters either way by holding
 * the box and cross-fading the file in over it.
 */
export const PACKSHOT_BLUR = 'data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAcEAACAgIDAAAAAAAAAAAAAAABAwAEERIhMVH/xAAVAQEBAAAAAAAAAAAAAAAAAAABAv/EABYRAQEBAAAAAAAAAAAAAAAAAAEAEf/aAAwDAQACEQMRAD8AjqVr5a9TA8vUdezkcexEQWlcv//Z'
