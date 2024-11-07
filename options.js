// options.js

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('site-form').addEventListener('submit', addSite);

async function addSite(e) {
  e.preventDefault();

  const domain = document.getElementById('domain').value.trim();
  const timeLimit = parseInt(document.getElementById('timeLimit').value, 10);
  const visitLimit = parseInt(document.getElementById('visitLimit').value, 10);

  if (!domain || isNaN(timeLimit) || isNaN(visitLimit)) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const { sites = [] } = await chrome.storage.sync.get('sites');
  sites.push({ domain, timeLimit, visitLimit });
  await chrome.storage.sync.set({ sites });
  restoreOptions();
  document.getElementById('site-form').reset();
}

async function restoreOptions() {
  const { sites = [] } = await chrome.storage.sync.get('sites');
  const siteList = document.getElementById('site-list');
  siteList.innerHTML = '';

  sites.forEach((site, index) => {
    const li = document.createElement('li');
    li.textContent = `${site.domain} - Time Limit: ${site.timeLimit} min, Visit Limit: ${site.visitLimit}`;

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', async () => {
      sites.splice(index, 1);
      await chrome.storage.sync.set({ sites });
      restoreOptions();
    });

    li.appendChild(removeButton);
    siteList.appendChild(li);
  });
}