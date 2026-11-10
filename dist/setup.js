const studyProgrammes = {
  myp: {label:'IB Middle Years Programme (MYP)', courses:['Language and literature','Language acquisition','Individuals and societies','Sciences','Mathematics','Arts','Physical and health education','Design','Personal project'], source:'https://www.ibo.org/programmes/middle-years-programme/curriculum/'},
  dp: {label:'IB Diploma Programme (DP)', courses:['English A','Language B','History','Economics','Biology','Chemistry','Physics','Math: Analysis and Approaches','Math: Applications and Interpretation','Visual arts','Theory of knowledge'], source:'https://www.ibo.org/programmes/diploma-programme/curriculum/'},
  ap: {label:'Advanced Placement (AP)', courses:['AP English Language and Composition','AP Calculus AB','AP Statistics','AP Biology','AP Chemistry','AP Physics 1','AP U.S. History','AP World History: Modern','AP Psychology','AP Computer Science A'], source:'https://apstudents.collegeboard.org/courses'},
  gcse: {label:'GCSE or IGCSE', courses:['English Language','English Literature','Mathematics','Biology','Chemistry','Physics','History','Geography','Computer Science','Art and Design'], source:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/'},
  alevel: {label:'AS or A Levels', courses:['Mathematics','Further Mathematics','Biology','Chemistry','Physics','Economics','History','English Literature','Psychology','Computer Science'], source:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/'},
  general: {label:'General school curriculum (letter grades or percentages)', courses:['English','Mathematics','Biology','Chemistry','Physics','History','Geography','World Language','Computer Science','Art']},
  other: {label:'Other or mixed programme', courses:['Languages','Mathematics','Science','Humanities','Technology','Arts']}
};

const studyGoals = {
  deadlines: {label:'Stay on top of deadlines', page:'weekly', action:'Open weekly plan'},
  grades: {label:'Track and improve my grades', page:'grades', action:'Open grades'},
  focus: {label:'Build a study routine', page:'session', action:'Start a study session'},
  tests: {label:'Prepare for tests', page:'practice', action:'Open practice'}
};

function setupKey() {
  return 'studyflow.setup.v1.' + (globalThis.studyAccount.user?.id || 'guest');
}

function setupPreferences() {
  return read(setupKey(), null);
}

function programmeGradeScale() {
  const preferences = setupPreferences();
  if (Object.hasOwn(gradeScales, preferences?.gradeScale)) return preferences.gradeScale;
  switch (preferences?.programme) {
    case 'myp':
    case 'dp': return 'ib';
    case 'ap': return 'ap';
    case 'gcse': return 'gcse';
    case 'alevel': return 'alevel';
    default: return 'points';
  }
}

function setupSuggestedSubjects() {
  const subjects = setupPreferences()?.subjects;
  return Array.isArray(subjects) ? subjects : [];
}

function setupChoices(programme, selected) {
  if (!Object.hasOwn(studyProgrammes, programme)) {
    return '<p class="muted">Choose a programme to see suggested subjects.</p>';
  }
  const {courses, source} = studyProgrammes[programme];
  return `<div class="setup-choices">${courses.map(course => `<label>
    <input type="checkbox" name="course" value="${esc(course)}" ${selected.includes(course)?'checked':''}> ${esc(course)}
  </label>`).join('')}</div>${source ? `<a class="text-button" href="${source}" target="_blank" rel="noopener">Explore programme subjects ↗</a>` : ''}`;
}

function customSubjectRow(name='') {
  return `<div class="setup-subject-row">
    <label>Subject name<input name="customSubject" maxlength="40" placeholder="e.g. Robotics" value="${esc(name)}"></label>
    <button class="button secondary small" type="button" data-remove-subject>Remove subject</button>
  </div>`;
}

function setupPage() {
  const saved = setupPreferences();
  const programme = Object.hasOwn(studyProgrammes, saved?.programme) ? saved.programme : '';
  const selected = setupSuggestedSubjects();
  const custom = selected.filter(course => !studyProgrammes[programme]?.courses.includes(course));
  return heading('YOUR STUDY SPACE','Set up your study plan','Tell us what you study and how much time you have.') + `
    <section class="card setup-card">
      <form id="study-setup-form">
        <fieldset class="setup-subjects">
          <legend>About your studies</legend>
          <p class="muted">Age, grade or year level, and your goal are optional. ${globalThis.studyAccount.user?'Your setup is saved to your account.':'As a guest, your setup stays in this browser.'}</p>
          <div class="setup-details">
            <div>
              <label for="setup-age">Age (optional)</label>
              <input id="setup-age" name="age" type="number" min="5" max="120" value="${esc(saved?.age ?? '')}">
            </div>
            <div>
              <label for="setup-level">Grade or year level (optional)</label>
              <input id="setup-level" name="level" maxlength="40" placeholder="e.g. Grade 9 or Year 10" value="${esc(saved?.level ?? '')}">
            </div>
            <div>
              <label for="setup-minutes">Daily study time (minutes)</label>
              <input id="setup-minutes" name="minutes" type="number" min="15" max="480" value="${budget}" required aria-describedby="setup-time-help">
              <p id="setup-time-help" class="muted">This sets the time budget on your dashboard.</p>
            </div>
            <div>
              <label for="setup-goal">Main study goal (optional)</label>
              <select id="setup-goal" name="goal">
                <option value="">Choose a goal</option>
                ${Object.entries(studyGoals).map(([key, goal]) => `<option value="${key}" ${key===saved?.goal?'selected':''}>${esc(goal.label)}</option>`).join('')}
              </select>
            </div>
          </div>
        </fieldset>
        <label for="study-programme">Which programme or grading system do you use?</label>
        <select id="study-programme" name="programme" required>
          <option value="">Choose a programme</option>
          ${Object.entries(studyProgrammes).map(([key, option]) => `<option value="${key}" ${key===programme?'selected':''}>${esc(option.label)}</option>`).join('')}
        </select>
        <label for="setup-grade-scale">Default grading scale</label>
        <select id="setup-grade-scale" name="gradeScale">
          <option value="">Use my programme’s default</option>
          ${Object.entries(gradeScales).map(([key, scale]) => `<option value="${key}" ${saved?.gradeScale===key?'selected':''}>${esc(scale.label)}</option>`).join('')}
        </select>
        <fieldset class="setup-subjects">
          <legend>Suggested subjects</legend>
          <p class="muted">Select any subjects you take. Availability varies by school.</p>
          <div id="setup-suggestions" aria-live="polite">${setupChoices(programme,selected)}</div>
        </fieldset>
        <fieldset class="setup-subjects">
          <legend>Your own subjects</legend>
          <p class="muted">Add any subject you take. Your choices appear when adding tasks and grades.</p>
          <div id="setup-custom-subjects">${custom.map(customSubjectRow).join('')}</div>
          <button class="button secondary small" type="button" id="add-setup-subject"><span aria-hidden="true">＋</span> Add subject</button>
        </fieldset>
        <p id="setup-error" class="form-error" role="alert"></p>
        <button class="button" type="submit">Save and open dashboard</button>
        <button class="text-button" type="button" id="skip-study-setup">${saved?.programme ? 'Back to dashboard' : 'Skip for now'}</button>
      </form>
    </section>`;
}

function setupDashboardCard() {
  const saved = setupPreferences();
  if (!saved?.programme) return '<section class="card setup-dashboard"><h2>Set up your study plan</h2><p class="muted">Pick a programme and get subject suggestions for your planner.</p><a class="button secondary small" href="#setup">Start setup →</a></section>';
  if (!Object.hasOwn(studyProgrammes, saved.programme)) return '';
  const subjects = setupSuggestedSubjects();
  const goal = Object.hasOwn(studyGoals, saved.goal) ? studyGoals[saved.goal] : null;
  return `<section class="card setup-dashboard">
    <div class="section-head"><h2>My courses</h2><a class="text-button" href="#setup">Edit setup →</a></div>
    <p class="muted">${esc(studyProgrammes[saved.programme].label)}</p>
    ${goal ? `<p>Study goal: ${esc(goal.label)} · <a class="text-button" href="#${goal.page}">${esc(goal.action)} →</a></p>` : ''}
    <div class="setup-course-tags">${subjects.map(subject => `<span class="subject">${esc(subject)}</span>`).join('') || '<span class="muted">No subjects selected yet.</span>'}</div>
  </section>`;
}

document.addEventListener('change', event => {
  if (event.target.id !== 'study-programme') return;
  const previous = new FormData(event.target.form).getAll('course');
  $('#setup-suggestions').innerHTML = setupChoices(event.target.value, previous);
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'study-setup-form') return;
  event.preventDefault();
  const fields = new FormData(event.target);
  const programme = fields.get('programme');
  if (!Object.hasOwn(studyProgrammes, programme)) return;
  const allowed = studyProgrammes[programme].courses;
  const subjects = [...fields.getAll('course').filter(course => allowed.includes(course)), ...fields.getAll('customSubject')]
    .map(course => course.trim()).filter(Boolean);
  const seen = new Set();
  const unique = subjects.filter(course => {
    const key = course.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length > 30 || unique.some(course => course.length > 40)) {
    $('#setup-error').textContent = 'Choose up to 30 subjects. Keep each name to 40 characters or fewer.';
    return;
  }
  const age = fields.get('age') ? Number(fields.get('age')) : null;
  const level = (fields.get('level') || '').trim();
  const minutes = Number(fields.get('minutes'));
  const goal = Object.hasOwn(studyGoals, fields.get('goal')) ? fields.get('goal') : '';
  if (age !== null && (!Number.isInteger(age) || age < 5 || age > 120)) {
    $('#setup-error').textContent = 'Enter a whole number for age between 5 and 120.';
    return;
  }
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 480) {
    $('#setup-error').textContent = 'Choose between 15 and 480 minutes of study time.';
    return;
  }
  const gradeScale = Object.hasOwn(gradeScales, fields.get('gradeScale')) ? fields.get('gradeScale') : '';
  try { localStorage.setItem(setupKey(), JSON.stringify({programme,subjects:unique,age,level,goal,gradeScale})); }
  catch { $('#setup-error').textContent = 'Your browser could not save this setup.'; return; }
  if (budget !== minutes) {
    budget = minutes;
    save('studyflow.budget.v1', budget);
  } else globalThis.studySyncChanged?.();
  location.hash = '#dashboard';
  toast('Study setup saved.');
});

document.addEventListener('click', event => {
  if (event.target.closest?.('#add-setup-subject')?.id === 'add-setup-subject') {
    const list = $('#setup-custom-subjects');
    if (list.children.length >= 30) {
      $('#setup-error').textContent = 'You can add up to 30 subjects.';
      return;
    }
    list.insertAdjacentHTML('beforeend',customSubjectRow());
    list.lastElementChild.querySelector('input').focus();
    return;
  }
  const remove = event.target.closest?.('[data-remove-subject]');
  if (remove?.hasAttribute?.('data-remove-subject')) {
    remove.closest('.setup-subject-row').remove();
    $('#add-setup-subject').focus();
    return;
  }
  if (event.target.id !== 'skip-study-setup') return;
  if (!setupPreferences()) {
    try { localStorage.setItem(setupKey(), JSON.stringify({skipped:true})); globalThis.studySyncChanged?.(); }
    catch { /* The dashboard link still works for this visit. */ }
  }
  location.hash = '#dashboard';
});
