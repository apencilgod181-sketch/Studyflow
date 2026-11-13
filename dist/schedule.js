const scheduleMinutes = value => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1])*60+Number(match[2]) : NaN;
};
function normalizeScheduleTime(value) {
  const time = /^(\d{1,2}):([0-5]\d)\s*(am|pm)?$/i.exec(value || '');
  if (!time) return '';
  const hours = Number(time[1]);
  const period = time[3]?.toLowerCase();
  if (period && (hours<1 || hours>12)) return '';
  const hour = period ? hours%12 + (period==='pm'?12:0) : hours;
  return String(hour).padStart(2,'0')+':'+time[2];
}
function parseCycleOrder(value) {
  const order = value.trim().toLowerCase();
  if (order.includes(',')) return order.split(',').map(label=>label.trim()).filter(Boolean);
  if (!order) return [];
  return order.match(/(?:day\s+[a-z0-9]+|[a-z0-9]+\s+day)(?=\s|$)|\S+/g);
}
function schedulePreview(form) {
  const fields = new FormData(form);
  const date = String(fields.get('anchor'));
  const mode = fields.get('mode');
  const span = Number(fields.get('span'));
  const order = parseCycleOrder(String(fields.get('order')));
  const index = order.indexOf(String(fields.get('first')).trim().toLowerCase());
  if (!date || !Number.isInteger(span) || span<1 || span>90) throw Error('Choose a starting date and 1 to 90 days.');
  if (mode==='cycle' && (index<0 || new Set(order).size!==order.length)) throw Error('Enter unique cycle labels and choose which label applies on the starting date.');
  const rows = String(fields.get('rows')).split(/\r?\n/).filter(line=>line.trim()).map((line,i)=>{
    let [label,start,end,name] = line.split('|').map(value=>value.trim());
    start = normalizeScheduleTime(start);
    end = normalizeScheduleTime(end);
    const minutes = scheduleMinutes(end)-scheduleMinutes(start);
    if (!label || !name || name.length>120 || !(minutes>=5 && minutes<=1200)) throw Error('Check row '+(i+1)+': enter a day, start and end time, and title.');
    if (mode==='cycle' && !parseCycleOrder(label).every(day=>order.includes(day))) throw Error('Unknown cycle label on row '+(i+1)+'.');
    if (mode==='weekly' && !['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(label.toLowerCase())) throw Error('Use full English weekday names in weekly mode.');
    if (mode==='dates' && (!/^\d{4}-\d{2}-\d{2}$/.test(label) || Number.isNaN(Date.parse(label)) || new Date(label).toISOString().slice(0,10)!==label)) throw Error('Use valid YYYY-MM-DD dates in dated mode.');
    return {label:label.toLowerCase(),start,end,name,minutes};
  });
  if (!rows.length) throw Error('Add at least one schedule row.');
  const dates = [];
  let cycle = index;
  const cursor = new Date(date+'T12:00:00');
  if (mode!=='dates' && !fields.has('weekends') && [0,6].includes(cursor.getDay())) throw Error('Choose a weekday as the starting date or include weekends.');
  for (let i=0;i<span;i++,cursor.setDate(cursor.getDate()+1)) {
    if (mode!=='dates' && !fields.has('weekends') && [0,6].includes(cursor.getDay())) continue;
    const due = dateKey(cursor);
    const label = mode==='cycle' ? order[cycle++ % order.length] :
      mode==='weekly' ? cursor.toLocaleDateString('en',{weekday:'long'}).toLowerCase() : due;
    for (const row of rows.filter(item=>mode==='cycle' ? parseCycleOrder(item.label).includes(label) : item.label===label)) dates.push({...row,due});
  }
  const key = row=>JSON.stringify([row.name,row.due,row.start,row.end]);
  const existing = new Set(assignments.filter(a=>a.schedule).map(a=>key({...a,...a.schedule})));
  return dates.filter(row=>{
    const id=key(row);
    if(existing.has(id)) return false;
    existing.add(id);
    return true;
  }).sort((a,b)=>a.due.localeCompare(b.due)||a.start.localeCompare(b.start));
}

function openScheduleImport() {
  const dialog=document.createElement('dialog');
  dialog.className='schedule-import-dialog';
  dialog.setAttribute('aria-labelledby','schedule-import-title');
  dialog.innerHTML=`<form id="schedule-import-form"><div class="section-head"><h2 id="schedule-import-title">Import a schedule</h2><button type="button" class="icon-button" data-close-schedule aria-label="Close schedule importer">×</button></div>
    <p class="muted">Scan your timetable to preview the dates. Check the preview before adding it.</p>
    <label>Schedule file (including Google Calendar .ics exports)<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.ics"></label>
    <p class="muted">Calendar files are read on this device. PDF and image scans use Cloudflare AI and require sign-in.</p>
    <button type="button" class="button secondary" data-scan-schedule>Read file</button>
    <details data-schedule-settings><summary>Adjust schedule or enter it manually</summary><label>Schedule repeats<select name="mode"><option value="weekly">Every week</option><option value="cycle">Custom day cycle</option><option value="dates">Specific dates</option></select></label>
    <div class="form-grid"><label>Starting date<input type="date" name="anchor" value="${dateKey()}" required></label><label>Calendar days to import<input type="number" name="span" min="1" max="90" value="28" required></label></div>
    <div data-cycle-fields hidden><label>Cycle order<input name="order" placeholder="A B C D"></label><label>Which cycle day is the starting date?<select name="first"><option value="">Select a cycle day</option></select></label></div>
    <label><input type="checkbox" name="weekends"> Count weekends in the repeat</label>
    <label>Schedule rows<textarea name="rows" rows="6" placeholder="Monday | 08:30 | 09:15 | Mathematics"></textarea></label>
    <p class="muted" data-row-format></p>
    <button class="button secondary" type="submit">Update preview</button></details><p class="muted" role="status" data-schedule-status></p>
    <ol data-schedule-preview></ol><button type="button" class="button" data-save-schedule hidden>Add to weekly plan</button></form>`;
  document.body.append(dialog);
  dialog.showModal();
  const form=dialog.querySelector('form');
  const fields=form.elements;
  const status=form.querySelector('[data-schedule-status]');
  const preview=form.querySelector('[data-schedule-preview]');
  const saveButton=form.querySelector('[data-save-schedule]');
  const owner=globalThis.studyAccount.user?.id;
  let pending=[];
  function resetPreview(){
    pending=[];
    preview.replaceChildren();
    saveButton.hidden=true;
  }
  function showMode(){
    const selected = fields.first.value;
    const labels = [...new Set(parseCycleOrder(fields.order.value))];
    fields.first.replaceChildren(new Option('Select a cycle day', ''), ...labels.map(label=>new Option(label.toUpperCase(),label)));
    fields.first.value = labels.includes(selected) ? selected : '';
    form.querySelector('[data-cycle-fields]').hidden=fields.mode.value!=='cycle';
    fields.weekends.disabled=fields.mode.value==='dates';
    const example={weekly:'Monday',cycle:'Day 2',dates:'2026-11-16'}[fields.mode.value];
    form.querySelector('[data-row-format]').textContent='One row per line, for example '+example+' | 08:30 | 09:15 | Mathematics';
  }
  showMode();
  form.addEventListener('input',()=>{
    resetPreview();
    showMode();
  });
  dialog.addEventListener('close',()=>dialog.remove());
  form.querySelector('[data-close-schedule]').onclick=()=>dialog.close();
  form.querySelector('[data-scan-schedule]').onclick=async event=>{
    const button=event.currentTarget;
    const file=fields.file.files[0];
    if (!file || file.size>2097152) { status.textContent='Choose a file up to 2 MB.'; return; }
    if (/\.ics$/i.test(file.name)) {
      resetPreview();
      try {
        const rows = readCalendarEvents(await file.text());
        fields.mode.value='dates';
        fields.anchor.value=rows[0].due;
        fields.span.value=1;
        showMode();
        showPreview(rows);
      } catch(error) {
        status.textContent=error.message;
      }
      return;
    }
    if (!owner) { status.textContent='Sign in to scan a file, or enter schedule rows manually.'; return; }
    button.disabled=true;
    status.textContent='Reading schedule…';
    try {
      const upload=new FormData();
      upload.append('schedule',file);
      const response=await fetch('/api/schedule-scan',{method:'POST',body:upload});
      const result=await response.json();
      if (!response.ok) throw Error(result.error);
      if (!dialog.open) return;
      resetPreview();
      const clean=value=>value.replace(/[|\r\n]/g,' ').trim();
      const allDated=result.rows.every(row=>row.date);
      if (allDated) {
        fields.mode.value='dates';
        const dates=result.rows.map(row=>row.date).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
        if(dates.length){
          fields.anchor.value=dates[0];
          fields.span.value=Math.min(90,1+Math.round((Date.parse(dates.at(-1))-Date.parse(dates[0]))/86400000));
        }
      }
      const weekdays=/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
      if (!allDated) {
        const labels=[...new Set(result.rows.flatMap(row=>parseCycleOrder(row.day)))];
        fields.mode.value=labels.every(label=>weekdays.test(label))?'weekly':'cycle';
        if(fields.mode.value==='cycle'){
          fields.order.value=labels.join(', ');
          fields.first.value='';
        }
      }
      fields.rows.value=result.rows.map(row=>[allDated?row.date:row.day,row.start,row.end,row.name].map(clean).join(' | ')).join('\n');
      showMode();
      if(fields.mode.value==='cycle'){
        form.querySelector('[data-schedule-settings]').open=true;
        status.textContent='Cycle days detected. Enter the cycle day for your starting date, then update the preview.';
        fields.first.focus();
      } else {
        form.requestSubmit();
      }
    } catch(error) {
      status.textContent=error.message || 'The file could not be scanned.';
    } finally {
      button.disabled=false;
    }
  };
  form.addEventListener('submit',event=>{
    event.preventDefault();
    resetPreview();
    try {
      showPreview(schedulePreview(form));
    } catch(error) {
      resetPreview();
      form.querySelector('[data-schedule-settings]').open=true;
      status.textContent=error.message;
    }
  });
  function showPreview(rows){
      pending=rows;
      if (assignments.length+pending.length>500) throw Error('Choose a shorter date range to stay within the 500-entry planner limit.');
      for(const row of pending){
        const item=document.createElement('li');
        item.textContent=row.due+' · '+(row.start?row.start+'–'+row.end+' · ':'All day · ')+row.name;
        preview.append(item);
      }
      status.textContent=pending.length ? pending.length+' entries ready to add.' : 'No new entries in this date range.';
      saveButton.hidden=!pending.length;
  }
  saveButton.onclick=()=>{
    if(owner!==globalThis.studyAccount.user?.id){status.textContent='Your account changed. Reopen the importer.';return;}
    const rows=pending.filter(row=>!assignments.some(entry=>entry.name===row.name && entry.due===row.due && entry.schedule?.start===row.start && entry.schedule?.end===row.end));
    if (!rows.length || assignments.length+rows.length>500) {status.textContent='The plan changed. Preview the import again.';resetPreview();return;}
    assignments.push(...rows.map(row=>({
      id:crypto.randomUUID(),name:row.name,subject:'Schedule',due:row.due,minutes:row.minutes,
      type:'Assignment',priority:'normal',completed:false,schedule:{start:row.start,end:row.end}
    })));
    save('studyflow.assignments.v1',assignments);
    const first=new Date(rows[0].due+'T12:00:00');
    const current=new Date();
    current.setHours(12,0,0,0);
    for(const day of [first,current]) day.setDate(day.getDate()-((day.getDay()+6)%7));
    weekOffset=Math.round((first-current)/604800000);
    dialog.close();
    render();
    toast(rows.length+' schedule entries added.');
  };
}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-schedule-open]')) openScheduleImport();
});

