document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  const status = document.getElementById("status");
  const dropzoneMessage = dropzone.querySelector('.dz-message');

  function createFileBox(file) {
    const box = document.createElement('div');
    box.className = 'file-box';

    const info = document.createElement('div');
    info.className = 'file-info';
    info.textContent = `${file.name} — ${Math.round(file.size / 1024)} KB`;

    const progress = document.createElement('div');
    progress.className = 'progress';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.width = '0%';
    progress.appendChild(bar);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const linkA = document.createElement('a');
    linkA.href = '#';
    linkA.target = '_blank';
    linkA.style.wordBreak = 'break-all';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy link';
    copyBtn.style.display = 'none';

    actions.appendChild(linkA);
    actions.appendChild(copyBtn);

    box.appendChild(info);
    box.appendChild(progress);
    box.appendChild(actions);

    dropzone.appendChild(box);

    return { box, info, bar, linkA, copyBtn };
  }

  function isCheckboxChecked(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    return checkbox ? checkbox.checked : false;
  }

  function uploadFile(file) {
    const { box, info, bar, linkA, copyBtn } = createFileBox(file);

    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('gameStorage', isCheckboxChecked('gameStorage'));
    fd.append('overwrite', isCheckboxChecked('overwrite'));

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.whalebox.moe/upload');
  xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      bar.style.width = pct + '%';
      info.textContent = `${file.name} — ${pct}%`;
      dropzoneMessage.textContent = `Uploading ${pct}%`;
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (err) { console.error('Invalid JSON response', err); }
        const link = data && data.file && data.file.url ? data.file.url : null;
        if (link) {
          linkA.textContent = link;
          linkA.href = link;
          copyBtn.style.display = 'inline-block';
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(link);
              copyBtn.textContent = 'Copied!';
              setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
            } catch (err) {
              const ta = document.createElement('textarea');
              ta.value = link;
              document.body.appendChild(ta);
              ta.select();
              try { document.execCommand('copy'); copyBtn.textContent = 'Copied!'; } catch (e) { alert('Copy failed'); }
              ta.remove();
              setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 2000);
            }
          });
          info.textContent = `${file.name} - Done`;
          bar.style.width = '100%';
          status.textContent = 'Upload successful.';
        } else {
          info.textContent = `${file.name} - Upload finished (no link).`;
          status.textContent = 'Upload finished but no link returned.';
        }
      } else {
        if (xhr.status === 401) {
          info.textContent = `${file.name} - Upload failed (unauthorized, 401).`;
          status.textContent = 'Upload failed: Unauthorized (401). Please login with Discord.';
          console.error('Upload unauthorized (401)', xhr.responseText);
        } else {
          info.textContent = `${file.name} - Upload failed (${xhr.status}).`;
          console.error('Upload error', xhr.responseText);
          status.textContent = `Upload failed (${xhr.status}).`;
        }
      }
      dropzoneMessage.textContent = 'Drop or select files';
    };

    xhr.onerror = () => {
      info.textContent = `${file.name} - Upload failed (network error).`;
      status.textContent = 'Upload failed (network error).';
      dropzoneMessage.textContent = 'Drop or select files';
    };

    xhr.send(fd);
  }
  
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  const roCopier = getCookie('rocopier') === 'true';
  const admin = getCookie('admin') === 'true';
  let checkboxCenter = null;

  if (roCopier) {
    checkboxCenter = document.createElement('div');
    checkboxCenter.className = 'checkbox-center';
    const gameStorageCheckbox = document.createElement('input');
    const gameStorageLabel = document.createElement('label');

    gameStorageCheckbox.type = 'checkbox';
    gameStorageCheckbox.id = 'gameStorage';

    gameStorageLabel.htmlFor = 'gameStorage';
    gameStorageLabel.textContent = 'Add to game storage (Ro-Copier)';

    checkboxCenter.appendChild(gameStorageCheckbox);
    checkboxCenter.appendChild(gameStorageLabel);

    document.body.appendChild(checkboxCenter);
  }

  if (admin) {
    if (!checkboxCenter) { checkboxCenter = document.createElement('div'); checkboxCenter.className = 'checkbox-center'; }
    const overwriteCheckbox = document.createElement('input');
    const overwriteLabel = document.createElement('label');

    overwriteCheckbox.type = 'checkbox';
    overwriteCheckbox.id = 'overwrite';

    overwriteLabel.htmlFor = 'overwrite';
    overwriteLabel.textContent = 'Overwrite existing files';

    checkboxCenter.appendChild(overwriteCheckbox);
    checkboxCenter.appendChild(overwriteLabel);

    document.body.appendChild(checkboxCenter);
  }

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('.file-box') || e.target.classList.contains('copy-btn')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return;
    files.forEach(f => uploadFile(f));
    fileInput.value = '';
  });

  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.backgroundColor = '#9fb0e6'; });
  dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.style.backgroundColor = ''; });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.backgroundColor = '';
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    const files = Array.from(dt.files);

    try {
      const dataTransfer = new DataTransfer();
      for (const f of files) dataTransfer.items.add(f);
      fileInput.files = dataTransfer.files;
    } catch (err) {

    }
    files.forEach(f => uploadFile(f));
  });


});
