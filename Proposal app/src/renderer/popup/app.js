(async () => {
  const params = new URLSearchParams(window.location.search);
  const reminderId = params.get('reminderId');
  const tabId = params.get('tabId') ? Number(params.get('tabId')) : null;

  const CIRCUMFERENCE = 2 * Math.PI * 24; // ~150.8

  const imgEl = document.getElementById('reminder-image');
  const msgEl = document.getElementById('reminder-message');
  const numEl = document.getElementById('countdown-num');
  const circleEl = document.getElementById('progress-circle');
  const labelEl = document.getElementById('countdown-label');
  const countdownWrap = document.getElementById('countdown-wrap');
  const buttonsEl = document.getElementById('buttons');
  const btnGoBack = document.getElementById('btn-go-back');
  const btnAware = document.getElementById('btn-aware');
  const audioEl = document.getElementById('reminder-audio');

  circleEl.style.strokeDasharray = CIRCUMFERENCE;
  circleEl.style.strokeDashoffset = '0';

  let reminder = null;

  if (reminderId && window.focusGuard) {
    reminder = await window.focusGuard.getReminderById(reminderId);
  }

  if (reminder) {
    if (reminder.imagePath) {
      imgEl.src = `file://${reminder.imagePath.replace(/\\/g, '/')}`;
    }
    if (reminder.message) {
      msgEl.textContent = reminder.message;
    }
    if (reminder.audioPath) {
      audioEl.src = `file://${reminder.audioPath.replace(/\\/g, '/')}`;
      audioEl.play().catch(() => {});
    }
  } else {
    msgEl.textContent = 'Take a breath. Is this worth your time?';
  }

  const totalSeconds = (reminder && reminder.countdownSeconds) || 10;
  let remaining = totalSeconds;

  function tick() {
    numEl.textContent = remaining;
    const offset = CIRCUMFERENCE * (1 - remaining / totalSeconds);
    circleEl.style.strokeDashoffset = offset;

    if (remaining <= 0) {
      countdownWrap.style.opacity = '0';
      setTimeout(() => { countdownWrap.style.display = 'none'; }, 400);
      buttonsEl.classList.remove('hidden');
      return;
    }
    remaining--;
    setTimeout(tick, 1000);
  }

  tick();

  btnGoBack.addEventListener('click', () => {
    if (window.focusGuard) window.focusGuard.goBack(tabId);
    window.close();
  });

  btnAware.addEventListener('click', () => {
    window.close();
  });
})();
