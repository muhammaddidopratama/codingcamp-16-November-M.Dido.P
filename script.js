(function() {
  'use strict';

  // ── localStorage key constants ──────────────────────────────────────────────
  var KEYS = {
    theme:    'dash_theme',
    name:     'dash_name',
    duration: 'dash_pomodoro_duration',
    todos:    'dash_todos',
    links:    'dash_links'
  };

  // ── localStorage helpers ────────────────────────────────────────────────────

  /**
   * Read and parse a value from localStorage.
   *
   * @param {string} key           - The localStorage key to read.
   * @param {string} expectedType  - The expected JS type: 'string', 'number',
   *                                 'boolean', or 'array'.
   * @param {*}      defaultValue  - Returned when the key is absent, the JSON
   *                                 is unparseable, or the type does not match.
   * @returns {*} The parsed value, or defaultValue on any failure.
   */
  function storageGet(key, expectedType, defaultValue) {
    var raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    try {
      var parsed = JSON.parse(raw);
      if (expectedType === 'array') {
        if (!Array.isArray(parsed)) {
          return defaultValue;
        }
      } else {
        if (typeof parsed !== expectedType) {
          return defaultValue;
        }
      }
      return parsed;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Serialise a value to JSON and write it to localStorage.
   * Errors (e.g. QuotaExceededError) are swallowed silently.
   *
   * @param {string} key   - The localStorage key to write.
   * @param {*}      value - The value to serialise and store.
   */
  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Silently swallow storage errors (e.g. QuotaExceededError).
    }
  }

  // ── Theme helpers ───────────────────────────────────────────────────────────

  /**
   * Update the theme-toggle button's visible label to reflect the active theme.
   *
   * @param {string} theme - The currently active theme: 'light' or 'dark'.
   */
  function themeUpdateButton(theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) { return; }
    if (theme === 'dark') {
      btn.textContent = '☀️ Light';
      btn.setAttribute('aria-label', 'Switch to light theme');
    } else {
      btn.textContent = '🌙 Dark';
      btn.setAttribute('aria-label', 'Switch to dark theme');
    }
  }

  /**
   * Read the saved theme from localStorage (or default to 'light'), validate
   * it, apply it synchronously to <html data-theme>, and persist it if it had
   * to be corrected.  Must be called before DOMContentLoaded so the theme is
   * in place before the first paint.
   */
  function themeInit() {
    var theme = storageGet(KEYS.theme, 'string', 'light');
    if (theme !== 'light' && theme !== 'dark') {
      theme = 'light';
      storageSet(KEYS.theme, theme);
    }
    document.documentElement.dataset.theme = theme;
    // Update the button label once the DOM is ready.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        themeUpdateButton(theme);
      });
    } else {
      themeUpdateButton(theme);
    }
  }

  /**
   * Flip the current theme between 'light' and 'dark', persist the new value,
   * and update both the <html> attribute and the toggle button label.
   */
  function themeToggle() {
    var current = document.documentElement.dataset.theme;
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storageSet(KEYS.theme, next);
    themeUpdateButton(next);
  }

  // ── Run themeInit synchronously (before DOMContentLoaded) ──────────────────
  themeInit();

  // ── Greeting widget ─────────────────────────────────────────────────────────

  /** In-memory name supplied by the Custom Name widget. */
  var currentName = '';

  /** Month names used by greetingRender for the date string. */
  var MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  /** Weekday names used by greetingRender for the date string. */
  var WEEKDAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  /**
   * Derive the salutation from an hour value (0–23).
   *
   * @param {number} hour - Local hour (0–23).
   * @returns {string} The salutation string.
   */
  function getSalutation(hour) {
    if (hour >= 5 && hour <= 11) { return 'Good Morning'; }
    if (hour >= 12 && hour <= 17) { return 'Good Afternoon'; }
    if (hour >= 18 && hour <= 20) { return 'Good Evening'; }
    return 'Good Night'; // 21–23 and 0–4
  }

  /**
   * Read the current time, format time/date strings, build the salutation
   * (optionally with the custom name), and push the values to the DOM.
   */
  function greetingRender() {
    var now = new Date();

    // HH:MM
    var hours   = now.getHours();
    var minutes = now.getMinutes();
    var hh = (hours   < 10 ? '0' : '') + hours;
    var mm = (minutes < 10 ? '0' : '') + minutes;
    var timeStr = hh + ':' + mm;

    // "Weekday, DD Month YYYY"
    var weekday = WEEKDAY_NAMES[now.getDay()];
    var day     = now.getDate();
    var month   = MONTH_NAMES[now.getMonth()];
    var year    = now.getFullYear();
    var dd      = (day < 10 ? '0' : '') + day;
    var dateStr = weekday + ', ' + dd + ' ' + month + ' ' + year;

    // Salutation, optionally suffixed with the custom name
    var salutation = getSalutation(hours);
    var message    = currentName ? salutation + ', ' + currentName : salutation;

    // Update DOM
    var elTime = document.getElementById('greeting-time');
    var elDate = document.getElementById('greeting-date');
    var elMsg  = document.getElementById('greeting-message');
    if (elTime) { elTime.textContent = timeStr; }
    if (elDate) { elDate.textContent = dateStr; }
    if (elMsg)  { elMsg.textContent  = message; }
  }

  /**
   * Render immediately and then re-render every 60 seconds.
   */
  function greetingInit() {
    greetingRender();
    setInterval(greetingRender, 60000);
  }

  /**
   * Update the in-memory name and re-render the greeting.
   *
   * @param {string} name - The new custom name (empty string to clear).
   */
  function greetingSetName(name) {
    currentName = name;
    greetingRender();
  }

  // ── Custom Name widget ──────────────────────────────────────────────────────

  /**
   * Read the saved Custom_Name from localStorage, populate the name input
   * field, and sync the in-memory currentName via greetingSetName.
   */
  function nameInit() {
    var saved = storageGet(KEYS.name, 'string', '');
    var input = document.getElementById('name-input');
    if (input) {
      input.value = saved;
    }
    greetingSetName(saved);
  }

  /**
   * Handle the name form submission.
   *
   * - Empty (after trim): clears localStorage, clears greeting name, clears error.
   * - Raw length > 50: shows error, returns without touching localStorage.
   * - Whitespace-only (trim length === 0 but raw non-empty): shows error, returns.
   * - Otherwise: saves trimmed value, updates greeting, clears error.
   */
  function nameSubmit() {
    var input    = document.getElementById('name-input');
    var errorEl  = document.getElementById('name-error');
    if (!input) { return; }

    var raw     = input.value;
    var trimmed = raw.trim();

    // Helper: show or clear the inline error message.
    function setError(msg) {
      if (errorEl) { errorEl.textContent = msg; }
    }

    // Case 1: empty after trim (includes purely empty string).
    if (trimmed.length === 0 && raw.length === 0) {
      storageSet(KEYS.name, '');
      greetingSetName('');
      setError('');
      input.value = '';
      return;
    }

    // Case 2: raw length exceeds 50 characters.
    if (raw.length > 50) {
      setError('Name must be 50 characters or fewer');
      return;
    }

    // Case 3: whitespace-only (raw is non-empty but trimmed is empty).
    if (trimmed.length === 0) {
      setError('Name cannot be blank');
      return;
    }

    // Case 4: valid name.
    storageSet(KEYS.name, trimmed);
    greetingSetName(trimmed);
    setError('');
    input.value = trimmed;
  }

  // ── Pomodoro Timer widget ───────────────────────────────────────────────────

  /** The duration currently in use (minutes). */
  var currentDuration = 25;

  /** Remaining time on the countdown (seconds). */
  var remainingSeconds = 0;

  /** Handle returned by setInterval for the countdown ticker. */
  var timerInterval = null;

  /**
   * Read the saved Pomodoro duration, clamp/validate to 1–60 (default 25),
   * reset the countdown display, and set button states to stopped.
   */
  function timerInit() {
    var saved = storageGet(KEYS.duration, 'number', 25);
    if (saved < 1 || saved > 60) {
      saved = 25;
    }
    currentDuration = saved;
    remainingSeconds = currentDuration * 60;
    timerRender();
    timerSetButtonStates(false);
  }

  /**
   * Begin the countdown by starting a 1-second interval and updating button
   * states to reflect the running state.
   */
  function timerStart() {
    timerInterval = setInterval(timerTick, 1000);
    timerSetButtonStates(true);
  }

  /**
   * Pause the countdown by clearing the interval and updating button states
   * to reflect the stopped state.
   */
  function timerStop() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSetButtonStates(false);
  }

  /**
   * Stop the countdown, hide the alert, reset remaining seconds to the current
   * duration, re-render the display, and restore stopped button states.
   */
  function timerReset() {
    clearInterval(timerInterval);
    timerInterval = null;
    var alertEl = document.getElementById('timer-alert');
    if (alertEl) {
      alertEl.hidden = true;
    }
    remainingSeconds = currentDuration * 60;
    timerRender();
    timerSetButtonStates(false);
  }

  /**
   * Called every second while the timer is running.  Decrements remainingSeconds,
   * re-renders the display, and triggers the alert when the countdown hits zero.
   */
  function timerTick() {
    remainingSeconds -= 1;
    timerRender();
    if (remainingSeconds <= 0) {
      timerStop();
      timerAlert();
    }
  }

  /**
   * Format remainingSeconds as "MM:SS" (zero-padded) and push the string to
   * the timer display element.
   */
  function timerRender() {
    var totalSecs = Math.max(0, remainingSeconds);
    var mins = Math.floor(totalSecs / 60);
    var secs = totalSecs % 60;
    var mm = (mins < 10 ? '0' : '') + mins;
    var ss = (secs < 10 ? '0' : '') + secs;
    var display = document.getElementById('timer-display');
    if (display) {
      display.textContent = mm + ':' + ss;
    }
  }

  /**
   * Show the non-dismissible visual alert and play a short beep using the Web
   * Audio API.  The alert persists until timerReset() is called.  Audio errors
   * are caught silently so the visual alert always fires.
   */
  function timerAlert() {
    var alertEl = document.getElementById('timer-alert');
    if (alertEl) {
      alertEl.hidden = false;
    }
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        var ctx  = new AudioCtx();
        var osc  = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio playback failure is intentionally silent; the visual alert still fires.
    }
  }

  /**
   * Synchronise the Start, Stop, and Reset button disabled states based on
   * whether the timer is currently running.
   *
   * Running  → Start disabled,  Stop enabled,  Reset disabled
   * Stopped  → Start enabled,   Stop disabled, Reset enabled
   *
   * @param {boolean} running - True when the timer is actively counting down.
   */
  function timerSetButtonStates(running) {
    var startBtn  = document.getElementById('timer-start');
    var stopBtn   = document.getElementById('timer-stop');
    var resetBtn  = document.getElementById('timer-reset');
    if (startBtn) { startBtn.disabled = running; }
    if (stopBtn)  { stopBtn.disabled  = !running; }
    if (resetBtn) { resetBtn.disabled = running; }
  }

  /**
   * Read and validate the duration input, persist on success, or show an inline
   * error on failure.  Calls timerReset() after a successful save (which also
   * stops a running timer, satisfying Req 3.9).
   */
  function timerSaveDuration() {
    var input   = document.getElementById('timer-duration-input');
    var errorEl = document.getElementById('timer-duration-error');
    if (!input) { return; }

    var raw   = input.value;
    var value = parseInt(raw, 10);

    if (isNaN(value) || value < 1 || value > 60) {
      if (errorEl) { errorEl.textContent = 'Duration must be a whole number between 1 and 60.'; }
      return;
    }

    if (errorEl) { errorEl.textContent = ''; }
    storageSet(KEYS.duration, value);
    currentDuration = value;
    timerReset();
  }

  // ── To-Do List widget ──────────────────────────────────────────────────────

  /** In-memory array of task objects. */
  var tasks = [];

  /**
   * Read the saved task collection from localStorage, validate it is an array,
   * set the in-memory tasks array, and render the list.
   */
  function todoInit() {
    var saved = storageGet(KEYS.todos, 'array', []);
    tasks = Array.isArray(saved) ? saved : [];
    todoRender();
  }

  /**
   * Clear the task list container and re-render every task from the in-memory
   * tasks array.  Each row contains a checkbox, description span, Edit button,
   * and Delete button.
   */
  function todoRender() {
    var list = document.getElementById('todo-list');
    if (!list) { return; }

    // Clear existing rows.
    list.innerHTML = '';

    tasks.forEach(function(task) {
      var li = document.createElement('li');
      li.dataset.id = task.id;

      // Checkbox
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', 'Mark task complete');
      checkbox.addEventListener('change', function() {
        todoToggleComplete(task.id);
      });

      // Description span
      var span = document.createElement('span');
      span.textContent = task.description;
      if (task.completed) {
        span.classList.add('completed');
      }

      // Edit button
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Edit';
      editBtn.dataset.id = task.id;
      editBtn.addEventListener('click', function() {
        todoEdit(task.id);
      });

      // Delete button
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.id = task.id;
      deleteBtn.addEventListener('click', function() {
        todoDelete(task.id);
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  /**
   * Add a new task to the list.
   *
   * - Trims the description; rejects with an inline error if empty after trim.
   * - Creates a Task object with a unique ID, the trimmed description, and
   *   completed: false.
   * - Pushes to in-memory tasks, persists to localStorage, re-renders, and
   *   clears the input field.
   *
   * @param {string} description - The raw task description from the input.
   */
  function todoAdd(description) {
    var errorEl = document.getElementById('todo-error');

    function setError(msg) {
      if (errorEl) { errorEl.textContent = msg; }
    }

    var trimmed = (description || '').trim();

    if (trimmed.length === 0) {
      setError('Task description cannot be empty.');
      return;
    }

    setError('');

    var task = {
      id:          String(Date.now()) + String(Math.random()),
      description: trimmed,
      completed:   false
    };

    tasks.push(task);
    storageSet(KEYS.todos, tasks);
    todoRender();

    // Clear the input field.
    var input = document.getElementById('todo-input');
    if (input) { input.value = ''; }
  }

  /**
   * Switch a task row into edit mode.
   *
   * Finds the <li> in #todo-list whose data-id matches taskId, then:
   * - Replaces the description <span> with an <input type="text"> pre-filled
   *   with the current description (maxlength 500).
   * - Replaces the Edit and Delete buttons with a Save button (bound to
   *   todoSaveEdit) and a Cancel button (bound to todoCancelEdit).
   *
   * @param {string} taskId - The id of the task to edit.
   */
  function todoEdit(taskId) {
    var list = document.getElementById('todo-list');
    if (!list) { return; }

    var li = list.querySelector('li[data-id="' + taskId + '"]');
    if (!li) { return; }

    // Find the current description from the in-memory tasks array.
    var taskObj = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        taskObj = tasks[i];
        break;
      }
    }
    if (!taskObj) { return; }

    // Replace the description span with an editable input.
    var span = li.querySelector('span');
    if (span) {
      var inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = taskObj.description;
      inputEl.maxLength = 500;
      inputEl.setAttribute('aria-label', 'Edit task description');
      li.replaceChild(inputEl, span);
    }

    // Replace Edit and Delete buttons with Save and Cancel buttons.
    // Remove old buttons first (querySelectorAll captures them before removal).
    var oldButtons = li.querySelectorAll('button');
    oldButtons.forEach(function(btn) {
      li.removeChild(btn);
    });

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function() {
      var currentInput = li.querySelector('input[type="text"]');
      todoSaveEdit(taskId, currentInput ? currentInput.value : '');
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function() {
      todoCancelEdit(taskId);
    });

    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
  }

  /**
   * Persist an in-progress edit for a task.
   *
   * - Trims text; if empty after trim, shows an inline error adjacent to the
   *   row without modifying tasks or localStorage.
   * - If valid, finds the task in tasks by id, updates its description to the
   *   trimmed value, persists to localStorage, and calls todoRender().
   *
   * @param {string} taskId - The id of the task being edited.
   * @param {string} text   - The raw value from the edit input.
   */
  function todoSaveEdit(taskId, text) {
    var trimmed = (text || '').trim();

    if (trimmed.length === 0) {
      // Show an inline error on the row; do not touch tasks or storage.
      var list = document.getElementById('todo-list');
      if (list) {
        var li = list.querySelector('li[data-id="' + taskId + '"]');
        if (li) {
          var existingError = li.querySelector('.todo-edit-error');
          if (!existingError) {
            var errorEl = document.createElement('span');
            errorEl.className = 'todo-edit-error';
            errorEl.textContent = 'Task description cannot be empty.';
            li.appendChild(errorEl);
          }
        }
      }
      return;
    }

    // Valid: update the in-memory task and persist.
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        tasks[i].description = trimmed;
        break;
      }
    }

    storageSet(KEYS.todos, tasks);
    todoRender();
  }

  /**
   * Cancel an in-progress edit and restore the original task view by
   * re-rendering without touching tasks or localStorage.
   *
   * @param {string} taskId - The id of the task whose edit is being cancelled.
   */
  function todoCancelEdit(taskId) {
    // taskId is accepted for API symmetry but no state change is needed.
    void taskId;
    todoRender();
  }

  /**
   * Flip the completed state of a task.
   *
   * Finds the task in the in-memory tasks array by id, toggles its
   * completed property (true → false, false → true), persists the updated
   * array to localStorage, and re-renders the list.
   *
   * @param {string} taskId - The id of the task to toggle.
   */
  function todoToggleComplete(taskId) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) {
        tasks[i].completed = !tasks[i].completed;
        break;
      }
    }
    storageSet(KEYS.todos, tasks);
    todoRender();
  }

  /**
   * Remove a task from the list.
   *
   * Filters the in-memory tasks array to exclude the task with the matching
   * id, persists the updated array to localStorage, and re-renders the list.
   *
   * @param {string} taskId - The id of the task to delete.
   */
  function todoDelete(taskId) {
    tasks = tasks.filter(function(t) { return t.id !== taskId; });
    storageSet(KEYS.todos, tasks);
    todoRender();
  }

  // ── Quick Links widget ─────────────────────────────────────────────────────

  /** In-memory array of Quick_Link objects. */
  var links = [];

  /**
   * Read the saved Quick_Link collection from localStorage, validate it is an
   * array, set the in-memory links array, and render the list.
   */
  function linksInit() {
    var saved = storageGet(KEYS.links, 'array', []);
    links = Array.isArray(saved) ? saved : [];
    linksRender();
  }

  /**
   * Clear the links container and re-render every link from the in-memory
   * links array.  Each entry contains a label button (opens the URL) and a
   * Delete button.
   */
  function linksRender() {
    var container = document.getElementById('links-list');
    if (!container) { return; }

    // Clear existing entries.
    container.innerHTML = '';

    links.forEach(function(link) {
      var div = document.createElement('div');
      div.dataset.id = link.id;

      // Label button — clicking opens the link.
      var labelBtn = document.createElement('button');
      labelBtn.type = 'button';
      labelBtn.textContent = link.label;
      labelBtn.addEventListener('click', function() {
        linksOpen(link.url);
      });

      // Delete button — clicking removes the link.
      var deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.dataset.id = link.id;
      deleteBtn.addEventListener('click', function() {
        linksDelete(link.id);
      });

      div.appendChild(labelBtn);
      div.appendChild(deleteBtn);
      container.appendChild(div);
    });
  }

  /**
   * Add a new Quick_Link to the list after validation.
   *
   * Validation rules:
   *  - Label must be non-empty after trim, ≤ 100 characters.
   *  - URL must be non-empty after trim, start with http:// or https://, ≤ 2048 characters.
   *  - Collection cap: reject if links already contains 50 entries.
   *
   * On success, creates a Quick_Link object, pushes it to the in-memory array,
   * persists to localStorage, re-renders, and clears the form inputs.
   *
   * @param {string} label - The raw label value from the input.
   * @param {string} url   - The raw URL value from the input.
   */
  function linksAdd(label, url) {
    var labelErrorEl = document.getElementById('links-label-error');
    var urlErrorEl   = document.getElementById('links-url-error');
    var capErrorEl   = document.getElementById('links-cap-error');

    function setLabelError(msg) {
      if (labelErrorEl) { labelErrorEl.textContent = msg; }
    }
    function setUrlError(msg) {
      if (urlErrorEl) { urlErrorEl.textContent = msg; }
    }
    function setCapError(msg) {
      if (capErrorEl) { capErrorEl.textContent = msg; }
    }

    // Clear all errors before re-validating.
    setLabelError('');
    setUrlError('');
    setCapError('');

    var trimmedLabel = (label || '').trim();
    var trimmedUrl   = (url   || '').trim();

    var labelValid = true;
    var urlValid   = true;

    // Validate label.
    if (trimmedLabel.length === 0) {
      setLabelError('Label is required.');
      labelValid = false;
    } else if (trimmedLabel.length > 100) {
      setLabelError('Label must be 100 characters or fewer.');
      labelValid = false;
    }

    // Validate URL.
    if (trimmedUrl.length === 0) {
      setUrlError('URL is required.');
      urlValid = false;
    } else if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://.');
      urlValid = false;
    } else if (trimmedUrl.length > 2048) {
      setUrlError('URL must be 2048 characters or fewer.');
      urlValid = false;
    }

    if (!labelValid || !urlValid) { return; }

    // Enforce collection cap.
    if (links.length >= 50) {
      setCapError('Maximum of 50 saved links reached.');
      return;
    }

    // Create and persist the new Quick_Link.
    var newLink = {
      id:    String(Date.now()) + String(Math.random()),
      label: trimmedLabel,
      url:   trimmedUrl
    };

    links.push(newLink);
    storageSet(KEYS.links, links);
    linksRender();

    // Clear the form inputs.
    var labelInput = document.getElementById('links-label-input');
    var urlInput   = document.getElementById('links-url-input');
    if (labelInput) { labelInput.value = ''; }
    if (urlInput)   { urlInput.value   = ''; }
  }

  /**
   * Remove a Quick_Link from the list.
   *
   * Filters the in-memory links array to exclude the link with the matching id,
   * persists the updated array to localStorage, and re-renders the list.
   *
   * @param {string} linkId - The id of the link to delete.
   */
  function linksDelete(linkId) {
    links = links.filter(function(l) { return l.id !== linkId; });
    storageSet(KEYS.links, links);
    linksRender();
  }

  /**
   * Open a URL in a new browser tab with no opener access.
   *
   * @param {string} url - The URL to open.
   */
  function linksOpen(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Wire up event listeners after the DOM is ready ─────────────────────────
  document.addEventListener('DOMContentLoaded', function() {

    // Theme toggle button
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', themeToggle);
    }

    // Custom Name widget — must run before greetingInit so currentName is set
    // before the first greetingRender() call.
    nameInit();
    var nameForm = document.getElementById('name-form');
    if (nameForm) {
      nameForm.addEventListener('submit', function(e) {
        e.preventDefault();
        nameSubmit();
      });
    }

    // Greeting widget — runs after nameInit so currentName is already set.
    greetingInit();

    // Pomodoro Timer widget
    timerInit();

    var startBtn = document.getElementById('timer-start');
    if (startBtn) {
      startBtn.addEventListener('click', timerStart);
    }

    var stopBtn = document.getElementById('timer-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', timerStop);
    }

    var resetBtn = document.getElementById('timer-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', timerReset);
    }

    var durationForm = document.getElementById('timer-duration-form');
    if (durationForm) {
      durationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        timerSaveDuration();
      });
    }

    // To-Do List widget
    todoInit();

    var todoForm = document.getElementById('todo-add-form');
    if (todoForm) {
      todoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var input = document.getElementById('todo-input');
        todoAdd(input ? input.value : '');
      });
    }

    // Quick Links widget
    linksInit();

    var linksForm = document.getElementById('links-add-form');
    if (linksForm) {
      linksForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var labelInput = document.getElementById('links-label-input');
        var urlInput   = document.getElementById('links-url-input');
        linksAdd(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    }

  });

})();
