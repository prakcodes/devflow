
// This key is used to save data in the browser so it's there when you reload
const STORAGE_KEY = 'devflow_v1';

// This is where we store all our app data
const initialState = {
    issues: [],
    todos: {},
    theme: 'light',
    currentDate: new Date().toISOString().split('T')[0],
    filters: {
        priority: 'all',
        search: ''
    }
};

const state = {
    data: { ...initialState },

    // This list holds functions that need to run when data changes
    listeners: [],

    // Load data from browser storage when app starts
    init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.data = { ...initialState, ...JSON.parse(stored) };
            } catch (e) {
                console.error("Could not load saved data", e);
                this.data = { ...initialState };
            }
        }
        this.save();
    },

    // Add a function to the list of listeners
    subscribe(listener) {
        this.listeners.push(listener);
    },

    // Run all listener functions (like updating the screen)
    notify() {
        this.listeners.forEach(listener => listener(this.data));
        this.save();
    },

    // Save current data to browser storage
    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }
};

// Handles talking to outside servers (GitHub and WorldTime)
const api = {
    async fetchGithubIssues(input) {
        try {
            // Remove full URL part if user pasted it
            const ownerRepo = input.replace('https://github.com/', '').replace(/\/$/, '');

            const response = await fetch(`https://api.github.com/repos/${ownerRepo}/issues?state=open&per_page=20`);

            if (!response.ok) {
                throw new Error('Could not find that repository or too many requests.');
            }

            const data = await response.json();

            // Convert GitHub issues to our app's format
            return data.map(ghIssue => ({
                id: this.generateUUID(),
                title: ghIssue.title,
                description: ghIssue.body || '',
                priority: 'medium',
                status: 'open',
                dueDate: '',
                sourceUrl: ghIssue.html_url
            }));

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Creates a random ID for new items
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Gets the correct time from the internet
    async fetchCurrentTime() {
        try {
            const response = await fetch('https://worldtimeapi.org/api/ip');
            const data = await response.json();
            return new Date(data.datetime);
        } catch (error) {
            return new Date(); // Fallback to computer time if internet fails
        }
    }
};

// Functions for managing Issues
const issueService = {
    addIssue(issueData) {
        const newIssue = {
            id: api.generateUUID(),
            createdAt: new Date().toISOString().split('T')[0],
            ...issueData
        };

        state.data.issues.push(newIssue);
        state.notify();
    },

    updateIssue(id, updates) {
        const index = state.data.issues.findIndex(i => i.id === id);
        if (index !== -1) {
            state.data.issues[index] = { ...state.data.issues[index], ...updates };
            state.notify();
        }
    },

    deleteIssue(id) {
        state.data.issues = state.data.issues.filter(i => i.id !== id);
        state.notify();
    },

    importIssues(newIssues) {
        state.data.issues = [...state.data.issues, ...newIssues];
        state.notify();
    },

    setFilter(filterType, value) {
        state.data.filters[filterType] = value;
        state.notify();
    },

    getFilteredIssues() {
        const { issues, filters } = state.data;
        return issues.filter(issue => {
            const matchesPriority = filters.priority === 'all' || issue.priority === filters.priority;
            // Simple search check
            const matchesSearch = filters.search === '' ||
                issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                issue.description.toLowerCase().includes(filters.search.toLowerCase());
            return matchesPriority && matchesSearch;
        });
    }
};

// Functions for managing Daily Todos
const todoService = {
    addTodo(text, date) {
        if (!state.data.todos[date]) {
            state.data.todos[date] = [];
        }

        const newTodo = {
            id: api.generateUUID(),
            text,
            completed: false
        };

        state.data.todos[date].push(newTodo);
        state.notify();
    },

    toggleTodo(id, date) {
        const todo = state.data.todos[date]?.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            state.notify();
        }
    },

    deleteTodo(id, date) {
        if (!state.data.todos[date]) return;

        state.data.todos[date] = state.data.todos[date].filter(t => t.id !== id);
        state.notify();
    },

    getTodosForDate(date) {
        return state.data.todos[date] || [];
    }
};

// Handles Dark Mode
const themeManager = {
    init() {
        this.applyTheme(state.data.theme);
        state.subscribe((data) => {
            if (document.body.classList.contains('dark-theme') && data.theme === 'light') {
                this.applyTheme('light');
            } else if (!document.body.classList.contains('dark-theme') && data.theme === 'dark') {
                this.applyTheme('dark');
            }
        });
    },

    toggle() {
        const newTheme = state.data.theme === 'light' ? 'dark' : 'light';
        state.data.theme = newTheme;
        state.notify();
    },

    applyTheme(themeName) {
        if (themeName === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            document.querySelector('#theme-toggle i').className = 'fa-solid fa-sun';
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            document.querySelector('#theme-toggle i').className = 'fa-solid fa-moon';
        }
    }
};

// Handles Time Sync
const timeService = {
    async init() {
        await this.syncTime();
        // Update clock every second
        setInterval(() => this.updateDisplay(), 1000);
    },

    async syncTime() {
        const serverTime = await api.fetchCurrentTime();
        const dateStr = serverTime.toISOString().split('T')[0];

        if (state.data.currentDate !== dateStr) {
            state.data.currentDate = dateStr;
            state.notify();
        }
        this.updateDisplay(serverTime);
    },

    updateDisplay(dateObj = new Date()) {
        const timeEl = document.getElementById('current-time-display');
        if (timeEl) {
            timeEl.textContent = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
};

// Handles all Screen/UI Updates
const ui = {
    init() {
        this.render(state.data);
    },

    render(data) {
        this.renderDashboard(data);
        this.renderBoard(data);
        this.renderTodos(data);
    },

    renderDashboard(data) {
        const issues = issueService.getFilteredIssues();
        const openCount = issues.filter(i => i.status !== 'resolved').length;
        const criticalCount = issues.filter(i => i.priority === 'critical' && i.status !== 'resolved').length;

        const todayStr = data.currentDate;
        const todaysTodos = data.todos[todayStr] || [];
        const completedTodos = todaysTodos.filter(t => t.completed).length;

        document.getElementById('count-open').textContent = openCount;
        document.getElementById('count-critical').textContent = criticalCount;
        document.getElementById('count-todos').textContent = `${completedTodos}/${todaysTodos.length}`;
    },

    renderBoard(data) {
        // Clear all lists first
        document.getElementById('list-open').innerHTML = '';
        document.getElementById('list-inprogress').innerHTML = '';
        document.getElementById('list-resolved').innerHTML = '';

        const issues = issueService.getFilteredIssues();
        const counts = { open: 0, 'in-progress': 0, resolved: 0 };

        issues.forEach(issue => {
            const card = this.createIssueCard(issue);

            if (issue.status === 'open') {
                document.getElementById('list-open').appendChild(card);
                counts.open++;
            } else if (issue.status === 'in-progress') {
                document.getElementById('list-inprogress').appendChild(card);
                counts['in-progress']++;
            } else if (issue.status === 'resolved') {
                document.getElementById('list-resolved').appendChild(card);
                counts.resolved++;
            }
        });

        document.getElementById('badge-open').textContent = counts.open;
        document.getElementById('badge-inprogress').textContent = counts['in-progress'];
        document.getElementById('badge-resolved').textContent = counts.resolved;
    },

    createIssueCard(issue) {
        const div = document.createElement('div');
        div.className = `issue-card priority-${issue.priority}`;
        div.draggable = true;
        div.dataset.id = issue.id;

        // Check if overdue
        const isOverdue = issue.dueDate && issue.dueDate < state.data.currentDate && issue.status !== 'resolved';

        // Buttons
        const resolveBtn = issue.status !== 'resolved' ?
            `<button class="action-resolve" title="Done"><i class="fa-solid fa-check"></i></button>` : '';

        const startBtn = issue.status === 'open' ?
            `<button class="action-start" title="Start"><i class="fa-solid fa-play"></i></button>` : '';

        // HTML Content
        div.innerHTML = `
            <div class="issue-header">
                <span class="issue-title">${this.escapeHtml(issue.title)}</span>
                <div class="issue-actions">
                    ${startBtn}
                    ${resolveBtn}
                    <button class="action-edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p class="issue-desc">${this.escapeHtml(issue.description)}</p>
            <div class="issue-meta">
                <div class="issue-date">
                    ${issue.dueDate ? `<span class="${isOverdue ? 'overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${issue.dueDate}</span>` : ''}
                    ${issue.sourceUrl ? `<span class="issue-link"><a href="${issue.sourceUrl}" target="_blank"><i class="fa-brands fa-github"></i> Link</a></span>` : ''}
                </div>
                <span class="issue-priority-badge">${issue.priority}</span>
            </div>
        `;

        // Add Click Events
        if (issue.status === 'open') {
            div.querySelector('.action-start').addEventListener('click', (e) => {
                e.stopPropagation();
                issueService.updateIssue(issue.id, { status: 'in-progress' });
                this.showToast('Moved to In Progress');
            });
        }

        if (issue.status !== 'resolved') {
            div.querySelector('.action-resolve').addEventListener('click', (e) => {
                e.stopPropagation();
                issueService.updateIssue(issue.id, { status: 'resolved' });
                this.showToast('Marked as Resolved');
            });
        }

        div.querySelector('.action-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this issue?')) issueService.deleteIssue(issue.id);
        });

        div.querySelector('.action-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openIssueModal(issue);
        });

        // Drag Events
        div.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', issue.id);
            div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => div.classList.remove('dragging'));

        return div;
    },

    renderTodos(data) {
        const list = document.getElementById('todo-list');
        list.innerHTML = '';

        document.getElementById('todo-date-display').textContent = data.currentDate;
        const todos = todoService.getTodosForDate(data.currentDate);

        if (todos.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 1rem; color: #888;">No tasks for today</div>';
            return;
        }

        todos.forEach(todo => {
            const div = document.createElement('div');
            div.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            div.innerHTML = `
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <button class="todo-delete"><i class="fa-solid fa-xmark"></i></button>
            `;

            div.querySelector('input').addEventListener('change', () => {
                todoService.toggleTodo(todo.id, data.currentDate);
            });

            div.querySelector('.todo-delete').addEventListener('click', () => {
                todoService.deleteTodo(todo.id, data.currentDate);
            });

            list.appendChild(div);
        });
    },

    openIssueModal(issue = null) {
        const modal = document.getElementById('modal-issue');
        const form = document.getElementById('issue-form');

        if (issue) {
            document.getElementById('modal-title').textContent = 'Edit Issue';
            document.getElementById('issue-id').value = issue.id;
            document.getElementById('issue-title').value = issue.title;
            document.getElementById('issue-desc').value = issue.description;
            document.getElementById('issue-priority').value = issue.priority;
            document.getElementById('issue-status').value = issue.status;
            document.getElementById('issue-due').value = issue.dueDate;
        } else {
            document.getElementById('modal-title').textContent = 'New Issue';
            document.getElementById('issue-id').value = '';
            form.reset();
            document.getElementById('issue-status').value = 'open';
            document.getElementById('issue-priority').value = 'medium';
        }

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('visible'), 10);
    },

    closeModal(modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid fa-check"></i> <span>${message}</span>`;
        document.getElementById('toast-container').appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Prevents code injection (XSS)
    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
};

// Start the App
document.addEventListener('DOMContentLoaded', async () => {
    state.init();
    ui.init();
    themeManager.init();

    // Update screen when data changes
    state.subscribe(data => ui.render(data));

    // Get real internet time
    await timeService.init();

    setupEventListeners();
});

function setupEventListeners() {
    // Theme Button
    document.getElementById('theme-toggle').addEventListener('click', () => themeManager.toggle());

    // New Issue Button
    document.getElementById('btn-create-issue').addEventListener('click', () => ui.openIssueModal());

    // Close buttons for Modals
    document.querySelectorAll('.close-modal, .close-modal-gh').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => ui.closeModal(m));
        });
    });

    // Save Issue
    document.getElementById('issue-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('issue-id').value;
        const form = e.target;

        // Simple way to get form data
        const issueData = {
            title: document.getElementById('issue-title').value,
            description: document.getElementById('issue-desc').value,
            priority: document.getElementById('issue-priority').value,
            status: document.getElementById('issue-status').value,
            dueDate: document.getElementById('issue-due').value
        };

        if (id) {
            issueService.updateIssue(id, issueData);
            ui.showToast('Saved');
        } else {
            issueService.addIssue(issueData);
            ui.showToast('Created');
        }
        ui.closeModal(document.getElementById('modal-issue'));
    });

    // Add Todo
    document.getElementById('todo-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('new-todo-input');
        if (input.value.trim()) {
            todoService.addTodo(input.value.trim(), state.data.currentDate);
            input.value = '';
        }
    });

    // Search and Filter
    document.getElementById('filter-priority').addEventListener('change', (e) => {
        issueService.setFilter('priority', e.target.value);
    });

    document.getElementById('search-issues').addEventListener('input', (e) => {
        issueService.setFilter('search', e.target.value);
    });

    // GitHub Import
    document.getElementById('github-import-btn').addEventListener('click', () => {
        const modal = document.getElementById('modal-github');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('visible'), 10);
    });

    document.getElementById('github-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const repo = document.getElementById('gh-repo').value;
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.textContent;

        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            const issues = await api.fetchGithubIssues(repo);
            issueService.importIssues(issues);
            ui.showToast(`Imported ${issues.length} issues`);
            ui.closeModal(document.getElementById('modal-github'));
        } catch (error) {
            alert(error.message);
        }

        btn.textContent = oldText;
        btn.disabled = false;
    });

    // Refresh Time
    document.getElementById('refresh-time-btn').addEventListener('click', () => {
        timeService.syncTime();
        ui.showToast('Time Synced');
    });

    // Drag and Drop Logic
    document.querySelectorAll('.kanban-column').forEach(col => {
        col.addEventListener('dragover', e => {
            e.preventDefault();
            col.classList.add('drag-over');
        });

        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));

        col.addEventListener('drop', e => {
            e.preventDefault();
            col.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            const status = col.dataset.status;
            if (id && status) issueService.updateIssue(id, { status });
        });
    });

    // Keyboard Shortcut (Ctrl+I for New Issue)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            ui.openIssueModal();
        }
    });
}
