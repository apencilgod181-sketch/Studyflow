let undoCompletion;
globalThis.studyAccount={user:null,ready:false};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayDate = s => new Date(s+'T12:00:00');
const offsetDay = n => {const d=new Date();d.setDate(d.getDate()+n);return dateKey(d);};
const today = dateKey();
const seed = () => [
 {id:'example-1',name:'Quadratic equations · Practice set',subject:'Math',due:offsetDay(0),minutes:30,priority:'high',type:'Assignment',completed:false},
 {id:'example-2',name:'Read & annotate chapter 4',subject:'English',due:offsetDay(1),minutes:25,priority:'normal',type:'Assignment',completed:false},
 {id:'example-3',name:'Cell biology · Review notes',subject:'Biology',due:offsetDay(2),minutes:40,priority:'normal',type:'Test',completed:false},
 {id:'example-4',name:'French vocabulary flashcards',subject:'French',due:offsetDay(0),minutes:15,priority:'low',type:'Assignment',completed:true},
 {id:'example-5',name:'Industrial Revolution essay outline',subject:'History',due:offsetDay(4),minutes:45,priority:'normal',type:'Assignment',completed:false},
 {id:'example-6',name:'Forces & motion quiz',subject:'Physics',due:offsetDay(5),minutes:35,priority:'normal',type:'Test',completed:false}
];
let storageError=false;
function read(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch{storageError=true;return fallback;}}
let assignments=read('studyflow.assignments.v1',null);
if(!Array.isArray(assignments)||!assignments.every(a=>a && typeof a.id==='string' && typeof a.name==='string' && typeof a.subject==='string' && /^\d{4}-\d{2}-\d{2}$/.test(a.due) && Number.isFinite(a.minutes) && a.minutes>0)){assignments=seed();}
let budget=Number(read('studyflow.budget.v1',90));if(!Number.isFinite(budget)||budget<15||budget>480)budget=90;
let session=read('studyflow.session.v1',null);
let focusChimeEnabled = read('studyflow.focus-chime.v1', true);
let focusAudio;

function prepareFocusChime() {
  if (!focusChimeEnabled) return;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return;
  try {
    focusAudio ||= new Audio();
    void focusAudio.resume().catch(() => {});
  } catch { /* The timer remains usable without audio. */ }
}

function playFocusChime() {
  if (!focusChimeEnabled || focusAudio?.state !== 'running') return;
  const now = focusAudio.currentTime;
  [523.25, 659.25, 783.99].forEach((pitch, index) => {
    const start = now + index * .20;
    const note = focusAudio.createOscillator();
    const volume = focusAudio.createGain();
    note.frequency.value = pitch;
    note.connect(volume).connect(focusAudio.destination);
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(.13, start + .03);
    volume.gain.exponentialRampToValueAtTime(.001, start + .45);
    note.start(start);
    note.stop(start + .46);
  });
}

