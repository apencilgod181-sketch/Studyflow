let practiceOwner;
let practiceUpload = {};

function aiPractice() {
  const owner = globalThis.studyAccount.user?.id;
  if (owner !== practiceOwner) {
    practiceOwner = owner;
    practiceUpload = {};
  }
  const title = heading('PRACTICE TEST', 'Turn your work into a practice test.', 'Choose a document, then click Generate practice test when you’re ready.');
  if (location.hostname?.endsWith('.chatgpt.site')) {
    return title + '<section class="card"><a class="button" href="https://studyflow.apencilgod181.workers.dev/#practice">Open AI practice tests ↗</a></section>';
  }
  if (!owner) {
    return title + '<section class="card"><h2>Sign in to create a test</h2><p class="muted">Use your StudyFlow account to upload a document.</p><a class="button" href="#login">Log in ↗</a> <a class="button secondary" href="#signup">Sign up</a></section>';
  }
  const {file, busy, error, questions, answers, graded} = practiceUpload;
  return title + `<div class="practice-layout">
    <section class="card">
      <h2>Upload your work</h2>
      <div>
        <label>Study document
          <input type="file" id="practice-file" accept=".pdf,.docx,.txt,.md" aria-describedby="practice-file-help" ${busy?'disabled':''}>
        </label>
        <p class="muted" id="practice-file-help">PDF, Word (.docx), TXT, or Markdown, up to 2 MB. For long documents, upload the section you want to study.</p>
        <p class="muted" id="practice-file-status" role="status">${file?'Ready: '+esc(file.name):'Choose notes, a worksheet, or a study guide.'}</p>
        <p class="muted">Your document goes to Cloudflare AI when you generate a test. StudyFlow doesn’t save the document or test. Remove personal details before uploading.</p>
        <button class="button" type="button" id="practice-generate" aria-busy="${Boolean(busy)}" ${busy||!file?'disabled':''}>${busy?'Creating your test…':'Generate practice test ✧'}</button>
        <button class="text-button delete-control" type="button" id="practice-clear-file" ${busy||!file?'hidden':''}>Remove selected file</button>
        <p class="form-error" id="practice-upload-error" role="alert">${esc(error||'')}</p>
      </div>
    </section>
    <section class="card">
      <h2>Your practice test</h2>
      ${questions ? practiceQuiz(questions, answers, graded) : `<p class="empty" role="status">${busy?'Reading your document and writing questions…':'Your questions will appear here.'}</p>`}
      ${questions && !busy ? '<button class="text-button delete-control" type="button" id="practice-clear-test">Clear practice test</button>' : ''}
    </section>
  </div>`;
}

function practiceQuiz(questions, answers, graded) {
  const score = questions.filter((question, index) => answers[index] === question.correct).length;
  return `<form id="practice-quiz">
    ${graded ? `<p class="notice" role="status"><strong>${score} / ${questions.length} correct</strong></p>` : '<p class="muted">Choose one answer for each question, then check your score.</p>'}
    ${questions.map((question, index) => `<fieldset class="question" style="border:0;border-bottom:1px solid var(--line);margin:16px 0">
      <legend><strong>${index+1}. ${esc(question.prompt)}</strong></legend>
      ${question.options.map((option, optionIndex) => `<label style="display:flex;align-items:start;gap:10px">
        <input style="width:auto;margin-top:3px" type="radio" name="answer-${index}" value="${optionIndex}" required ${answers[index]===optionIndex?'checked':''} ${graded?'disabled':''}>
        <span>${esc(option)}</span>
      </label>`).join('')}
      ${graded ? `<p><strong>${answers[index]===question.correct?'Correct':'Correct answer: '+esc(question.options[question.correct])}</strong><br>${esc(question.explanation)}</p>` : ''}
    </fieldset>`).join('')}
    ${graded ? '<button class="button secondary" type="button" id="practice-retake">Retake test</button>' : '<button class="button" type="submit">Check answers</button>'}
  </form>`;
}

document.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'practice-file') {
    const file = input.files[0];
    practiceUpload.file = file;
    practiceUpload.error = '';
    $('#practice-file-status').textContent = file ? 'Ready: ' + file.name : 'Choose notes, a worksheet, or a study guide.';
    $('#practice-upload-error').textContent = '';
    $('#practice-generate').disabled = !file;
    $('#practice-clear-file').hidden = !file;
  }
  if (input.form?.id === 'practice-quiz') {
    practiceUpload.answers[Number(input.name.slice(7))] = Number(input.value);
  }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'practice-quiz') {
    event.preventDefault();
    practiceUpload.graded = true;
    render();
    $('#practice-quiz').scrollIntoView({block:'start'});
    return;
  }
});