function createCalendarFile(entries, exportedAt = new Date()) {
  const escapeText = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/[;,]/g,'\\$&');
  const stamp = exportedAt.toISOString().replace(/[-:]|\.\d{3}/g,'');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StudyFlow//Weekly Plan//EN','CALSCALE:GREGORIAN'];
  for (const entry of entries) {
    const date = entry.due.replace(/-/g,'');
    const start = entry.schedule?.start;
    const end = entry.schedule?.end;
    const timed = Number.isFinite(scheduleMinutes(start)) && scheduleMinutes(end)>scheduleMinutes(start);
    lines.push('BEGIN:VEVENT', 'UID:'+encodeURIComponent(entry.id)+'@studyflow', 'DTSTAMP:'+stamp,
      'SUMMARY:'+escapeText(entry.name),
      timed ? 'DTSTART:'+date+'T'+start.replace(':','')+'00' : 'DTSTART;VALUE=DATE:'+date);
    if (timed) lines.push('DTEND:'+date+'T'+end.replace(':','')+'00');
    else lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const encoder = new TextEncoder();
  return lines.map(line=>{
    let folded='', width=0;
    for(const character of line){
      const bytes=encoder.encode(character).length;
      if(width+bytes>75){folded+='\r\n ';width=1;}
      folded+=character;
      width+=bytes;
    }
    return folded;
  }).join('\r\n')+'\r\n';
}

