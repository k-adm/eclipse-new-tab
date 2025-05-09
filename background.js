// Listen for tab updates to cache favicons
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const host = url.hostname;
      
      // Get the tab's favicon URL from Chrome's cache
      const tabInfo = await chrome.tabs.get(tabId);
      if (tabInfo.favIconUrl) {
        // Store the favicon URL in chrome.storage.local
        await chrome.storage.local.set({ [`favicon_${host}`]: tabInfo.favIconUrl });
      }
    } catch {
      // Ignore invalid URLs
    }
  }
}); 