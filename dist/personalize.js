function personalKey() {
  return 'studyflow.personal.v1.' + (globalThis.studyAccount.user?.id || 'guest');
}

function personalProfile() {
  const saved = read(personalKey(), {});
  return {
    name: saved.name || '',
    avatar: isProfilePhoto(saved.avatar) ? saved.avatar : '',
    accent: /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : '#346b50',
    tint: /^#[0-9a-f]{6}$/i.test(saved.tint) ? saved.tint : '#b7d5b5',
    logs: Array.isArray(saved.logs) ? saved.logs : []
  };
}

function preferredName() {
  return personalProfile().name || globalThis.studyAccount.user?.name || '';
}

function isProfilePhoto(picture) {
  return /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(picture || '');
}

function profileAvatar() {
  const {avatar} = personalProfile();
  const initial = Array.from(preferredName().trim())[0] || 'S';
  return `<span class="profile-avatar" aria-hidden="true">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(initial.toUpperCase())}</span>`;
}

function accountProfileCard() {
  const name = preferredName() || 'Guest workspace';
  return `<section class="card account-profile">
    ${profileAvatar()}
    <div><h2>${esc(name)}</h2><p class="muted">Your display name and profile picture</p><a class="text-button" href="#personalize">Edit profile →</a></div>
  </section>`;
}

function applyPersonalColors() {
  if (!document.documentElement?.style) return;
  const {accent, tint} = personalProfile();
  document.documentElement.style.setProperty('--personal-accent', accent);
  document.documentElement.style.setProperty('--personal-tint', tint);
}

function journalPicture(entry) {
  if (!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(entry.picture || '')) return '';
  return `<img class="journal-picture" src="${esc(entry.picture)}" alt="Progress photo for ${esc(entry.title)}" loading="lazy">`;
}

function journalPreview() {
  const [latest] = personalProfile().logs;
  if (!latest) return '<section class="card"><h2>Progress journal</h2><p class="muted">Save a milestone, a study reflection, or a picture of your work.</p><a class="text-button" href="#personalize">Start your journal →</a></section>';
  return `<section class="card"><h2>Latest journal entry</h2>
    <p><strong>${esc(latest.title)}</strong></p><p class="muted">${esc(latest.date)}</p>
    ${journalPicture(latest)}<a class="text-button" href="#personalize">Open progress journal →</a>
  </section>`;
}

let editingJournal;
let editingJournalOwner;

function personalizePage() {
  const profile = personalProfile();
  const edited = editingJournalOwner === personalKey() && profile.logs.find(entry => entry.id === editingJournal);
  return heading('MAKE IT YOURS','Personalize StudyFlow','Choose how your workspace looks and keep a record of your progress.') + `
    <div class="practice-layout">
      <section class="card">
        <h2>Profile and theme</h2>
        <form id="personal-profile-form">
          <div class="profile-preview">${profileAvatar()}<strong>${esc(preferredName() || 'Guest workspace')}</strong></div>
          <label>Profile picture<input name="avatar" type="file" accept="image/jpeg,image/png,image/webp"></label>
          <button class="text-button delete-control" type="button" data-remove-avatar ${profile.avatar?'':'hidden'}>Remove current picture</button>
          <p class="muted">JPEG, PNG, or WebP up to 8 MB. Your display name and picture stay in this browser.</p>
          <label>Preferred name<input name="name" maxlength="60" value="${esc(profile.name)}" placeholder="Name used on your dashboard"></label>
          <div class="form-grid">
            <label>Accent color<input name="accent" type="color" value="${profile.accent}"></label>
            <label>Background tint<input name="tint" type="color" value="${profile.tint}"></label>
          </div>
          <p class="muted">Changing a color applies your Custom theme. You can switch themes in the header.</p>
          <p class="form-error" role="alert" id="profile-error"></p>
          <p id="profile-save-status" class="muted" role="status">Changes save automatically on this device.</p>
          <button class="text-button delete-control" type="button" data-reset-personal>Reset name and colors</button>
        </form>
      </section>
      <section class="card" id="journal-editor">
        <h2>${edited ? 'Edit journal entry' : 'Add a progress log'}</h2>
        <form id="journal-form">
          <label>Date<input name="date" type="date" value="${esc(edited?.date || dateKey())}" required></label>
          <label>Title<input name="title" maxlength="120" value="${esc(edited?.title || '')}" placeholder="e.g. Finished my first essay draft" required></label>
          <label>Reflection<textarea name="note" maxlength="2000" rows="4" placeholder="What improved? What will you try next?">${esc(edited?.note || '')}</textarea></label>
          <label>${edited?.picture ? 'Replace picture (optional)' : 'Progress picture (optional)'}<input name="picture" type="file" accept="image/jpeg,image/png,image/webp"></label>
          ${edited?.picture ? '<label class="journal-check"><input type="checkbox" name="remove-picture"> Remove existing picture</label>' : ''}
          <p class="muted">JPEG, PNG, or WebP up to 8 MB. Entries and pictures stay in this browser.</p>
          <p class="form-error" role="alert" id="journal-error"></p>
          <button class="button" type="submit">${edited ? 'Save changes' : 'Save journal entry'}</button>
          ${edited ? '<button class="text-button" type="button" data-journal-cancel>Cancel</button>' : ''}
        </form>
      </section>
    </div>
    <section class="card journal-history">
      <div class="section-head"><h2>Progress journal</h2><span class="pill">${profile.logs.length} entries</span></div>
      ${profile.logs.length ? profile.logs.map(entry => `<article class="journal-entry">
        <div class="section-head"><div><h3>${esc(entry.title)}</h3><p class="muted">${esc(entry.date)}</p></div>
          <div class="entry-actions">
            <button type="button" class="text-button" data-journal-edit="${esc(entry.id)}">Edit</button>
            <button type="button" class="text-button delete-control" data-journal-delete="${esc(entry.id)}" aria-label="Delete journal entry ${esc(entry.title)}">Delete</button>
          </div></div>
        ${entry.note ? `<p class="journal-note">${esc(entry.note)}</p>` : ''}
        ${journalPicture(entry)}
      </article>`).join('') : '<p class="muted">Your reflections and pictures will appear here.</p>'}
    </section>`;
}

