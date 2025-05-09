// background.js

const STORAGE_KEY    = 'shortcuts';
const FAVICON_PREFIX = 'favicon_';

// Only on main-frame completions of HTTP/HTTPS
chrome.webNavigation.onCompleted.addListener(details => {
  if (details.frameId !== 0) return;
  chrome.tabs.get(details.tabId, tab => {
    const iconUrl = tab.favIconUrl;
    if (!iconUrl) return;
    let origin;
    try {
      origin = new URL(tab.url).origin;
    } catch {
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], result => {
      const items = result[STORAGE_KEY] || [];
      // If this origin is in our shortcuts, cache its favicon
      if (items.some(item => new URL(item.url).origin === origin)) {
        chrome.storage.local.set({ [FAVICON_PREFIX + origin]: iconUrl });
      }
    });
  });
}, {
  url: [{ schemes: ['http', 'https'] }]
});
