const studyProgrammes = {
  myp: {label:'IB Middle Years Programme (MYP)', courses:['Language and literature','Language acquisition','Individuals and societies','Sciences','Mathematics','Arts','Physical and health education','Design','Personal project'], source:'https://www.ibo.org/programmes/middle-years-programme/curriculum/'},
  dp: {label:'IB Diploma Programme (DP)', courses:['English A','Language B','History','Economics','Biology','Chemistry','Physics','Math: Analysis and Approaches','Math: Applications and Interpretation','Visual arts','Theory of knowledge'], source:'https://www.ibo.org/programmes/diploma-programme/curriculum/'},
  ap: {label:'Advanced Placement (AP)', courses:['AP English Language and Composition','AP Calculus AB','AP Statistics','AP Biology','AP Chemistry','AP Physics 1','AP U.S. History','AP World History: Modern','AP Psychology','AP Computer Science A'], source:'https://apstudents.collegeboard.org/courses'},
  gcse: {label:'GCSE or IGCSE', courses:['English Language','English Literature','Mathematics','Biology','Chemistry','Physics','History','Geography','Computer Science','Art and Design'], source:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/'},
  alevel: {label:'AS or A Levels', courses:['Mathematics','Further Mathematics','Biology','Chemistry','Physics','Economics','History','English Literature','Psychology','Computer Science'], source:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/'},
  general: {label:'General school curriculum (letter grades or percentages)', courses:['English','Mathematics','Biology','Chemistry','Physics','History','Geography','World Language','Computer Science','Art']},
  other: {label:'Other or mixed programme', courses:['Languages','Mathematics','Science','Humanities','Technology','Arts']}
};

function setupKey() {
  return 'studyflow.setup.v1.' + (globalThis.studyAccount.user?.id || 'guest');
}

function setupPreferences() {
  return read(setupKey(), null);
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

function setupPage() {
  const saved = setupPreferences();
  const programme = Object.hasOwn(studyProgrammes, saved?.programme) ? saved.programme : '';
  const selected = setupSuggestedSubjects();
  const custom = selected.filter(course => !studyProgrammes[programme]?.courses.includes(course));
  return heading('YOUR STUDY SPACE','Set up your courses','Pick your programme and the subjects you want to track.') + `
    <section class="card setup-card">
      <form id="study-setup-form">
        <label for="study-programme">Which programme or grading system do you use?</label>
        <select id="study-programme" name="programme" required>
          <option value="">Choose a programme</option>
          ${Object.entries(studyProgrammes).map(([key, option]) => `<option value="${key}" ${key===programme?'selected':''}>${esc(option.label)}</option>`).join('')}
        </select>
        <fieldset class="setup-subjects">
          <legend>Suggested subjects</legend>
          <p class="muted">Select any subjects you take. Availability varies by school.</p>
          <div id="setup-suggestions" aria-live="polite">${setupChoices(programme,selected)}</div>
        </fieldset>
        <label for="setup-custom">Your own subjects (optional)</label>
        <textarea id="setup-custom" name="custom" rows="2" maxlength="900" placeholder="Enter one subject per line">${esc(custom.join('\n'))}</textarea>
        <p class="muted">Your choices appear in the subject pickers when adding tasks and grades.</p>
        <p id="setup-error" class="form-error" role="alert"></p>
        <button class="button" type="submit">Save and open dashboard</button>
        <button class="text-button" type="button" id="skip-study-setup">${saved?.programme ? 'Back to dashboard' : 'Skip for now'}</button>
      </form>
    </section>`;
}

function setupDashboardCard() {
  const saved = setupPreferences();
  if (!saved) return '<section class="card setup-dashboard"><h2>Set up your courses</h2><p class="muted">Pick a programme and get subject suggestions for your planner.</p><a class="button secondary small" href="#setup">Start setup →</a></section>';
  if (!Object.hasOwn(studyProgrammes, saved.programme)) return '';
  const subjects = setupSuggestedSubjects();
  return `<section class="card setup-dashboard">
    <div class="section-head"><h2>My courses</h2><a class="text-button" href="#setup">Edit setup →</a></div>
    <p class="muted">${esc(studyProgrammes[saved.programme].label)}</p>
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
  const subjects = [...fields.getAll('course').filter(course => allowed.includes(course)), ...fields.get('custom').split(/\r?\n/)]
    .map(course => course.trim()).filter(Boolean);
  const unique = [...new Map(subjects.map(course => [course.toLowerCase(),course])).values()];
  if (unique.length > 30 || unique.some(course => course.length > 40)) {
    $('#setup-error').textContent = 'Choose up to 30 subjects. Keep each name to 40 characters or fewer.';
    return;
  }
  try { localStorage.setItem(setupKey(), JSON.stringify({programme,subjects:unique})); }
  catch { $('#setup-error').textContent = 'Your browser could not save this setup.'; return; }
  location.hash = '#dashboard';
  toast('Course setup saved.');
});

document.addEventListener('click', event => {
  if (event.target.id !== 'skip-study-setup') return;
  if (!setupPreferences()) {
    try { localStorage.setItem(setupKey(), JSON.stringify({skipped:true})); }
    catch { /* The dashboard link still works for this visit. */ }
  }
  location.hash = '#dashboard';
});
