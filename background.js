// background.js

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['sites'], (data) => {
    if (!data.sites) {
      chrome.storage.sync.set({ sites: [] });
    }
  });
});

// Analyze browsing history to find frequently visited sites
async function analyzeBrowsingHistory() {
  try {
    const historyItems = await chrome.history.search({ text: '', maxResults: 1000 });
    const siteHistory = {};

    historyItems.forEach((item) => {
      const domain = getDomainFromUrl(item.url);
      if (domain) {
        if (!siteHistory[domain]) {
          siteHistory[domain] = { visits: 0, lastVisitTime: 0 };
        }
        siteHistory[domain].visits += item.visitCount;
        siteHistory[domain].lastVisitTime = Math.max(siteHistory[domain].lastVisitTime, item.lastVisitTime);
      }
    });

    console.log('Browsing History Analysis:', siteHistory);
    chrome.storage.local.set({ siteHistory });
  } catch (error) {
    console.error('Error analyzing browsing history:', error);
  }
}

// Call analyzeBrowsingHistory to collect initial data
analyzeBrowsingHistory();

// Variables to track active tab and domain
let activeTabId = null;
let activeDomain = null;
let activeStartTime = null;
let timer = null;
let siteUsage = {};

// Load existing site usage data
chrome.storage.local.get('siteUsage', (data) => {
  siteUsage = data.siteUsage || {};
});

// Real-Time Monitoring: Track active tabs and time spent
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (timer) clearInterval(timer);
  await updateActiveTab(tabId);
  startUsageTimer();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === 'complete') {
    if (timer) clearInterval(timer);
    await updateActiveTab(tabId);
    startUsageTimer();
  }
});

async function updateActiveTab(tabId) {
  if (activeTabId !== null && activeStartTime !== null) {
    await recordTimeSpent();
  }

  activeTabId = tabId;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url) {
      activeDomain = getDomainFromUrl(tab.url);
      activeStartTime = Date.now();
    } else {
      activeDomain = null;
      activeStartTime = null;
    }
  } catch (error) {
    console.error('Error getting tab:', error);
  }
}

async function recordTimeSpent() {
  try {
    if (!activeStartTime || !activeDomain) return;
    const timeSpent = Date.now() - activeStartTime;

    if (!siteUsage[activeDomain]) {
      siteUsage[activeDomain] = 0;
    }
    siteUsage[activeDomain] += timeSpent;

    await chrome.storage.local.set({ siteUsage });
  } catch (error) {
    console.error('Error recording time spent:', error);
  }
}

chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === 'idle' || newState === 'locked') {
    if (timer) clearInterval(timer);
    if (activeStartTime !== null) {
      recordTimeSpent();
      activeStartTime = null;
    }
  } else if (newState === 'active' && activeTabId !== null) {
    activeStartTime = Date.now();
    startUsageTimer();
  }
});

// Function to start the timer for usage tracking
function startUsageTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(async () => {
    await recordTimeSpent();
    activeStartTime = Date.now();

    // Check against user-defined limits
    const { sites } = await chrome.storage.sync.get('sites');
    const site = sites.find((s) => activeDomain && activeDomain.includes(s.domain));

    if (site) {
      const siteTimeSpent = siteUsage[activeDomain] || 0;
      const timeSpentInMinutes = Math.floor(siteTimeSpent / 60000);

      const { usage = {} } = await chrome.storage.local.get('usage');
      const siteUsageData = usage[site.domain] || { time: 0, visits: 0, notified: false };

      siteUsageData.time = timeSpentInMinutes;
      usage[site.domain] = siteUsageData;
      await chrome.storage.local.set({ usage });

      // Send a message to update the popup
      chrome.runtime.sendMessage({ type: 'updateUsage' });

      // Near-Limit Notification (e.g., at 80% of limit)
      const timeLimit = site.timeLimit;
      if (
        !siteUsageData.notified &&
        timeLimit > 0 &&
        timeSpentInMinutes >= timeLimit * 0.8 &&
        timeSpentInMinutes < timeLimit
      ) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'FocusShield Reminder',
          message: `You're nearing your time limit for ${site.domain}. Stay focused!`,
        });
        siteUsageData.notified = true;
        await chrome.storage.local.set({ usage });
      }

      // Block site if limit reached
      if (timeLimit > 0 && timeSpentInMinutes >= timeLimit) {
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
    const siteUsageData = usage[site.domain] || { time: 0, visits: 0, notified: false };

    siteUsageData.visits += 1;
    usage[site.domain] = siteUsageData;
    await chrome.storage.local.set({ usage });

    // Send a message to update the popup
    chrome.runtime.sendMessage({ type: 'updateUsage' });

    // Near-Limit Notification for visits
    const visitLimit = site.visitLimit;
    if (
      !siteUsageData.notified &&
      visitLimit > 0 &&
      siteUsageData.visits >= visitLimit * 0.8 &&
      siteUsageData.visits < visitLimit
    ) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'FocusShield Reminder',
        message: `You're nearing your visit limit for ${site.domain}. Stay focused!`,
      });
      siteUsageData.notified = true;
      await chrome.storage.local.set({ usage });
    }

    // Block site if visit limit reached
    if (visitLimit > 0 && siteUsageData.visits >= visitLimit) {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') });
    }
  }
});

// Clear timer when the tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    if (timer) clearInterval(timer);
    recordTimeSpent();
    activeTabId = null;
    activeDomain = null;
    activeStartTime = null;
  }
});

// Reset usage data daily at midnight
chrome.alarms.create('resetUsageData', { when: getNextResetTime(), periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetUsageData') {
    chrome.storage.local.set({ usage: {}, siteUsage: {} });
    // Send a message to update the popup
    chrome.runtime.sendMessage({ type: 'updateUsage' });
  }
});

function getNextResetTime() {
  const now = new Date();
  const resetTime = new Date();
  resetTime.setHours(24, 0, 0, 0);
  if (resetTime <= now) {
    resetTime.setDate(resetTime.getDate() + 1);
  }
  return resetTime.getTime();
}