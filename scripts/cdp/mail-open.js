// Open the user's web mail (config.mail_url) in its own off-screen window. Background tabs don't render mail lists.
// Outlook: the inbox. Gmail (mail.google.com/mail/u/<N>/): a search over every tab and Spam, in:anywhere newer_than:1h,
// which also marks the window as ours so the user's own Gmail tabs are never reused.
async page => {
  const ctx = page.context(); const url = __MAIL__;
  const gmail = /mail\.google\.com/.test(url);
  const target = gmail ? url.split('#')[0] + '#search/in%3Aanywhere+newer_than%3A1h' : url;
  const mine = p => gmail ? p.url().startsWith(url.split('#')[0]) && p.url().includes('#search/in%3Aanywhere')
                          : p.url().startsWith(url.split('/mail')[0]);
  let ol = ctx.pages().find(mine);
  if (!ol) {
    const s = await ctx.browser().newBrowserCDPSession();
    const before = ctx.pages().length;
    await s.send('Target.createTarget', { url: target, newWindow: true });
    for (let i = 0; i < 20 && ctx.pages().length === before; i++) await page.waitForTimeout(250);
    ol = ctx.pages()[ctx.pages().length - 1];
    const cs = await ctx.newCDPSession(ol);
    const { windowId } = await cs.send('Browser.getWindowForTarget');
    await cs.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    await cs.send('Browser.setWindowBounds', { windowId, bounds: { left: -2600, top: 50, width: 1400, height: 950 } });
    await ol.waitForTimeout(12000);
  }
  const it = await ol.locator(gmail ? 'tr.zA:visible' : '[role=option]').allInnerTexts();
  return 'mail open; top messages:\n' + it.slice(0, 8).map(x => x.replace(/\s+/g, ' ').slice(0, 110)).join('\n');
}
