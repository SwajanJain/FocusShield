// popup.js

document.addEventListener('DOMContentLoaded', () => {
    restoreSiteList();
    document.getElementById('add-site-form').addEventListener('submit', addSite);
  });
  
  // Function to add a new site
  async function addSite(e) {
    e.preventDefault();
  
    const domain = document.getElementById('new-domain').value.trim();
    const timeLimit = parseInt(document.getElementById('new-timeLimit').value, 10);
    const visitLimit = parseInt(document.getElementById('new-visitLimit').value, 10);
  
    if (!domain || isNaN(timeLimit) || isNaN(visitLimit)) {
      alert('Please fill in all fields correctly.');
      return;
    }
  
    const { sites = [] } = await chrome.storage.sync.get('sites');
    sites.push({ domain, timeLimit, visitLimit });
    await chrome.storage.sync.set({ sites });
  
    document.getElementById('add-site-form').reset();
    restoreSiteList();
  }
  
  // Function to restore the site list and usage data
  async function restoreSiteList() {
    const { sites = [] } = await chrome.storage.sync.get('sites');
    const { usage = {} } = await chrome.storage.local.get('usage');
    const siteList = document.getElementById('site-list');
    siteList.innerHTML = '';
  
    sites.forEach((site, index) => {
      const li = document.createElement('li');
  
      const siteInfo = document.createElement('div');
      siteInfo.classList.add('site-info');
      const siteUsage = usage[site.domain] || { time: 0, visits: 0 };
      siteInfo.innerHTML = `
        <strong>${site.domain}</strong><br>
        Time: ${siteUsage.time}/${site.timeLimit} min<br>
        Visits: ${siteUsage.visits}/${site.visitLimit}
      `;
  
      const siteActions = document.createElement('div');
      siteActions.classList.add('site-actions');
  
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
  
      siteActions.appendChild(editBtn);
      siteActions.appendChild(removeBtn);
  
      li.appendChild(siteInfo);
      li.appendChild(siteActions);
  
      siteList.appendChild(li);
    });
  }
  
  // Function to edit a site's limits
  function editSite(index) {
    chrome.storage.sync.get('sites', ({ sites }) => {
      const site = sites[index];
      const domainInput = document.getElementById('new-domain');
      const timeLimitInput = document.getElementById('new-timeLimit');
      const visitLimitInput = document.getElementById('new-visitLimit');
  
      domainInput.value = site.domain;
      timeLimitInput.value = site.timeLimit;
      visitLimitInput.value = site.visitLimit;
  
      // Remove the site temporarily to avoid duplicates
      sites.splice(index, 1);
      chrome.storage.sync.set({ sites }, () => {
        restoreSiteList();
      });
    });
  }
  
  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateUsage') {
      restoreSiteList();
    }
  });  