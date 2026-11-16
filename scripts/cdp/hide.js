// Move the CURRENT tab's window off-screen again (keeps rendering; do not minimize).
async page => {
  const s = await page.context().newCDPSession(page);
  const { windowId } = await s.send('Browser.getWindowForTarget');
  await s.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await s.send('Browser.setWindowBounds', { windowId, bounds: { left: -2600, top: 0, width: 1500, height: 1000 } });
  return 'hidden: ' + page.url().slice(0, 100);
}
