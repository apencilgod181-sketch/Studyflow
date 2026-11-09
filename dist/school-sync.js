let schoolSyncStatus = '';
let schoolSyncBusy = false;
let schoolSyncOwner;
let classroomScript;

function loadClassroomScript() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (typeof googleScriptPromise !== 'undefined' && googleScriptPromise) return googleScriptPromise;
  classroomScript ||= new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = () => {
      classroomScript = undefined;
      reject(new Error('Google consent could not load.'));
    };
    document.head.append(script);
  });
  return classroomScript;
}

function schoolSyncPage() {
  const headingHtml = heading('SCHOOL CONNECTIONS','School Sync','Bring assignments and published grades into your StudyFlow planner.');
  if (location.hostname?.endsWith('.chatgpt.site')) {
    return headingHtml + '<section class="card"><a class="button" href="https://studyflow.apencilgod181.workers.dev/#school">Open School Sync →</a></section>';
  }
  if (!globalThis.studyAccount.user) {
    return headingHtml + '<section class="card"><p>Sign in to StudyFlow to sync your schoolwork.</p><a class="button" href="#login">Log in →</a></section>';
  }
  if (authConfig.googleClientId) void loadClassroomScript().catch(() => {});
  const disabled = schoolSyncBusy ? 'disabled' : '';
  return headingHtml + `<div class="notice">Sync reads your schoolwork and copies it into StudyFlow. Each sync refreshes imported deadlines and grades. Undated assignments are skipped. Deleted imports may return on the next sync.</div>
    <div class="practice-layout">
      <section class="card">
        <h2>Google Classroom</h2>
        <p class="muted">Choose your school Google account and allow read-only access to your classes, coursework, and grades.</p>
        <button class="button" type="button" id="classroom-sync" ${disabled}>Sync Google Classroom</button>
      </section>
      <section class="card">
        <h2>Canvas</h2>
        <p class="muted">Use your school's hosted Canvas address and an access token from Canvas Account → Settings. Your school may restrict token creation.</p>
        <form id="canvas-sync">
          <label>Canvas school URL<input name="origin" type="url" required placeholder="https://your-school.instructure.com"></label>
          <label>Canvas access token<input name="token" type="password" required maxlength="4096" autocomplete="off" spellcheck="false"></label>
          <p class="muted">StudyFlow uses the token for this sync and does not save it.</p>
          <button class="button" type="submit" ${disabled}>Sync Canvas</button>
        </form>
      </section>
    </div><p class="notice" id="school-sync-status" role="status">${esc(schoolSyncOwner===globalThis.studyAccount.user?.id ? schoolSyncStatus : '')}</p>`;
}

function showSchoolSyncStatus(message) {
  schoolSyncStatus = message;
  if (page === 'school') {
    const status = $('#school-sync-status');
    if (status) status.textContent = message;
  }
}

function mergeSchoolRecords(current, imported, update) {
  const result = new Map(current.map(item => [item.id,item]));
  for (const item of imported) {
    const existing = result.get(item.id);
    result.set(item.id, existing ? update(existing,item) : item);
  }
  return [...result.values()];
}

async function importSchoolWork(provider, token, origin) {
  const owner = schoolSyncOwner;
  showSchoolSyncStatus('Reading schoolwork…');
  try {
    const data = await requestAPI('school-sync',{
      method:'POST', headers:{'X-StudyFlow-Account':owner}, body:JSON.stringify({provider,token,origin})
    });
    if (globalThis.studyAccount.user?.id !== owner || !sync.loaded || sync.conflict) {
      throw new Error('Your StudyFlow account or sync status changed. Check My account and try again.');
    }
    const nextTasks = mergeSchoolRecords(assignments, data.assignments, (old,item) => ({
      ...old,due:item.due,completed:old.completed || item.completed
    }));
    const nextGrades = mergeSchoolRecords(grades, data.grades, (old,item) => ({
      ...old,score:item.score,max:item.max,date:item.date
    }));
    if (nextTasks.length > 500 || nextGrades.length > 500) {
      throw new Error('This import would exceed the planner limit of 500 tasks or grades. Remove older entries and try again.');
    }
    assignments = nextTasks;
    grades = nextGrades;
    persist();
    save('studyflow.grades.v1',grades);
    showSchoolSyncStatus(`Synced ${data.assignments.length} assignments and ${data.grades.length} grades.` +
      (data.undated ? ` Skipped ${data.undated} assignments without due dates.` : '') +
      (data.unsupportedScores ? ` Skipped ${data.unsupportedScores} unavailable or unsupported scores.` : ''));
  } catch (error) {
    showSchoolSyncStatus(error.message || 'Sync failed. Try again.');
  } finally {
    schoolSyncBusy = false;
    if (page === 'school') render();
  }
}

function startSchoolSync() {
  if (schoolSyncBusy) return false;
  schoolSyncOwner = globalThis.studyAccount.user?.id;
  if (!schoolSyncOwner || !sync.loaded || sync.conflict) {
    showSchoolSyncStatus('Check your account and resolve any pending sync conflict first.');
    return false;
  }
  schoolSyncBusy = true;
  return true;
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (form.id !== 'canvas-sync') return;
  event.preventDefault();
  if (!startSchoolSync()) return;
  const fields = new FormData(form);
  form.elements.namedItem('token').value = '';
  form.querySelector('[type=submit]').disabled = true;
  void importSchoolWork('canvas',fields.get('token').trim(),fields.get('origin').trim());
});

document.addEventListener('click', async event => {
  if (event.target.id !== 'classroom-sync' || !startSchoolSync()) return;
  event.target.disabled = true;
  showSchoolSyncStatus('Opening Google consent…');
  const onFailure = message => {
    schoolSyncBusy = false;
    showSchoolSyncStatus(message);
    if (page === 'school') render();
  };
  try {
    if (!authConfig.googleClientId) throw new Error('Google Classroom is unavailable on this site.');
    if (!globalThis.google?.accounts?.oauth2) await loadClassroomScript();
    const client = google.accounts.oauth2.initTokenClient({
      client_id:authConfig.googleClientId,
      scope:'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly',
      include_granted_scopes:false,
      callback: result => {
        if (!result.access_token) return onFailure('Google Classroom permission was not granted.');
        if (globalThis.studyAccount.user?.id !== schoolSyncOwner) return onFailure('Your StudyFlow account changed. Try again.');
        void importSchoolWork('classroom',result.access_token);
      },
      error_callback:() => onFailure('Google consent was closed or could not open. Try again.')
    });
    client.requestAccessToken({prompt:'select_account'});
  } catch(error) {
    onFailure(error.message);
  }
});
