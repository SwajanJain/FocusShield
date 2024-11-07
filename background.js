// background.js

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['sites'], (data) => {
    if (!data.sites) {
      chrome.storage.sync.set({ sites: [] });
    }
  });
});

// Variables to track active tab and domain
let activeTabId = null;
let activeDomain = null;
let timer = null;

// Monitor tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (timer) clearInterval(timer);

  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url) return;

  activeTabId = activeInfo.tabId;
  activeDomain = getDomainFromUrl(tab.url);

  startTimer();
});

// Monitor tab updates (e.g., when a user navigates to a different page)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId !== activeTabId || changeInfo.status !== 'complete') return;

  if (timer) clearInterval(timer);

  activeDomain = getDomainFromUrl(tab.url);
  startTimer();
});

// Clear timer when the tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId && timer) {
    clearInterval(timer);
    activeTabId = null;
    activeDomain = null;
  }
});

// Function to start the timer for time tracking
function startTimer() {
  timer = setInterval(async () => {
    const { sites } = await chrome.storage.sync.get('sites');
    const site = sites.find((s) => activeDomain && activeDomain.includes(s.domain));

    if (site) {
      const { usage = {} } = await chrome.storage.local.get('usage');
      const siteUsage = usage[site.domain] || { time: 0, visits: 0 };

      siteUsage.time += 1; // Increment time by 1 minute
      usage[site.domain] = siteUsage;
      await chrome.storage.local.set({ usage });

      // Send a message to update the popup
      chrome.runtime.sendMessage({ type: 'updateUsage' });

      if (siteUsage.time >= site.timeLimit) {
        chrome.tabs.update(activeTabId, { url: chrome.runtime.getURL('blocked.html') });
        clearInterval(timer);
      }
    }
  }, 60000); // Run every minute
}

// Function to extract domain from URL
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

// Monitor tab visits to increment visit counts
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const domain = getDomainFromUrl(tab.url);
  if (!domain) return;

  const { sites } = await chrome.storage.sync.get('sites');
  const site = sites.find((s) => domain.includes(s.domain));

  if (site) {
    const { usage = {} } = await chrome.storage.local.get('usage');
    const siteUsage = usage[site.domain] || { time: 0, visits: 0 };

    siteUsage.visits += 1;
    usage[site.domain] = siteUsage;
    await chrome.storage.local.set({ usage });

    // Send a message to update the popup
    chrome.runtime.sendMessage({ type: 'updateUsage' });

    if (siteUsage.visits >= site.visitLimit) {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
    }
  }
});

// Reset usage data daily at midnight
chrome.alarms.create('resetUsageData', { when: getNextResetTime(), periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetUsageData') {
    chrome.storage.local.set({ usage: {} });
    // Send a message to update the popup
    chrome.runtime.sendMessage({ type: 'updateUsage' });
  }
});

function getNextResetTime() {
  const now = new Date();
  const resetTime = new Date();
  resetTime.setHours(24, 0, 0, 0);
  return resetTime.getTime();
}