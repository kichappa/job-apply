// Open a URL in a NEW browser window moved off-screen (never the user's tab). Prints the page index for tab-select.
// run.ps1 cdp/newwin.js -Vars @{URL='https://...'}
async page => {
  const ctx = page.context(); const s = await ctx.browser().newBrowserCDPSession();
  const before = ctx.pages().length;
  await s.send('Target.createTarget', { url: __URL__, newWindow: true });
  for (let i = 0; i < 20 && ctx.pages().length === before; i++) await page.waitForTimeout(250);
  const p = ctx.pages()[ctx.pages().length - 1];
  const cs = await ctx.newCDPSession(p);
  const { windowId } = await cs.send('Browser.getWindowForTarget');
  await cs.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await cs.send('Browser.setWindowBounds', { windowId, bounds: { left: -2600, top: 0, width: 1500, height: 1000 } });
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  return (ctx.pages().length - 1) + ' ' + p.url().slice(0, 100);
}