document.addEventListener('click', event=>{
  if(!event.target.closest('[data-calendar-export]')) return;
  const entries = sorted().filter(entry=>!entry.completed && !/^example-[1-6]$/.test(entry.id) && entry.due>=dateKey());
  if(!entries.length){toast('There are no upcoming entries to export.');return;}
  const file = new Blob([createCalendarFile(entries)],{type:'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href=url;
  link.download='studyflow.ics';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Calendar downloaded. Import the file into your calendar app.');
});


function readCalendarEvents(source) {
  const unfolded = source.replace(/\r?\n[ \t]/g,'');
  const events = [...unfolded.matchAll(/^BEGIN:VEVENT\r?\n([\s\S]*?)^END:VEVENT\s*$/gm)];
  const rows = [];
  for (const [, event] of events) {
    if (/^STATUS:CANCELLED\s*$/mi.test(event)) continue;
    if (/^(RRULE|RDATE|RECURRENCE-ID)[;:]/mi.test(event)) continue;
    const field = name => event.match(new RegExp('^'+name+'(?:;[^:\\r\\n]*)?:(.*)$','mi'))?.[1]?.trim();
    const parse = value => {
      const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?$/.exec(value || '');
      if (!match) return null;
      const [,year,month,day,hour,minute,utc]=match;
      const due = year+'-'+month+'-'+day;
      if (!hour) return {due,time:''};
      if (!utc) return {due,time:hour+':'+minute};
      const date=new Date(due+'T'+hour+':'+minute+':00Z');
      return Number.isNaN(+date)?null:{due:dateKey(date),time:String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')};
    };
    const start=parse(field('DTSTART'));
    const end=parse(field('DTEND'));
    if (!start || (start.time && (!end || end.due!==start.due || !(scheduleMinutes(end.time)>scheduleMinutes(start.time))))) continue;
    const name=(field('SUMMARY')||'Calendar event').replace(/\\([nN,;\\])/g,(_,c)=>/[nN]/.test(c)?' ':c).slice(0,120);
    rows.push({name,due:start.due,start:start.time,end:start.time?end.time:'',minutes:start.time?Math.max(5,scheduleMinutes(end.time)-scheduleMinutes(start.time)):5});
  }
  if (!rows.length) throw Error('No supported events found. Choose an unzipped .ics file with individual calendar events.');
  return [...new Map(rows.map(row=>[JSON.stringify([row.name,row.due,row.start,row.end]),row])).values()].sort((a,b)=>a.due.localeCompare(b.due)||a.start.localeCompare(b.start));
}

function calendarPage() {
  return heading('YOUR SCHEDULE','Calendar','Move events between StudyFlow and your calendar app.') +
    `<section class="card"><h2>Bring in Google Calendar events</h2>
    <p>Export your calendar from Google Calendar. If the download is a ZIP file, extract it and choose the .ics file for the calendar you want.</p>
    <p class="muted">The importer supports individual all-day and same-day events. Recurring events and events that span midnight are skipped.</p>
    <div class="timer-controls">
      <a class="button secondary" href="https://calendar.google.com/calendar/u/0/r/settings/export" target="_blank" rel="noopener noreferrer">Open Google Calendar settings ↗</a>
      <button type="button" class="button" data-schedule-open>Import calendar file</button>
    </div></section>
    <section class="card"><h2>Export from StudyFlow</h2>
    <p>Download your upcoming classes and deadlines as a calendar file.</p>
    <button type="button" class="button secondary" data-calendar-export>Download calendar (.ics)</button></section>`;
}
