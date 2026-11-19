// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the editor with a photo loaded. Query params: photo (comma list of
// sample names), caption, subtitle, badge, heat, layout, grade, size (WxH).
// window.__shotReady is set once the fonts are loaded and the cover is painted.
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const opts = {
    photos: (query.get('photo') ?? 'pier').split(',').map((s) => s.trim()).filter(Boolean),
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Neon Coast nights',
    badge: query.get('badge') ?? 'Neon Coast',
    heat: Number(query.get('heat') ?? 4),
    layout: query.get('layout') ?? undefined,
    grade: query.get('grade') ?? undefined,
    size: query.get('size') ?? undefined,
  };
  await document.fonts.load('40px Anton');
  await document.fonts.load('40px Pacifico');
  await apply(opts);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
