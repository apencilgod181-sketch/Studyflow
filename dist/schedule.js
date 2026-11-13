const scheduleMinutes = value => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1])*60+Number(match[2]) : NaN;
};
function schedulePreview(form) {
  const fields = new FormData(form);
  const date = String(fields.get('anchor'));
  const mode = fields.get('mode');
  const span = Number(fields.get('span'));
  const order = String(fields.get('order')).split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const index = order.indexOf(String(fields.get('first')).trim().toLowerCase());
  if (!date || !Number.isInteger(span) || span<1 || span>90) throw Error('Choose a starting date and 1 to 90 days.');
  if (mode==='cycle' && (index<0 || new Set(order).size!==order.length)) throw Error('Enter unique cycle labels and choose which label applies on the starting date.');
  const rows = String(fields.get('rows')).split(/\r?\n/).filter(line=>line.trim()).map((line,i)=>{
    const [label,start,end,name] = line.split('|').map(value=>value.trim());
    const minutes = scheduleMinutes(end)-scheduleMinutes(start);
    if (!label || !name || name.length>120 || !(minutes>=5 && minutes<=1200)) throw Error('Check row '+(i+1)+': enter a day, start and end time, and title.');
    if (mode==='cycle' && !order.includes(label.toLowerCase())) throw Error('Unknown cycle label on row '+(i+1)+'.');
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
    for (const row of rows.filter(item=>item.label===label)) dates.push({...row,due});
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
    <label>Schedule file<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"></label>
    <p class="muted">Scan sends the file to Cloudflare AI for extraction. Sign in to scan, or enter rows manually.</p>
    <button type="button" class="button secondary" data-scan-schedule>Scan file</button>
    <details data-schedule-settings><summary>Adjust schedule or enter it manually</summary><label>Schedule repeats<select name="mode"><option value="weekly">Every week</option><option value="cycle">Custom day cycle</option><option value="dates">Specific dates</option></select></label>
    <div class="form-grid"><label>Starting date<input type="date" name="anchor" value="${dateKey()}" required></label><label>Calendar days to import<input type="number" name="span" min="1" max="90" value="28" required></label></div>
    <div data-cycle-fields hidden><label>Cycle order, separated by commas<input name="order" placeholder="Day 1, Day 2, Day 3"></label><label>Which cycle day is the starting date?<input name="first" placeholder="Day 2"></label></div>
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
        const labels=[...new Map(result.rows.filter(row=>row.day.trim()).map(row=>[row.day.trim().toLowerCase(),row.day.trim()])).values()];
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
      pending=schedulePreview(form);
      if (assignments.length+pending.length>500) throw Error('Choose a shorter date range to stay within the 500-entry planner limit.');
      for(const row of pending){
        const item=document.createElement('li');
        item.textContent=row.due+' · '+row.start+'–'+row.end+' · '+row.name;
        preview.append(item);
      }
      status.textContent=pending.length ? pending.length+' entries ready to add.' : 'No new entries in this date range.';
      saveButton.hidden=!pending.length;
    } catch(error) {
      resetPreview();
      form.querySelector('[data-schedule-settings]').open=true;
      status.textContent=error.message;
    }
  });
  saveButton.onclick=()=>{
    if(owner!==globalThis.studyAccount.user?.id){status.textContent='Your account changed. Reopen the importer.';return;}
    const rows=schedulePreview(form);
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
