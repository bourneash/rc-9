(() => {
  const form = document.querySelector('[data-contact-form]');
  const status = document.querySelector('[data-contact-status]');
  if (!form || !status) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const topic = String(data.get('topic') || 'General question');
    const message = String(data.get('message') || '').trim();
    if (!name || !email || !message) {
      status.textContent = 'Please complete your name, email, and message.';
      return;
    }
    const subject = `[RC-9] ${topic}`;
    const body = `Name: ${name}\nReply email: ${email}\n\n${message}`;
    window.location.href = `mailto:contact@rc-9.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent =
      'Your email app should open with the message ready to send. If it does not, email contact@rc-9.com directly.';
  });
})();