async function generatePracticeTest() {
  const upload = practiceUpload;
  if (upload.busy) return;
  const file = upload.file;
  if (!file?.size || file.size > 2 * 1024 * 1024 || !/\.(pdf|docx|txt|md)$/i.test(file.name)) {
    upload.error = 'Choose a non-empty PDF, DOCX, TXT, or Markdown file up to 2 MB.';
    render();
    return;
  }
  upload.busy = true;
  upload.error = '';
  render();
  try {
    const form = new FormData();
    form.append('work', file);
    const response = await fetch('/api/practice-test', {method:'POST', body:form});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'AI practice tests are available on the live Cloudflare site.');
    upload.questions = data.questions;
    upload.answers = [];
    upload.graded = false;
    upload.file = undefined;
  } catch (error) {
    upload.error = error.message;
  } finally {
    upload.busy = false;
    if (page === 'practice' && upload === practiceUpload) render();
  }
}

document.addEventListener('click', event => {
  if (event.target.id === 'practice-clear-file' && !practiceUpload.busy) {
    practiceUpload.file = undefined;
    practiceUpload.error = '';
    render();
    $('#practice-file').focus();
    return;
  }
  if (event.target.id === 'practice-clear-test' && !practiceUpload.busy) {
    if (confirm('Clear this practice test and its answers?')) {
      practiceUpload.questions = undefined;
      practiceUpload.answers = [];
      practiceUpload.graded = false;
      render();
    }
    return;
  }
  if (event.target.id === 'practice-generate') {
    void generatePracticeTest();
    return;
  }
  if (event.target.id !== 'practice-retake') return;
  practiceUpload.answers = [];
  practiceUpload.graded = false;
  render();
});
const coachActions = {
  dashboard:['Plan today with AI','open assignments and study time'],
  weekly:['Plan the week with AI','upcoming assignments and study time'],
  session:['Break this task into steps with AI','selected assignment'],
  grades:['Get AI review suggestions','recent assessment names, subjects, and grades']
};

function studyCoachCard(mode) {
  if (!globalThis.studyAccount.user) return '';
  const [label, context] = coachActions[mode];
  return `<section class="card coach-card"><h2>Study coach</h2>
    <p class="muted">This sends your ${context} to Cloudflare Workers AI when you click. Check suggestions against your schoolwork.</p>
    <button class="button secondary" type="button" data-coach="${mode}">${label}</button>
    <p class="coach-output" role="status"></p>
  </section>`;
}

function studyCoachContext(mode) {
  if (mode === 'grades') return [...grades].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10)
    .map(grade => ({subject:grade.subject, assessment:grade.name, result:gradeResultText(grade), scale:gradeScales[gradeScaleKey(grade)].label}));
  if (mode === 'session') {
    const task = assignments.find(item => item.id === session.task && !item.completed);
    return task ? {assignment:task.name, subject:task.subject} : null;
  }
  const horizon = dayDate(dateKey());
  horizon.setDate(horizon.getDate()+7);
  const tasks = sorted().filter(task=>!task.completed && (mode!=='weekly'||task.due<=dateKey(horizon))).slice(0,15);
  return tasks.length ? {today:dateKey(), budget, tasks:tasks.map(({name,subject,due,minutes,priority})=>({name,subject,due,minutes,priority}))} : null;
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-coach]');
  if (!button || button.disabled) return;
  const mode = button.dataset.coach;
  const output = button.closest('.coach-card').querySelector('.coach-output');
  const context = studyCoachContext(mode);
  if (!context || (Array.isArray(context) && !context.length)) {
    output.textContent = mode === 'session' ? 'Choose an assignment first.' : mode === 'grades' ? 'Record a grade first.' : 'Add an upcoming assignment first.';
    return;
  }
  button.disabled = true;
  output.textContent = 'Preparing suggestions…';
  try {
    const data = await requestAPI('study-coach',{
      method:'POST',headers:{'X-StudyFlow-Account':globalThis.studyAccount.user.id},
      body:JSON.stringify({mode,context:JSON.stringify(context)})
    });
    output.textContent = data.advice;
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
