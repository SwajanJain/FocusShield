// todo.js

// Global tasks array to hold our task objects
let tasks = [];

/**
 * loadTasks
 * Retrieves tasks from chrome.storage.local and then renders the list.
 */
function loadTasks() {
  chrome.storage.local.get(['tasks'], (data) => {
    tasks = data.tasks || [];
    renderTaskList();
  });
}

/**
 * renderTaskList
 * Renders the tasks in the DOM inside the element with id "todo-list".
 */
function renderTaskList() {
  const listEl = document.getElementById('todo-list');
  if (!listEl) return;
  
  // Clear the existing list
  listEl.innerHTML = '';

  tasks.forEach((task) => {
    // Create list item for each task
    const li = document.createElement('li');
    li.classList.add('task-item');
    if (task.completed) {
      li.classList.add('task-completed');
    }

    // Create a checkbox for marking task as complete/incomplete
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      toggleComplete(task.id);
    });

    // Create a span to display the task title
    const spanTitle = document.createElement('span');
    spanTitle.textContent = task.title;

    // Create a delete button to remove the task
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      removeTask(task.id);
    });

    // Append checkbox, title, and delete button to the list item
    li.appendChild(checkbox);
    li.appendChild(spanTitle);
    li.appendChild(deleteBtn);

    // Append the list item to the task list element
    listEl.appendChild(li);
  });
}

/**
 * addTask
 * Creates a new task and saves it.
 *
 * @param {string} title - The title of the new task.
 */
function addTask(title) {
  const newTask = {
    id: Date.now().toString(),
    title,
    completed: false
  };
  tasks.push(newTask);
  saveTasks();
}

/**
 * removeTask
 * Removes a task from the list based on its id.
 *
 * @param {string} taskId - The unique identifier for the task.
 */
function removeTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
}

/**
 * toggleComplete
 * Toggles the "completed" status of a task.
 *
 * @param {string} taskId - The unique identifier for the task.
 */
function toggleComplete(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
  }
}

/**
 * saveTasks
 * Persists the tasks array to chrome.storage.local and then re-renders the task list.
 */
function saveTasks() {
  chrome.storage.local.set({ tasks }, () => {
    renderTaskList();
  });
}

// Expose functions to the global window object so that popup.js or inline event handlers can use them.
window.todoFunctions = {
  loadTasks,
  addTask,
  removeTask,
  toggleComplete,
  renderTaskList
};