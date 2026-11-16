// Open the user's web mail (config.mail_url) in its own off-screen window. Background tabs don't render mail lists.
async page => {
  const ctx = page.context(); const url = __MAIL__;
  let ol = ctx.pages().find(p => p.url().startsWith(url.split('/mail')[0]));
  if (!ol) {
    const s = await ctx.browser().newBrowserCDPSession();
    const before = ctx.pages().length;
    await s.send('Target.createTarget', { url, newWindow: true });
    for (let i = 0; i < 20 && ctx.pages().length === before; i++) await page.waitForTimeout(250);
    ol = ctx.pages()[ctx.pages().length - 1];
    const cs = await ctx.newCDPSession(ol);
    const { windowId } = await cs.send('Browser.getWindowForTarget');
    await cs.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await cs.send('Browser.setWindowBounds', { windowId, bounds: { left: -2600, top: 50, width: 1400, height: 950 } });
    await ol.waitForTimeout(12000);
  }
  const it = await ol.locator('[role=option]').allInnerTexts();
  return 'mail open; top messages:\n' + it.slice(0, 8).map(x => x.replace(/\s+/g, ' ').slice(0, 110)).join('\n');
}
