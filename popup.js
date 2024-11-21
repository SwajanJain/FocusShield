// popup.js

document.addEventListener('DOMContentLoaded', () => {
  restoreSiteList();
  document.getElementById('add-site-form').addEventListener('submit', addSite);

  // Display browsing insights if applicable
  displaySiteHistory();
});

// Function to add a new site
async function addSite(e) {
  e.preventDefault();

  const domainInput = document.getElementById('new-domain');
  const timeLimitInput = document.getElementById('new-timeLimit');
  const visitLimitInput = document.getElementById('new-visitLimit');

  const domain = domainInput.value.trim();
  const timeLimit = parseInt(timeLimitInput.value, 10);
  const visitLimit = parseInt(visitLimitInput.value, 10);
  const timestamp = Date.now();

  if (!domain || isNaN(timeLimit) || isNaN(visitLimit)) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const data = await chrome.storage.sync.get(['sites', 'userClassifications']);
  const sites = data.sites || [];
  const userClassifications = data.userClassifications || {};

  // Check if the site already exists
  if (sites.some((site) => site.domain === domain)) {
    alert('This site is already being monitored.');
    return;
  }

  // Prompt user to classify the site
  classifySite(domain, (classification) => {
    userClassifications[domain] = classification;
    chrome.storage.sync.set({ userClassifications });

    sites.push({ domain, timeLimit, visitLimit, timestamp });
    chrome.storage.sync.set({ sites });

    // Reset form inputs
    domainInput.value = '';
    timeLimitInput.value = '';
    visitLimitInput.value = '';

    restoreSiteList();
  });
}

// Function to classify a site
function classifySite(domain, callback) {
  const classification = prompt(`Classify ${domain} as:
1. Productive
2. Unproductive
3. Neutral`, '1');

  const classificationMap = {
    '1': 'Productive',
    '2': 'Unproductive',
    '3': 'Neutral',
  };

  const userClassification = classificationMap[classification];

  if (userClassification) {
    callback(userClassification);
  } else {
    alert('Invalid classification. Please try again.');
    classifySite(domain, callback);
  }
}

// Function to restore the site list and usage data
async function restoreSiteList() {
  const data = await chrome.storage.sync.get(['sites', 'userClassifications']);
  const sites = data.sites || [];
  const userClassifications = data.userClassifications || {};

  const localData = await chrome.storage.local.get(['usage', 'siteUsage']);
  const usage = localData.usage || {};
  const siteUsage = localData.siteUsage || {};

  const siteList = document.getElementById('site-list');
  siteList.innerHTML = '';

  sites.forEach((site, index) => {
    const li = document.createElement('li');

    const siteInfo = document.createElement('div');
    siteInfo.classList.add('site-info');

    const domainSpan = document.createElement('span');
    domainSpan.textContent = site.domain;
    domainSpan.classList.add('site-domain');

    // Retrieve usage data for the site
    const siteUsageData = usage[site.domain] || { time: 0, visits: 0, notified: false };
    const timeUsage = siteUsageData.time;
    const visitUsage = siteUsageData.visits;

    // Get classification
    const classification = userClassifications[site.domain] || 'Unclassified';

    // Create usage text
    const usageText = document.createElement('span');
    usageText.classList.add('site-usage');
    usageText.innerHTML = `
      Classification: ${classification}<br>
      Time: ${timeUsage}/${site.timeLimit} min<br>
      Visits: ${visitUsage}/${site.visitLimit}
    `;

    // Progress bars
    const timeProgress = document.createElement('progress');
    timeProgress.max = site.timeLimit;
    timeProgress.value = timeUsage;
    timeProgress.classList.add('progress-time');

    const visitProgress = document.createElement('progress');
    visitProgress.max = site.visitLimit;
    visitProgress.value = visitUsage;
    visitProgress.classList.add('progress-visits');

    // Buttons
    const siteActions = document.createElement('div');
    siteActions.classList.add('site-actions');

    const classifyBtn = document.createElement('button');
    classifyBtn.textContent = 'Classify';
    classifyBtn.classList.add('classify-btn');
    classifyBtn.addEventListener('click', () => {
      classifySite(site.domain, (classification) => {
        userClassifications[site.domain] = classification;
        chrome.storage.sync.set({ userClassifications });
        restoreSiteList();
      });
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.classList.add('edit-btn');
    editBtn.addEventListener('click', () => editSite(index));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.classList.add('remove-btn');
    removeBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove ${site.domain}?`)) {
        sites.splice(index, 1);
        await chrome.storage.sync.set({ sites });
        restoreSiteList();
      }
    });

    siteActions.appendChild(classifyBtn);
    siteActions.appendChild(editBtn);
    siteActions.appendChild(removeBtn);

    siteInfo.appendChild(domainSpan);
    siteInfo.appendChild(usageText);
    siteInfo.appendChild(timeProgress);
    siteInfo.appendChild(visitProgress);

    li.appendChild(siteInfo);
    li.appendChild(siteActions);

    siteList.appendChild(li);
  });
}

// Function to edit a site's limits
async function editSite(index) {
  const data = await chrome.storage.sync.get('sites');
  const sites = data.sites || [];

  const site = sites[index];

  const domainInput = document.getElementById('new-domain');
  const timeLimitInput = document.getElementById('new-timeLimit');
  const visitLimitInput = document.getElementById('new-visitLimit');

  domainInput.value = site.domain;
  timeLimitInput.value = site.timeLimit;
  visitLimitInput.value = site.visitLimit;

  // Remove the site temporarily to avoid duplicates
  sites.splice(index, 1);
  await chrome.storage.sync.set({ sites });

  restoreSiteList();
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateUsage') {
    restoreSiteList();
  }
});

// Function to display browsing insights (optional)
async function displaySiteHistory() {
  const data = await chrome.storage.local.get('siteHistory');
  const siteHistory = data.siteHistory || {};

  const usageSummary = document.getElementById('usage-summary');
  if (!usageSummary) return; // If no usage summary element, exit

  usageSummary.innerHTML = '';

  const sortedSites = Object.entries(siteHistory)
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, 10); // Display top 10 sites

  sortedSites.forEach(([domain, info]) => {
    const siteDiv = document.createElement('div');
    siteDiv.textContent = `${domain} - Visits: ${info.visits}`;
    siteDiv.addEventListener('click', () => {
      classifySite(domain, (classification) => {
        // Save classification for unmonitored sites
        chrome.storage.sync.get('userClassifications', (data) => {
          const userClassifications = data.userClassifications || {};
          userClassifications[domain] = classification;
          chrome.storage.sync.set({ userClassifications });
        });
      });
    });
    usageSummary.appendChild(siteDiv);
  });
}