async function resizeStudyPicture(file, maxDimension) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw new Error('Choose a JPEG, PNG, or WebP picture up to 8 MB.');
  }
  let picture;
  let objectUrl;
  try {
    if (typeof createImageBitmap === 'function') {
      try { picture = await createImageBitmap(file); }
      catch { /* Use the browser's image decoder if bitmap decoding fails. */ }
    }
    if (!picture) {
      objectUrl = URL.createObjectURL(file);
      picture = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('This picture could not be opened. Try another file.'));
        image.src = objectUrl;
      });
    }
    const width = picture.naturalWidth || picture.width;
    const height = picture.naturalHeight || picture.height;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .72);
  } finally {
    picture?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function saveProfileChanges(changes) {
  const profile = personalProfile();
  if (Object.entries(changes).every(([key,value])=>profile[key]===value)) return;
  localStorage.setItem(personalKey(), JSON.stringify({...profile,...changes}));
  if (['accent','tint'].some(key=>Object.hasOwn(changes,key)&&changes[key]!==profile[key])) {
    localStorage.setItem('studyflow.theme.v1',JSON.stringify('custom'));
    currentTheme = 'custom';
    document.documentElement.dataset.theme = currentTheme;
    $('#studyflow-theme').value = currentTheme;
    applyPersonalColors();
  }
  if (typeof updateAccountStatus==='function') updateAccountStatus();
}

function profileSaveFeedback(form, error) {
  const status = form.querySelector('#profile-save-status');
  const alert = form.querySelector('#profile-error');
  if (status) status.textContent = error ? 'Changes could not be saved.' : 'Saved on this device.';
  if (alert) alert.textContent = error ? (error.name==='QuotaExceededError' ? 'Browser storage is full. Free up space and try again.' : error.message) : '';
  if (error || !document.contains(form)) return;
  form.querySelector('.profile-preview').innerHTML = profileAvatar() + '<strong>'+esc(preferredName() || 'Guest workspace')+'</strong>';
  form.querySelector('[data-remove-avatar]').hidden = !personalProfile().avatar;
}

let photoSaveVersion = 0;
document.addEventListener('input', event => {
  const field = event.target;
  if (field.form?.id !== 'personal-profile-form' || field.name !== 'name' || event.isComposing) return;
  try { saveProfileChanges({name:field.value.trim()}); profileSaveFeedback(field.form); }
  catch (error) { profileSaveFeedback(field.form,error); }
});

document.addEventListener('change', async event => {
  const field = event.target;
  const form = field.form;
  if (form?.id !== 'personal-profile-form') return;
  const key = personalKey();
  try {
    if (field.name === 'avatar' && field.files[0]) {
      const version = ++photoSaveVersion;
      form.querySelector('#profile-save-status').textContent = 'Saving picture…';
      const avatar = await resizeStudyPicture(field.files[0],256);
      if (version !== photoSaveVersion || key !== personalKey()) return;
      saveProfileChanges({avatar});
      field.value = '';
    } else if (['name','accent','tint'].includes(field.name)) {
      saveProfileChanges({[field.name]:field.value.trim()});
    } else return;
    profileSaveFeedback(form);
  } catch (error) { if (key===personalKey()) profileSaveFeedback(form,error); }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (form.id === 'personal-profile-form') {
    event.preventDefault();
    const data = new FormData(form);
    const key = personalKey();
    try {
      const file = data.get('avatar');
      const newPicture = file?.size ? await resizeStudyPicture(file, 256) : undefined;
      if (key !== personalKey()) return;
      const changes = {name:data.get('name').trim(),accent:data.get('accent'),tint:data.get('tint')};
      if (newPicture || data.has('remove-avatar')) changes.avatar = newPicture || '';
      saveProfileChanges(changes);
      profileSaveFeedback(form);
    } catch (error) {
      profileSaveFeedback(form,error);
    }
    return;
  }
  if (form.id !== 'journal-form') return;
  event.preventDefault();
  const data = new FormData(form);
  const key = personalKey();
  const editedId = editingJournalOwner === key ? editingJournal : undefined;
  const submit = form.querySelector('[type=submit]');
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const title = data.get('title').trim();
    if (!title) throw new Error('Enter a title for your progress log.');
    const file = data.get('picture');
    const newPicture = file?.size ? await resizeStudyPicture(file, 800) : undefined;
    if (key !== personalKey()) throw new Error('Your account changed. Open the journal again.');
    const profile = personalProfile();
    const existing = profile.logs.find(entry => entry.id === editedId);
    const entry = {
      id: editedId || crypto.randomUUID(), title, date:data.get('date'),
      note:data.get('note').trim(),
      picture:newPicture ?? (data.has('remove-picture') ? '' : existing?.picture || '')
    };
    profile.logs = [entry, ...profile.logs.filter(log => log.id !== entry.id)]
      .sort((a,b) => b.date.localeCompare(a.date));
    localStorage.setItem(key, JSON.stringify(profile));
    editingJournal = undefined;
    if (page === 'personalize') render();
    toast('Progress log saved.');
  } catch (error) {
    const message = error.name === 'QuotaExceededError' ? 'Browser storage is full. Edit an older entry to remove its picture and free space.' : error.message;
    const status = form.querySelector('#journal-error');
    if (status) status.textContent = message;
  } finally { submit.disabled = false; }
});

