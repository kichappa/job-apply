// Bring the CURRENT tab's window on-screen and to the front (hand it to the user).
async page => {
  const s = await page.context().newCDPSession(page);
  const { windowId } = await s.send('Browser.getWindowForTarget');
  await s.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
  await s.send('Browser.setWindowBounds', { windowId, bounds: { left: 80, top: 40, width: 1300, height: 950 } });
  await page.bringToFront();
  return 'shown: ' + page.url().slice(0, 100);
}