document.addEventListener('change', event => {
  if (event.target.id !== 'focus-chime') return;
  focusChimeEnabled = event.target.checked;
  try { localStorage.setItem('studyflow.focus-chime.v1', JSON.stringify(focusChimeEnabled)); }
  catch { /* Keep this setting for the current visit. */ }
  prepareFocusChime();
});
if(!session||!Number.isFinite(session.remaining)||!['idle','running','paused','finished'].includes(session.status))session={status:'idle',remaining:1500,endsAt:null,task:''};
let page='dashboard',weekOffset=0,showAll=false,notes='',questions=[],dailyPlan=[];
function save(key,value){try{const user=globalThis.studyAccount.user;localStorage.setItem(user?'studyflow.user.'+user.id+'.'+key:key,JSON.stringify(value));if(globalThis.studySyncChanged&&['studyflow.assignments.v1','studyflow.budget.v1','studyflow.grades.v1'].includes(key))globalThis.studySyncChanged();}catch{storageError=true;toast('Browser storage is unavailable. Changes last for this visit only.');}}
function persist(){save('studyflow.assignments.v1',assignments);}
persist();
function toast(message){$('#toast-message').textContent=message;$('#undo-completion').hidden=true;undoCompletion=undefined;$('#toast').classList.add('visible');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function sorted(){const ranks={high:0,normal:1,low:2};return [...assignments].sort((a,b)=>Number(a.completed)-Number(b.completed)||a.due.localeCompare(b.due)||(ranks[a.priority]??1)-(ranks[b.priority]??1));}
function plan(){let room=budget;const result=[];for(const a of sorted().filter(a=>!a.completed)){if(room<=0)break;const minutes=Math.min(a.minutes,room,40);result.push({...a,blockMinutes:minutes});room-=minutes;}return result;}
function dueLabel(d){const diff=Math.round((dayDate(d)-dayDate(today))/86400000);return diff===0?'Due today':diff===1?'Due tomorrow':diff<0?'Due '+dayDate(d).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Due '+dayDate(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});}
function heading(kicker,title,description,action=''){return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p class="subtitle">${description}</p></div>${action}</div>`;}
const addButton='<button class="button" data-action="add"><span>＋</span> Add assignment</button>';
function taskHTML(a,block=false){return `<div class="task ${a.completed?'done':''}"><input type="checkbox" data-complete="${esc(a.id)}" ${a.completed?'checked':''} aria-label="Mark ${esc(a.name)} as ${a.completed?'incomplete':'complete'}"><div class="task-details"><label class="task-title" style="display:block;margin:0;color:inherit" for="task-${esc(a.id)}">${esc(a.name)}</label><div class="task-meta"><span class="subject">${esc(a.subject)}</span><span>${esc(dueLabel(a.due))}</span>${a.type==='Test'?'<span>· Test</span>':''}${a.priority==='high'&&!a.completed?'<span class="high">· Start here</span>':''}</div>${block&&a.blockMinutes<a.minutes?`<div class="muted">${a.blockMinutes}-min study block · ${a.minutes} min total</div>`:''}</div><span class="task-time">◷ &nbsp;${block?a.blockMinutes:a.minutes} min</span><div class="entry-actions"><button class="text-button task-edit" type="button" data-action="edit" data-task="${esc(a.id)}" aria-label="Edit ${esc(a.name)}">Edit</button><button class="text-button delete-control" type="button" data-action="delete-task" data-task="${esc(a.id)}" aria-label="Delete ${esc(a.name)}">Delete</button></div></div>`;}
const widgetCatalog = {
  overview:{name:'Progress overview', detail:'Grades and completion by subject', wide:true},
  plan:{name:'Study plan', detail:'Your assignments and daily study time', wide:true},
  deadlines:{name:'Next deadlines', detail:'The next three open assignments'},
  workload:{name:'Week at a glance', detail:'Seven days of upcoming work'},
  progress:{name:'Completion ring', detail:'How much of your work is complete'},
  activity:{name:'Recent activity', detail:'Your last seven days of progress'},
  focus:{name:'Focus shortcut', detail:'Jump into a study session'},
  journal:{name:'Progress journal', detail:'Your latest reflection or photo'},
  courses:{name:'My courses', detail:'Subjects and course setup'},
  coach:{name:'Study coach', detail:'Ask AI to help plan today', wide:true}
};
const defaultWidgets = ['overview','plan','progress','activity','focus','journal','courses','coach'];
let editingWidgets = false;

function dashboardWidgetKey() {
  return 'studyflow.widgets.v1.' + (globalThis.studyAccount.user?.id || 'guest');
}

function dashboardWidgetOrder() {
  const saved = read(dashboardWidgetKey(), defaultWidgets);
  return Array.isArray(saved) ? [...new Set(saved.filter(key=>Object.hasOwn(widgetCatalog,key)))] : defaultWidgets;
}

function dashboardBoard(renderers) {
  const order = dashboardWidgetOrder();
  const available = Object.keys(widgetCatalog).filter(key=>!order.includes(key) && renderers[key]());
  const widgets = order.map((key,index)=>{
    const content = renderers[key]();
    if (!content && !editingWidgets) return '';
    const {name,wide} = widgetCatalog[key];
    return `<div class="board-widget widget-${key}${wide?' widget-wide':''}">
      ${editingWidgets ? `<div class="widget-tools"><strong>${name}</strong>
        <button type="button" data-widget="${key}" data-widget-action="earlier" aria-label="Move ${name} earlier" ${index===0?'disabled':''}>↑</button>
        <button type="button" data-widget="${key}" data-widget-action="later" aria-label="Move ${name} later" ${index===order.length-1?'disabled':''}>↓</button>
        <button type="button" data-widget="${key}" data-widget-action="remove" aria-label="Remove ${name}">×</button>
      </div>` : ''}
      ${content || '<div class="card muted">Available when you sign in or finish loading this feature.</div>'}
    </div>`;
  }).join('');
  return `<section class="dashboard-board" aria-labelledby="board-title">
    <div class="section-head"><div><h2 id="board-title">Your dashboard</h2><p class="muted">Make room for what matters to you.</p></div>
      <button class="button secondary small" type="button" data-widget-action="toggle" aria-expanded="${editingWidgets}" aria-controls="widget-library">${editingWidgets?'Done customizing':'Customize widgets'}</button>
    </div>
    <section class="card widget-library" id="widget-library" ${editingWidgets?'':'hidden'}>
      <div class="section-head"><div><h3>Add widgets</h3><p class="muted">Changes save automatically in this browser.</p></div><button class="text-button" type="button" data-widget-action="reset">Restore defaults</button></div>
      <div class="widget-options">${available.map(key=>`<button type="button" data-widget="${key}" data-widget-action="add"><strong>＋ ${widgetCatalog[key].name}</strong><small>${widgetCatalog[key].detail}</small></button>`).join('') || '<p class="muted">All available widgets are on your board.</p>'}</div>
    </section>
    <div class="widget-grid${editingWidgets?' widget-grid-editing':''}">${widgets || '<p class="card muted">Your board is empty. Customize widgets to add a card.</p>'}</div>
  </section>`;
}

function deadlineWidget() {
  const tasks = sorted().filter(task=>!task.completed).slice(0,3);
  return `<section class="card deadline-card"><p class="eyebrow">COMING UP</p><h2>Next deadlines</h2>
    ${tasks.length?`<ul class="widget-deadlines">${tasks.map(task=>`<li><strong>${esc(task.name)}</strong><span>${esc(task.subject)} · ${esc(dueLabel(task.due))}</span></li>`).join('')}</ul>`:'<p class="muted">No open deadlines.</p>'}
    <a href="#weekly" class="text-button">Open weekly plan →</a></section>`;
}

function workloadWidget() {
  const days = Array.from({length:7},(_,index)=>offsetDay(index));
  const counts = days.map(day=>assignments.filter(task=>!task.completed && task.due===day).length);
  const peak = Math.max(1,...counts);
  return `<section class="card workload-card"><p class="eyebrow">THE NEXT SEVEN DAYS</p><h2>Week at a glance</h2>
    <div class="workload-bars">${days.map((day,index)=>`<div aria-label="${esc(day)}: ${counts[index]} open tasks"><strong>${counts[index]}</strong><span aria-hidden="true" style="--bar:${Math.round(counts[index]/peak*100)}%"></span><small>${esc(dayDate(day).toLocaleDateString(undefined,{weekday:'short'}))}</small></div>`).join('')}</div>
    <a href="#weekly" class="text-button">See the week →</a></section>`;
}

function weekNavigation() {
  const arrow = direction=>`<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="${direction<0?'m12 5-5 5 5 5':'m8 5 5 5-5 5'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<div class="week-toolbar" role="group" aria-label="Week navigation">
    <button type="button" data-week="-1" aria-label="Previous week">${arrow(-1)}</button>
    <button type="button" data-action="this-week"${weekOffset===0?' aria-current="date"':''}>This week</button>
    <button type="button" data-week="1" aria-label="Next week">${arrow(1)}</button>
  </div>`;
}

function dashboard(){
 const date=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});const hour=new Date().getHours();const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
 dailyPlan=plan();const items=showAll?sorted().filter(a=>!a.completed):dailyPlan;const completed=assignments.filter(a=>a.completed).length;const total=assignments.length;const ratio=total?Math.round(completed/total*100):0;const minutes=dailyPlan.filter(a=>!a.completed).reduce((sum,a)=>sum+a.blockMinutes,0);
 return heading(date.toUpperCase(),`${greeting}${typeof preferredName==='function'&&preferredName()?', '+esc(preferredName()):', you’ve got this'} <span style="font-size:24px;color:#8a9d75">☀</span>`,'A little structure. A lot more headspace.',addButton)+dashboardBoard({
  overview:()=>dashboardOverview(typeof grades==='undefined'?[]:grades),
  plan:()=>`<section class="card"><div class="section-head"><div><h2>${showAll?'All assignments':'Today’s study plan'}</h2><p class="muted">${showAll?'Everything in one place. You can take it from here.':`${dailyPlan.filter(a=>!a.completed).length} study blocks · ${minutes} min of focused time`}</p></div><span class="pill">${items.length} tasks</span></div><div class="task-list">${items.length?items.map(a=>taskHTML(a,!showAll)).join(''):'<div class="empty">A little breathing room. You’re all caught up!<br>Add an assignment whenever you’re ready.</div>'}</div><div class="plan-bottom"><span>Go at your own pace.</span><button class="text-button" data-action="toggle-all">${showAll?'Back to today':'All assignments'} →</button></div><label class="budget">Time available today <input id="budget" type="number" min="15" max="480" step="5" value="${budget}" aria-label="Minutes available to study today"> minutes</label><p class="muted">Planned by due date, then priority. Longer tasks get a manageable study block. Checking a task removes it from your planner and counts it toward your progress.</p></section>`,
  progress:()=>`<section class="card progress-card"><h2>Your progress</h2><div class="ring" style="--p:${ratio}" role="img" aria-label="${completed} of ${total} assignments complete"><div><strong>${completed}<span style="font-size:16px;color:#9aa58f"> / ${total}</span></strong><small>tasks complete</small></div></div><p>${completed?'Look at you, moving forward.':'Every little step counts.'}</p></section>`,
  activity:progressSnapshot,
  courses:()=>typeof setupDashboardCard==='function'?setupDashboardCard():'',
  journal:()=>typeof journalPreview==='function'?journalPreview():'',
  focus:()=>`<section class="card focus-card"><div class="focus-icon" aria-hidden="true">◷</div><h2>A little focus goes a long way.</h2><p>One task. A quiet moment.<br>Try a 25-minute study session.</p><a href="#session" class="button">Let’s focus <span>↗</span></a></section>`,
  deadlines:deadlineWidget,
  workload:workloadWidget,
  coach:()=>typeof studyCoachCard==='function'?studyCoachCard('dashboard'):''
 });
}
function weekly(){const start=new Date();start.setDate(start.getDate()-((start.getDay()+6)%7)+weekOffset*7);const days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});const keys=days.map(dateKey);const tasks=sorted().filter(a=>!a.completed);const earlier=tasks.filter(a=>a.due<keys[0]);return heading('THE BIG PICTURE','Your week, with a little breathing room.','See what’s coming. Make a little space for it.',addButton)+`<section><div class="section-head"><h2>${days[0].toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${days[6].toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</h2>${weekNavigation()}</div><div class="week-grid">${days.map((d,i)=>`<section class="day ${keys[i]===today?'today':''}"><div class="day-label">${d.toLocaleDateString(undefined,{weekday:'short'})}${keys[i]===today?' · Today':''}</div><div class="day-number">${d.getDate()}</div>${tasks.filter(a=>a.due===keys[i]).map(a=>`<div class="week-task ${a.completed?'done':''}"><span class="subject">${esc(a.subject)}</span><p>${esc(a.name)}</p><small>${a.type==='Test'?'Test · ':''}${a.minutes} min</small><label style="font-size:10px;display:flex;align-items:center;margin:8px 0 0"><input style="width:14px" type="checkbox" data-complete="${esc(a.id)}" ${a.completed?'checked':''}> Complete</label><div class="entry-actions"><button class="text-button task-edit" type="button" data-action="edit" data-task="${esc(a.id)}" aria-label="Edit ${esc(a.name)}">Edit</button><button class="text-button delete-control" type="button" data-action="delete-task" data-task="${esc(a.id)}" aria-label="Delete ${esc(a.name)}">Delete</button></div></div>`).join('')||'<p class="muted">Room to breathe.</p>'}</section>`).join('')}</div>${earlier.length?`<section class="card" style="margin-top:22px"><h2>Carry forward</h2><p class="muted">Earlier deadlines, ready for a fresh start.</p>${earlier.map(a=>taskHTML(a)).join('')}</section>`:''}</section>`;}
function remaining(){return session.status==='running'?Math.max(0,Math.ceil((session.endsAt-Date.now())/1000)):session.remaining;}
function sessionPage(){const active=assignments.filter(a=>!a.completed);return heading('A MOMENT TO FOCUS','One task. Your full attention.','Settle in, put distractions aside, and start when you’re ready.')+`<section class="card session-layout"><p class="eyebrow">YOUR FOCUS SPACE</p><h2>Let’s make a little progress.</h2><label>What are you working on?<select id="session-task" ${['running','paused'].includes(session.status)?'disabled':''}><option value="">Free focus · No assignment</option>${active.map(a=>`<option value="${esc(a.id)}" ${session.task===a.id?'selected':''}>${esc(a.subject)} · ${esc(a.name)}</option>`).join('')}</select></label><div id="timer" class="timer" aria-label="Time remaining">25:00</div><p class="timer-status" id="timer-status"></p><div class="timer-controls" id="timer-controls"></div><label class="focus-chime"><input id="focus-chime" type="checkbox" ${focusChimeEnabled?'checked':''}> Play a chime when time is up</label><p class="muted" style="margin-top:30px">A gentle 25-minute session. Take a break whenever you need.<br>Finishing a session doesn’t mark your assignment complete.</p></section>`;}
function updateTimer(){if(page!=='session')return;const seconds=remaining();$('#timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('#timer-status').textContent={idle:'Ready when you are.',running:'A little focus, one moment at a time.',paused:'Paused. Take your time.',finished:'Session finished. Make room for a little break.'}[session.status];if($('#timer-controls').dataset.state===session.status)return;$('#timer-controls').dataset.state=session.status;$('#timer-controls').innerHTML=session.status==='running'?'<button class="button" data-action="pause">Ⅱ Pause</button><button class="button secondary" data-action="finish">Finish session</button>':session.status==='paused'?'<button class="button" data-action="resume">▷ Resume</button><button class="button secondary" data-action="finish">Finish session</button>':`<button class="button" data-action="start">▷ ${session.status==='finished'?'Start another session':'Start focusing'}</button>`;}
let archiveQuery = '';
const themes = ['sage', 'ocean', 'midnight', 'forest', 'mountains', 'coast', 'desert', 'custom'];
let currentTheme = read('studyflow.theme.v1', 'sage');
if (!themes.includes(currentTheme)) currentTheme = 'sage';
if (document.documentElement) document.documentElement.dataset.theme = currentTheme;

function archiveResults() {
  const query = archiveQuery.trim().toLowerCase();
  const completionDate = task => typeof task.completedOn === 'string' ? task.completedOn : '';
  const tasks = assignments.filter(task => task.completed &&
    (task.name.toLowerCase().includes(query) || task.subject.toLowerCase().includes(query)));
  tasks.sort((a,b) => completionDate(b).localeCompare(completionDate(a)) || b.due.localeCompare(a.due));
  if (!tasks.length) return '<p class="empty">' + (query ? 'No completed tasks match your search.' : 'Completed tasks will appear here.') + '</p>';
  return tasks.map(task => `<div class="task archive-row">
    <div class="task-details">
      <strong class="task-title">${esc(task.name)}</strong>
      <div class="task-meta"><span class="subject">${esc(task.subject)}</span>
        <span>${completionDate(task) ? 'Completed ' + esc(dayDate(task.completedOn).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})) : 'Completed'}</span>
        <span>${task.type === 'Test' ? 'Test' : 'Assignment'} · ${task.minutes} min</span>
      </div>
    </div>
    <button class="button secondary small" data-action="restore-task" data-task="${esc(task.id)}" aria-label="Restore ${esc(task.name)}">Restore</button><button class="text-button delete-control" type="button" data-action="delete-task" data-task="${esc(task.id)}" aria-label="Delete ${esc(task.name)}">Delete</button>
  </div>`).join('');
}

function archivePage() {
  return heading('COMPLETED WORK', 'Task archive', 'Review finished assignments or restore one to your planner.') +
    `<section class="card"><label for="archive-search">Search by task or subject</label>
      <input type="search" id="archive-search" value="${esc(archiveQuery)}" placeholder="Search completed tasks">
      <div id="archive-results" class="archive-results" aria-live="polite">${archiveResults()}</div>
    </section>`;
}

const gradeScales = {
  points: {label:'Points or percentage'},
  ib: {label:'IB (1–7)', max:7},
  ap: {label:'AP exam (1–5)', max:5},
  gcse: {label:'GCSE (9–1, U)', marks:['U','1','2','3','4','5','6','7','8','9']},
  igcse: {label:'IGCSE (A*–G, U)', marks:['U','G','F','E','D','C','B','A','A*']},
  alevel: {label:'A Level (A*–E, U)', marks:['U','E','D','C','B','A','A*']},
  aslevel: {label:'AS Level (A–E, U)', marks:['U','E','D','C','B','A']},
  letter: {label:'Letter grades (A–F)', marks:['F','D','C','B','A']}
};

function gradeScaleKey(grade) {
  return Object.hasOwn(gradeScales, grade?.scale) ? grade.scale : 'points';
}

function gradeResultText(grade) {
  const key = gradeScaleKey(grade);
  const scale = gradeScales[key];
  return scale.marks?.[grade.score] ?? (key === 'points'
    ? (grade.score / grade.max * 100).toFixed(1) + '%'
    : grade.score + ' / ' + grade.max);
}

function gradeAverageText(results) {
  if (!results.length) return '—';
  const key = gradeScaleKey(results[0]);
  if (results.some(grade => gradeScaleKey(grade) !== key)) return 'Mixed scales';
  const scale = gradeScales[key];
  const average = weightedGradeAverage(results);
  if (key === 'points') return average.toFixed(1) + '%';
  if (key === 'gcse') return (average * 9 / 100).toFixed(1) + ' / 9';
  if (scale.marks) return '—';
  return (average * scale.max / 100).toFixed(1) + ' / ' + scale.max;
}

function weightedGradeAverage(results) {
  if (!results.length) return null;
  const totalWeight = results.reduce((sum, grade) => sum + grade.weight, 0);
  return results.reduce((sum, grade) => sum + grade.score / grade.max * 100 * grade.weight, 0) / totalWeight;
}

function dashboardOverview(results) {
  const completed = assignments.filter(task => task.completed).length;
  const active = assignments.length - completed;
  const subjects = [...new Set([...assignments, ...results].map(item => item.subject))].sort();
  const recent = [...results].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  return `<section class="card dashboard-overview" aria-labelledby="overview-title">
    <div class="section-head">
      <div><p class="eyebrow">THE BIG PICTURE</p><h2 id="overview-title">Your progress at a glance</h2></div>
      <a href="#grades" class="button secondary small">View grades →</a>
    </div>
    <div class="overview-metrics progress-metrics">
      <div><strong>${gradeAverageText(results)}</strong><span>Weighted grade average</span></div>
      <div><strong>${results.length}</strong><span>Recorded grades</span></div>
      <div><strong>${completed} / ${assignments.length}</strong><span>Tasks completed</span></div>
      <div><strong>${active}</strong><span>Open tasks</span></div>
    </div>
    <div class="overview-details">
      <section>
        <h3>Progress by subject</h3>
        ${subjects.length ? `<table class="overview-table">
          <thead><tr><th scope="col">Subject</th><th scope="col">Average</th><th scope="col">Tasks done</th></tr></thead>
          <tbody>${subjects.map(subject => {
            const tasks = assignments.filter(task => task.subject === subject);
            const gradesForSubject = results.filter(grade => grade.subject === subject);
            return `<tr><th scope="row">${esc(subject)}</th><td>${gradeAverageText(gradesForSubject)}</td><td>${tasks.length ? tasks.filter(task => task.completed).length + ' / ' + tasks.length : '—'}</td></tr>`;
          }).join('')}</tbody>
        </table>` : '<p class="muted">Add a task or record a grade to see your subjects here.</p>'}
      </section>
      <section>
        <h3>Recent grades</h3>
        ${recent.length ? `<ul class="overview-recent">${recent.map(grade => `<li>
          <div><strong>${esc(grade.name)}</strong><span class="muted">${esc(grade.subject)} · ${esc(grade.date)}</span></div>
          <strong>${gradeResultText(grade)}</strong>
        </li>`).join('')}</ul>` : '<p class="muted">Your latest results will appear here.</p>'}
        <a href="#grades" class="text-button">Record a grade →</a>
      </section>
    </div>
    <p class="muted">Grade averages use the weights you enter. Completed totals include tasks in your archive.</p>
  </section>`;
}

function progressSnapshot() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const firstDay = dateKey(start);
  const now = dateKey();
  const finished = assignments.filter(task => task.completed && task.completedOn >= firstDay && task.completedOn <= now);
  const active = assignments.filter(task => !task.completed);
  const overdue = active.filter(task => task.due < now).length;
  const next = active.filter(task => task.due >= now).sort((a,b) => a.due.localeCompare(b.due))[0];
  return `<section class="card progress-snapshot">
    <div class="section-head"><h2>Last 7 days</h2><a href="#archive" class="text-button">View archive →</a></div>
    <div class="progress-metrics">
      <div><strong>${finished.length}</strong><span>Tasks finished</span></div>
      <div><strong>${overdue}</strong><span>Overdue tasks</span></div>
    </div>
    <p class="muted">${next ? 'Next deadline: ' + esc(next.name) + ' · ' + esc(dueLabel(next.due)) : 'No upcoming deadlines.'}</p>
    <a href="#weekly" class="text-button">Open weekly plan →</a>
  </section>`;
}

function practice(){return (typeof aiPractice==='function'?aiPractice():'')+demoPractice();}
function demoPractice(){return heading('MAKE IT STICK','Turn your notes into a little practice.','A small space to check what you remember.')+`<div class="notice"><strong>Quick recall · On this device</strong><br>This demo turns up to 5 sentences from your notes into simple recall prompts. It doesn’t understand or check the material. Your notes stay here.</div><div class="practice-layout"><section class="card"><h2>Your study notes</h2><label for="notes">Paste a few sentences or key facts</label><textarea id="notes" maxlength="15000" placeholder="e.g. Photosynthesis converts light energy into chemical energy. Chlorophyll absorbs sunlight in the chloroplasts.">${esc(notes)}</textarea><p class="muted">Use sentences of at least 5 words. Notes aren’t saved after refreshing.</p><button class="button" data-action="questions">Create demo questions <span>✧</span></button><button class="text-button delete-control" type="button" data-action="clear-recall">Clear notes and questions</button><p id="practice-error" class="muted" role="status"></p></section><section class="card"><div class="section-head"><h2>A little knowledge check</h2><span class="pill">${questions.length} questions</span></div>${questions.length?questions.map((q,i)=>`<div class="question"><span class="eyebrow">QUESTION ${i+1}</span><div>${esc(q.prompt)}</div><details><summary>Reveal note excerpt</summary>${esc(q.answer)}</details></div>`).join(''):'<div class="empty" style="text-align:center;padding:60px 20px"><span style="font-size:35px;color:#8fa47f">✧</span><h3 style="margin-top:20px">Your next “aha” starts here.</h3>Add your notes, then create a few<br>simple questions to try.</div>'}</section></div>`;}
function render(){if(typeof applyPersonalColors==='function')applyPersonalColors();page=['dashboard','weekly','session','practice','grades','archive','personalize','school','setup','account','login','signup','recover'].includes(location.hash.slice(1))?location.hash.slice(1):(!location.hash&&globalThis.studyAccount.ready&&typeof setupPreferences==='function'&&!setupPreferences()?'setup':'dashboard');document.querySelectorAll('nav a').forEach(a=>{a.classList.toggle('active',a.dataset.page===page);if(a.dataset.page===page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#breadcrumb').textContent={dashboard:'Your overview',weekly:'Your week at a glance',session:'Your focus space',practice:'Your practice space',grades:'Your subject grades',archive:'Completed work',personalize:'Your preferences and journal',school:'School connections',setup:'Your courses and programme',account:'Your account',login:'Welcome back',signup:'Your next chapter',recover:'Recover your account'}[page];$('#main').innerHTML=(storageError?'<p class="storage-error">Browser storage is unavailable. Your changes will last for this visit only.</p>':'')+({dashboard,weekly,session:sessionPage,practice,grades:gradesPage,archive:archivePage,personalize:typeof personalizePage==='function'?personalizePage:dashboard,school:typeof schoolSyncPage==='function'?schoolSyncPage:dashboard,setup:typeof setupPage==='function'?setupPage:dashboard,account:accountPage,login:authPage,signup:authPage,recover:authPage}[page]())+(typeof studyCoachCard==='function'&&['weekly','session','grades'].includes(page)?studyCoachCard(page):'');document.querySelectorAll('[data-complete]').forEach(el=>{el.id='task-'+el.dataset.complete;});updateTimer();if(globalThis.afterStudyRender)globalThis.afterStudyRender();}
let editingAssignment;
let assignmentEditorOwner;


function openAssignmentEditor(assignment) {
  const form = $('#assignment-form');
  form.reset();
  if (typeof setupSuggestedSubjects==='function') {
    const subjects = [...new Set([...setupSuggestedSubjects(),...assignments.map(task=>task.subject)])];
    $('#assignment-subjects').innerHTML = subjects.map(subject=>'<option value="'+esc(subject)+'"></option>').join('');
  }
  editingAssignment = assignment?.id;
  assignmentEditorOwner = globalThis.studyAccount.user?.id;
  $('#assignment-title').textContent = assignment ? 'Edit assignment' : 'Add an assignment';
  $('#assignment-submit').textContent = assignment ? 'Save changes' : 'Add to my plan';
  form.elements.due.value = assignment?.due || today;
  if (assignment) {
    for (const field of ['name', 'subject', 'type', 'minutes', 'priority']) {
      form.elements.namedItem(field).value = assignment[field];
    }
  }
  $('#assignment-dialog').showModal();
}

$('#assignment-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const name = data.get('name').trim();
  const subject = data.get('subject').trim();
  if (!name || !subject) {
    toast('Please enter a task name and subject.');
    return;
  }
  const fields = {name, subject, due:data.get('due'), minutes:Number(data.get('minutes')), priority:data.get('priority'), type:data.get('type')};
  if (assignmentEditorOwner !== globalThis.studyAccount.user?.id) {
    toast('Your account changed. Open the assignment again.');
    $('#assignment-dialog').close();
    return;
  }
  if (editingAssignment) {
    const task = assignments.find(a => a.id === editingAssignment && !a.completed);
    if (!task) {
      toast('This assignment is no longer in your planner.');
      $('#assignment-dialog').close();
      return;
    }
    Object.assign(task, fields);
  } else {
    assignments.push({id:crypto.randomUUID(), ...fields, completed:false});
  }
  persist();
  $('#assignment-dialog').close();
  event.target.reset();
  render();
  toast(editingAssignment ? 'Assignment updated.' : 'Assignment added.');
  editingAssignment = undefined;
});
$('#close-dialog').onclick=()=>$('#assignment-dialog').close();
document.addEventListener('change',e=>{if(e.target.dataset.complete){const a=assignments.find(a=>a.id===e.target.dataset.complete);if(a){if(!e.target.checked || a.completed)return;
      a.completed=true;
      a.completedOn=dateKey();
      persist();
      render();
      toast('Task completed and moved to your archive.');
      $('.widget-progress .ring')?.classList.add('completion-pop');
      undoCompletion={id:a.id, owner:globalThis.studyAccount.user?.id};
      $('#undo-completion').hidden=false;
      clearTimeout(toast.timeout);
      toast.timeout=setTimeout(()=>{
        undoCompletion=undefined;
        $('#toast').classList.remove('visible');
      },8000);}}if(e.target.id==='budget'){const n=Number(e.target.value);if(!Number.isFinite(n)||n<15||n>480){toast('Choose between 15 and 480 minutes.');e.target.value=budget;return;}budget=n;save('studyflow.budget.v1',budget);render();}if(e.target.id==='session-task'){session.task=e.target.value;save('studyflow.session.v1',session);}});
document.addEventListener('input', event => {
  if (event.target.id === 'notes') notes = event.target.value;
  if (event.target.id === 'archive-search') {
    archiveQuery = event.target.value;
    $('#archive-results').innerHTML = archiveResults();
  }
});
$('#studyflow-theme').value = currentTheme;
$('#studyflow-theme').addEventListener('change', event => {
  const theme = event.target.value;
  if (!themes.includes(theme)) return;
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('studyflow.theme.v1', JSON.stringify(theme)); }
  catch { toast('Theme changed for this visit.'); }
});
document.addEventListener('click',e=>{const widgetButton=e.target.closest('[data-widget-action]');if(widgetButton?.dataset.widgetAction){handleWidgetClick(widgetButton);return;}const target=e.target.closest('[data-action],[data-week]');if(!target)return;if(target.dataset.week){const direction=target.dataset.week;weekOffset+=Number(direction);render();$('[data-week="'+direction+'"]')?.focus();return;}switch(target.dataset.action){case 'add':
      openAssignmentEditor();
      break;
    case 'edit': {
      const task=assignments.find(a=>a.id===target.dataset.task&&!a.completed);
      if(task)openAssignmentEditor(task);
      break;
    }
    case 'delete-task': {
      const task=assignments.find(item=>item.id===target.dataset.task);
      if(!task || !confirm('Delete “'+task.name+'” from StudyFlow?'))break;
      assignments=assignments.filter(item=>item.id!==task.id);
      persist();
      render();
      toast('Task deleted.');
      break;
    }
    case 'restore-task': {
      const task=assignments.find(a=>a.id===target.dataset.task&&a.completed);
      if(task){
        task.completed=false;
        delete task.completedOn;
        persist();
        render();
        $('#archive-search').focus();
        toast('Assignment restored to your planner.');
      }
      break;
    }
    case 'undo-completion': {
      if(!undoCompletion || undoCompletion.owner!==globalThis.studyAccount.user?.id)break;
      const task=assignments.find(a=>a.id===undoCompletion.id&&a.completed);
      if(task){
        task.completed=false;
        delete task.completedOn;
        persist();
        render();
        toast('Assignment restored.');
      }
      break;
    }case 'toggle-all':showAll=!showAll;render();break;case 'this-week':weekOffset=0;render();$('[data-action="this-week"]')?.focus();break;case 'start':prepareFocusChime();session={status:'running',remaining:1500,endsAt:Date.now()+1500000,task:$('#session-task').value};save('studyflow.session.v1',session);render();break;case 'pause':session.remaining=remaining();session.status='paused';session.endsAt=null;save('studyflow.session.v1',session);updateTimer();break;case 'resume':prepareFocusChime();session.status='running';session.endsAt=Date.now()+session.remaining*1000;save('studyflow.session.v1',session);updateTimer();break;case 'finish':session.remaining=remaining();session.status='finished';session.endsAt=null;save('studyflow.session.v1',session);render();break;case 'clear-recall':
      if ((notes || questions.length) && confirm('Clear these notes and questions?')) {
        notes='';
        questions=[];
        render();
      }
      break;
    case 'questions':{const sentences=notes.split(/[.!?\n]+/).map(s=>s.trim()).filter(s=>s.split(/\s+/).length>=5);if(!sentences.length){$('#practice-error').textContent='Add a sentence with at least 5 words to create a demo question.';return;}questions=sentences.slice(0,5).map(sentence=>{const words=sentence.split(/\s+/);const index=words.reduce((best,w,i)=>w.replace(/[^a-zA-Z]/g,'').length>words[best].replace(/[^a-zA-Z]/g,'').length?i:best,0);words[index]='________';return {prompt:'Fill in the missing word: '+words.join(' ')+'.',answer:sentence+'.'};});render();break;}}});
let pageEntrance;
const navToggle = $('#nav-toggle');
navToggle?.addEventListener('click', () => {
  navToggle.setAttribute('aria-expanded', String(navToggle.getAttribute('aria-expanded') !== 'true'));
});
$('#main-nav')?.addEventListener('click', event => {
  if (!event.target.closest('a')) return;
  if (navToggle?.getAttribute('aria-expanded') === 'true') $('#main').focus();
  navToggle?.setAttribute('aria-expanded', 'false');
});
window.addEventListener('hashchange', () => {
  navToggle?.setAttribute('aria-expanded', 'false');
  const previousPage = page;
  render();
  const main = $('#main');
  main.focus();
  pageEntrance?.cancel();
  if (page !== previousPage && globalThis.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) {
    pageEntrance = main.animate?.(
      [{opacity: .72, transform: 'translateY(5px)'}, {opacity: 1, transform: 'none'}],
      {duration: 240, easing: 'cubic-bezier(.22, 1, .36, 1)'}
    );
  }
});
setInterval(()=>{if(session.status==='running'&&remaining()===0){session.status='finished';session.remaining=0;session.endsAt=null;save('studyflow.session.v1',session);playFocusChime();toast('Your focus session is complete. Time for a break.');if(page==='session')render();}updateTimer();},1000);

function handleWidgetClick(button) {
  if (!button || button.disabled) return;
  const {widgetAction:action,widget:key} = button.dataset;
  if (action === 'toggle') {
    editingWidgets = !editingWidgets;
  } else {
    let order = dashboardWidgetOrder();
    const index = order.indexOf(key);
    if (action === 'reset') order = defaultWidgets;
    else if (action === 'add' && index===-1 && Object.hasOwn(widgetCatalog,key)) order.push(key);
    else if (action === 'remove' && index>=0) order.splice(index,1);
    else if (index>=0) {
      const next = index + (action==='earlier'?-1:1);
      if (next<0 || next>=order.length) return;
      [order[index],order[next]] = [order[next],order[index]];
    }
    try { localStorage.setItem(dashboardWidgetKey(),JSON.stringify(order)); }
    catch { toast('Your browser could not save the widget layout.'); return; }
  }
  render();
  if (key && Object.hasOwn(widgetCatalog,key)) $(`.widget-${key}`)?.classList.add('widget-settle');
  const nextButton = key && Object.hasOwn(widgetCatalog,key) && $(`[data-widget="${key}"][data-widget-action="${action}"]:not(:disabled)`);
  (nextButton || $('[data-widget-action="toggle"]'))?.focus();
}