document.addEventListener('click', event => {
  const removeAvatar = event.target.closest('[data-remove-avatar]');
  if (removeAvatar) {
    photoSaveVersion++;
    const form = removeAvatar.form;
    try { saveProfileChanges({avatar:''}); profileSaveFeedback(form); form.elements.namedItem('avatar').focus(); }
    catch (error) { profileSaveFeedback(form,error); }
    return;
  }
  if (event.target.closest('[data-reset-personal]')) {
    if (!confirm('Reset your preferred name and custom colors?')) return;
    try {
      const {logs, avatar} = personalProfile();
      localStorage.setItem(personalKey(), JSON.stringify({logs, avatar}));
      localStorage.setItem('studyflow.theme.v1', JSON.stringify('sage'));
      currentTheme = 'sage';
      document.documentElement.dataset.theme = currentTheme;
      $('#studyflow-theme').value = currentTheme;
      render();
      toast('Name and colors reset.');
    } catch { toast('Your browser could not reset your preferences.'); }
    return;
  }
  const remove = event.target.closest('[data-journal-delete]');
  if (remove) {
    const profile = personalProfile();
    const entry = profile.logs.find(log => log.id === remove.dataset.journalDelete);
    if (!entry || !confirm(`Delete “${entry.title}” from your journal?`)) return;
    profile.logs = profile.logs.filter(log => log.id !== entry.id);
    try {
      localStorage.setItem(personalKey(), JSON.stringify(profile));
    } catch {
      toast('Your browser could not delete this entry.');
      return;
    }
    if (editingJournal === entry.id) editingJournal = undefined;
    render();
    toast('Journal entry deleted.');
    return;
  }
  const edit = event.target.closest('[data-journal-edit]');
  if (edit) {
    editingJournal = edit.dataset.journalEdit;
    editingJournalOwner = personalKey();
    render();
    $('#journal-editor input[name="title"]').focus();
  }
  if (event.target.closest('[data-journal-cancel]')) {
    editingJournal = undefined;
    render();
  }
});
