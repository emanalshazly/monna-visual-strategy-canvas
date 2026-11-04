// html-to-image deep-clones SVG roots without visiting their descendants.
// Freeze those descendants' computed styles, including foreignObject HTML,
// before handing the snapshot to it so downloads do not depend on page CSS.
export function createCanvasExportSnapshot(source: HTMLElement) {
  const parent = source.parentElement;
  if (!parent) throw new Error('Canvas is not mounted');

  const snapshot = source.cloneNode(true) as HTMLElement;
  snapshot.removeAttribute('id');
  snapshot.style.width = `${source.offsetWidth}px`;
  snapshot.style.height = `${source.offsetHeight}px`;
  snapshot.style.flex = 'none';

  const originals = source.querySelectorAll<HTMLElement | SVGElement>('*');
  const copies = snapshot.querySelectorAll<HTMLElement | SVGElement>('*');
  const documentUrl = new URL(source.ownerDocument.URL);
  for (let index = 0; index < originals.length; index++) {
    const original = originals[index];
    if (!original.closest('svg')) continue;
    const computed = getComputedStyle(original);
    for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex++) {
      const property = computed[propertyIndex];
      // Computed marker/paint URLs may be absolute. Keep same-document
      // fragments local so the saved file never needs the application URL.
      const value = computed.getPropertyValue(property).replace(/url\((["']?)(.*?)\1\)/g, (match, _quote, reference: string) => {
        const url = new URL(reference, source.baseURI);
        return url.hash && url.origin === documentUrl.origin && url.pathname === documentUrl.pathname && url.search === documentUrl.search
          ? `url("${url.hash}")` : match;
      });
      copies[index].style.setProperty(property, value);
    }
  }

  // Keep the capture root at its original size in the same theme ancestry.
  // Position only its host offscreen; captured styles stay free of that offset.
  const host = source.ownerDocument.createElement('div');
  host.dataset.canvasExportSnapshot = '';
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${source.offsetWidth}px;height:${source.offsetHeight}px`;
  host.append(snapshot);
  parent.append(host);

  return { element: snapshot, dispose: () => host.remove() };
}
