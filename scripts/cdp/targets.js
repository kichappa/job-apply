// List every open page in the browser (all windows), with playwright page index where known.
async page => {
  const ctx = page.context(); const s = await ctx.browser().newBrowserCDPSession();
  const t = (await s.send('Target.getTargets')).targetInfos.filter(x => x.type === 'page');
  const idx = new Map(ctx.pages().map((p, i) => [p.url(), i]));
  return t.map(x => (idx.has(x.url) ? idx.get(x.url) : '-') + ' | ' + x.title.slice(0, 60) + ' | ' + x.url.slice(0, 100)).join('\n');
}
