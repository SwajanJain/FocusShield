// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Existing initialization
  restoreSiteList();
  document.getElementById('add-site-form').addEventListener('submit', addSite);
  displaySiteHistory();

  // New bottom nav button listeners for tab switching
  document.getElementById('nav-home').addEventListener('click', () => {
    switchView('home');
  });
  document.getElementById('nav-todo').addEventListener('click', () => {
    switchView('todo');
    // Load To-Do tasks when the To-Do tab is activated
    if (window.todoFunctions && typeof window.todoFunctions.loadTasks === 'function') {
      window.todoFunctions.loadTasks();
    }
  });
  document.getElementById('nav-pomo').addEventListener('click', () => {
    switchView('pomo');
  });

  // Add event listener for the "Add Task" button in the To-Do section
  const addTaskBtn = document.getElementById('add-task-btn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      const newTaskInput = document.getElementById('new-task-input');
      const taskTitle = newTaskInput.value.trim();
      if (taskTitle !== '') {
        window.todoFunctions.addTask(taskTitle);
        newTaskInput.value = '';
      }
    });
  }
});

// =====================
//   Existing Functions
// =====================

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
  // siteUsage is maintained in the background for persistent time tracking
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

    // Retrieve usage data for the site from our 'usage' object
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

// Listen for messages from background.js to update usage data
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateUsage') {
    restoreSiteList();
    displaySiteHistory();
  }
});

// =====================
//   UPDATED Browsing Insights
// =====================
// New displaySiteHistory() builds a table with columns for Website, Visits, and Time (min)
async function displaySiteHistory() {
  // Retrieve siteHistory (from analyzed browsing history) and siteUsage (time tracking in ms)
  const dataHistory = await chrome.storage.local.get('siteHistory');
  const siteHistory = dataHistory.siteHistory || {};
  const dataUsage = await chrome.storage.local.get('siteUsage');
  const siteUsage = dataUsage.siteUsage || {};

  const usageSummary = document.getElementById('usage-summary');
  if (!usageSummary) return; // Exit if the element isn't found

  // Clear any existing content
  usageSummary.innerHTML = '';

  // Create the table
  const table = document.createElement('table');
  table.classList.add('insights-table'); // Use this class for styling (see popup.css)

  // Create table header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thWebsite = document.createElement('th');
  thWebsite.textContent = 'Website';

  const thVisits = document.createElement('th');
  thVisits.textContent = 'Visits';

  const thTime = document.createElement('th');
  thTime.textContent = 'Time (min)';

  headerRow.appendChild(thWebsite);
  headerRow.appendChild(thVisits);
  headerRow.appendChild(thTime);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');

  // Merge domains from both siteHistory and siteUsage so we capture all data
  const domains = new Set([...Object.keys(siteHistory), ...Object.keys(siteUsage)]);
  // Optionally, sort domains by time spent (descending)
  const sortedDomains = Array.from(domains).sort((a, b) => {
    const timeA = siteUsage[a] || 0;
    const timeB = siteUsage[b] || 0;
    return timeB - timeA;
  });

  // Limit to top 10 entries if desired
  sortedDomains.slice(0, 10).forEach((domain) => {
    const visits = siteHistory[domain] ? siteHistory[domain].visits : 0;
    const timeMs = siteUsage[domain] || 0;
    const timeMin = Math.floor(timeMs / 60000);

    const tr = document.createElement('tr');

    const tdDomain = document.createElement('td');
    tdDomain.textContent = domain;

    const tdVisits = document.createElement('td');
    tdVisits.textContent = visits;

    const tdTime = document.createElement('td');
    tdTime.textContent = timeMin;

    tr.appendChild(tdDomain);
    tr.appendChild(tdVisits);
    tr.appendChild(tdTime);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  usageSummary.appendChild(table);
}

// =====================
//   NEW NAV FUNCTION
// =====================
function switchView(view) {
  // Hide all sections
  document.getElementById('home-section').style.display = 'none';
  document.getElementById('todo-section').style.display = 'none';
  document.getElementById('pomo-section').style.display = 'none';

  // Remove 'active' class from nav buttons
  document.getElementById('nav-home').classList.remove('active');
  document.getElementById('nav-todo').classList.remove('active');
  document.getElementById('nav-pomo').classList.remove('active');

  // Show the chosen section & set active button
  if (view === 'home') {
    document.getElementById('home-section').style.display = 'block';
    document.getElementById('nav-home').classList.add('active');
  } else if (view === 'todo') {
    document.getElementById('todo-section').style.display = 'block';
    document.getElementById('nav-todo').classList.add('active');
  } else if (view === 'pomo') {
    document.getElementById('pomo-section').style.display = 'block';
    document.getElementById('nav-pomo').classList.add('active');
  }
}
