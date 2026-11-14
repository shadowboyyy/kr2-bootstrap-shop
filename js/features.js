// Новые функции Pet Steps. Все записи хранятся только в этом браузере.
(() => {
  'use strict';

  const storageKey = 'petsteps.v1';
  const serviceNames = {
    walk: 'Индивидуальный выгул',
    group: 'Групповой выгул',
    pass: 'Абонемент на 5 прогулок',
    boarding: 'Домашняя передержка',
    grooming: 'Груминг',
    sitter: 'Зооняня на дом'
  };
  const durations = { walk: 30, group: 60, pass: 30, boarding: 1440, grooming: 60, sitter: 120 };
  const warning = document.querySelector('#storage-warning');
  const emptyState = () => ({ profile: null, bookings: [], reviews: [] });
  const byId = id => document.getElementById(id);
  const isText = (value, max) => typeof value === 'string' && value.length <= max;

  function showMessage(element, text, success = false) {
    element.textContent = text;
    element.classList.toggle('alert-success', success);
    element.classList.toggle('alert-danger', !success);
    element.hidden = false;
  }

  function storageError() {
    warning.textContent = 'Не удалось прочитать или сохранить данные. Проверьте, разрешено ли браузеру хранить данные этого сайта, и обновите страницу.';
    warning.hidden = false;
  }

  function validProfile(profile) {
    return profile === null || (
      typeof profile === 'object' && profile !== null &&
      isText(profile.name, 60) && isText(profile.breed, 80) &&
      ['dog', 'cat'].includes(profile.kind) && isText(profile.habits, 600) &&
      isText(profile.photo, 600000) &&
      (profile.photo === '' || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(profile.photo))
    );
  }

  function validBooking(booking) {
    return booking && isText(booking.id, 80) && Object.hasOwn(serviceNames, booking.service) &&
      /^\d{4}-\d{2}-\d{2}$/.test(booking.date) && /^\d{2}:00$/.test(booking.time) &&
      isText(booking.pet, 60) && isText(booking.breed, 80) &&
      (booking.comment === undefined || isText(booking.comment, 1000)) &&
      Number.isInteger(booking.stage) && booking.stage >= 0 && booking.stage <= 3 &&
      typeof booking.cancelled === 'boolean' && Number.isFinite(booking.createdAt);
  }

  function validReview(review) {
    return review && isText(review.id, 80) && isText(review.name, 60) &&
      isText(review.text, 800) && Number.isInteger(review.rating) &&
      review.rating >= 1 && review.rating <= 5 && Number.isFinite(review.createdAt);
  }

  function readState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return emptyState();
      const state = JSON.parse(raw);
      if (!state || !validProfile(state.profile) ||
          !Array.isArray(state.bookings) || state.bookings.length > 100 ||
          !state.bookings.every(validBooking) ||
          !Array.isArray(state.reviews) || state.reviews.length > 100 ||
          !state.reviews.every(validReview)) {
        throw new Error('Invalid saved data');
      }
      return state;
    } catch {
      storageError();
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      warning.hidden = true;
      return true;
    } catch {
      storageError();
      return false;
    }
  }

  function newId(prefix) {
    const id = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
    return prefix + '-' + id;
  }

  function validateForm(form, message) {
    for (const field of form.querySelectorAll('input:not([type]), input[type="text"], textarea')) {
      if (!field.readOnly) {
        field.value = field.value.trim();
        const tooShort = field.value && field.minLength > 0 && field.value.length < field.minLength;
        const tooLong = field.maxLength > 0 && field.value.length > field.maxLength;
        field.setCustomValidity(tooShort || tooLong ? 'Проверьте длину текста.' : '');
      }
    }
    form.classList.add('was-validated');
    if (form.checkValidity()) return true;
    showMessage(message, 'Проверьте отмеченные поля.');
    form.querySelector(':invalid').focus();
    return false;
  }

  for (const form of document.querySelectorAll('#review-form, #passport-form')) {
    form.addEventListener('input', event => {
      if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    });
  }

  function moscowNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts();
    const part = type => parts.find(item => item.type === type).value;
    return {
      date: part('year') + '-' + part('month') + '-' + part('day'),
      minutes: Number(part('hour')) * 60 + Number(part('minute'))
    };
  }

  function dateObject(date) {
    return new Date(date + 'T12:00:00Z');
  }

  function addDays(date, days) {
    const value = dateObject(date);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  function prettyDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(dateObject(date));
  }

  // Отзывы.
  const reviewForm = byId('review-form');

  function renderReviews() {
    if (!reviewForm) return;
    const state = readState();
    if (!state) return;
    const list = byId('review-list');
    list.replaceChildren();
    byId('reviews-empty').hidden = state.reviews.length > 0;
    const average = state.reviews.reduce((sum, review) => sum + review.rating, 0) / state.reviews.length;
    byId('review-summary').textContent = state.reviews.length
      ? average.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' из 5 · отзывов: ' + state.reviews.length
      : 'Станьте первым автором';

    for (const review of [...state.reviews].reverse()) {
      const fragment = byId('review-template').content.cloneNode(true);
      fragment.querySelector('[data-review-name]').textContent = review.name;
      const rating = fragment.querySelector('[data-review-rating]');
      rating.textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      rating.setAttribute('aria-label', review.rating + ' из 5');
      fragment.querySelector('[data-review-text]').textContent = review.text;
      const date = fragment.querySelector('[data-review-date]');
      date.dateTime = new Date(review.createdAt).toISOString();
      date.textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' }).format(review.createdAt);
      const remove = fragment.querySelector('[data-review-delete]');
      remove.setAttribute('aria-label', 'Удалить отзыв ' + review.name);
      remove.addEventListener('click', () => {
        const current = readState();
        if (!current) return;
        current.reviews = current.reviews.filter(item => item.id !== review.id);
        if (saveState(current)) {
          renderReviews();
          showMessage(byId('review-message'), 'Отзыв удалён.', true);
        }
      });
      list.append(fragment);
    }
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', event => {
      event.preventDefault();
      const message = byId('review-message');
      if (!validateForm(reviewForm, message)) return;
      const state = readState();
      if (!state) return;
      if (state.reviews.length >= 100) {
        showMessage(message, 'Сохранено 100 отзывов. Удалите один из старых, чтобы добавить новый.');
        return;
      }
      state.reviews.push({
        id: newId('review'),
        name: reviewForm.elements.name.value,
        rating: Number(reviewForm.elements.rating.value),
        text: reviewForm.elements.text.value,
        createdAt: Date.now()
      });
      if (!saveState(state)) {
        showMessage(message, 'Отзыв не сохранён. Попробуйте ещё раз.');
        return;
      }
      reviewForm.reset();
      reviewForm.classList.remove('was-validated');
      renderReviews();
      showMessage(message, 'Спасибо! Ваш отзыв добавлен.', true);
    });
    renderReviews();
  }

  // Паспорт питомца.
  const passportForm = byId('passport-form');
  let draftPhoto = '';
  let photoVersion = 0;

  function paintProfile(profile) {
    const image = byId('pet-preview');
    image.src = profile?.photo || 'images/paw.svg';
    image.alt = profile?.photo ? 'Фото питомца ' + profile.name : 'Фото питомца ещё не добавлено';
    byId('pet-preview-name').textContent = profile?.name || 'Ваш питомец';
    byId('pet-preview-breed').textContent = profile
      ? (profile.kind === 'cat' ? 'Кошка · ' : 'Собака · ') + profile.breed
      : 'Добавьте кличку, породу и привычки.';
    byId('pet-preview-habits').textContent = profile?.habits || '';
  }

  function loadProfile() {
    if (!passportForm) return;
    const state = readState();
    if (!state) return;
    const profile = state.profile;
    draftPhoto = profile?.photo || '';
    passportForm.elements.name.value = profile?.name || '';
    passportForm.elements.breed.value = profile?.breed || '';
    passportForm.elements.kind.value = profile?.kind || 'dog';
    passportForm.elements.habits.value = profile?.habits || '';
    paintProfile(profile);
  }

  async function preparePhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Выберите JPEG, PNG или WebP размером до 5 МБ.');
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(480 / image.width, 480 / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch {
      throw new Error('Не удалось открыть фото. Выберите другой файл.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (passportForm) {
    loadProfile();
    const fileInput = byId('pet-photo');
    const submit = passportForm.querySelector('[type="submit"]');
    fileInput.addEventListener('change', async () => {
      const version = ++photoVersion;
      const file = fileInput.files[0];
      if (!file) return;
      submit.disabled = true;
      try {
        const photo = await preparePhoto(file);
        if (version !== photoVersion) return;
        draftPhoto = photo;
        byId('pet-preview').src = photo;
        byId('pet-preview').alt = 'Предпросмотр фотографии питомца';
        showMessage(byId('passport-message'), 'Фото готово. Нажмите «Сохранить паспорт».', true);
      } catch (error) {
        if (version !== photoVersion) return;
        fileInput.value = '';
        showMessage(byId('passport-message'), error.message || 'Не удалось открыть фото. Выберите другой файл.');
      } finally {
        if (version === photoVersion) submit.disabled = false;
      }
    });

    byId('pet-remove-photo').addEventListener('click', () => {
      photoVersion++;
      draftPhoto = '';
      fileInput.value = '';
      submit.disabled = false;
      byId('pet-preview').src = 'images/paw.svg';
      byId('pet-preview').alt = 'Фото питомца ещё не добавлено';
      showMessage(byId('passport-message'), 'Фото убрано из черновика. Сохраните паспорт.', true);
    });

    passportForm.addEventListener('submit', event => {
      event.preventDefault();
      const message = byId('passport-message');
      if (submit.disabled || !validateForm(passportForm, message)) return;
      const state = readState();
      if (!state) return;
      state.profile = {
        name: passportForm.elements.name.value,
        kind: passportForm.elements.kind.value,
        breed: passportForm.elements.breed.value,
        habits: passportForm.elements.habits.value,
        photo: draftPhoto
      };
      if (!saveState(state)) {
        showMessage(message, 'Паспорт не сохранён. Попробуйте убрать фото или освободить место в браузере.');
        return;
      }
      paintProfile(state.profile);
      passportForm.classList.remove('was-validated');
      showMessage(message, 'Паспорт сохранён. Его данные появятся в новой заявке.', true);
    });

    byId('pet-delete').addEventListener('click', () => {
      const state = readState();
      if (!state) return;
      state.profile = null;
      if (!saveState(state)) return;
      photoVersion++;
      fileInput.value = '';
      submit.disabled = false;
      loadProfile();
      passportForm.classList.remove('was-validated');
      showMessage(byId('passport-message'), 'Паспорт удалён.', true);
    });
  }

  // Квиз.
  const quiz = byId('quiz-form');
  if (quiz) {
    const result = byId('quiz-result');
    quiz.addEventListener('change', () => {
      result.hidden = true;
      const isCat = quiz.elements.pet.value === 'cat';
      for (const option of quiz.elements.need.options) {
        option.disabled = isCat && ['walk', 'grooming'].includes(option.value);
      }
      if (quiz.elements.need.selectedOptions[0].disabled) quiz.elements.need.value = '';
      const isWalk = quiz.elements.need.value === 'walk';
      quiz.elements.rhythm.querySelector('[value="company"]').disabled = !isWalk;
      if (quiz.elements.rhythm.selectedOptions[0].disabled) quiz.elements.rhythm.value = '';
      byId('quiz-rhythm-label').textContent = isWalk ? 'Формат прогулок *' : 'Как часто? *';
    });

    quiz.addEventListener('submit', event => {
      event.preventDefault();
      quiz.classList.add('was-validated');
      if (!quiz.checkValidity()) {
        quiz.querySelector(':invalid').focus();
        return;
      }
      const answers = new FormData(quiz);
      let key = 'sitter';
      let reason = 'Специалист придёт к питомцу домой, покормит его и уделит ему внимание.';
      if (answers.get('need') === 'travel') {
        key = 'boarding';
        reason = 'Питомец погостит у специалиста, пока вы в отъезде.';
      } else if (answers.get('need') === 'grooming') {
        key = 'grooming';
        reason = 'Грумер поможет с мытьём, вычёсыванием и уходом за когтями.';
      } else if (answers.get('need') === 'walk' && answers.get('pet') === 'dog') {
        const walkOptions = { once: 'walk', regular: 'pass', company: 'group' };
        key = walkOptions[answers.get('rhythm')];
        reason = 'Подобрали формат под ваш график. В заявке расскажите о привычках собаки.';
      }
      byId('quiz-result-title').textContent = serviceNames[key];
      byId('quiz-result-description').textContent = reason;
      byId('quiz-result-link').href = 'product.html?service=' + key + '#booking';
      result.hidden = false;
    });
  }

  // Календарь и запись.
  const bookingForm = byId('booking-form');
  const requestedService = new URLSearchParams(location.search).get('service');
  const serviceKey = Object.hasOwn(serviceNames, requestedService) ? requestedService : 'walk';

  function slotAvailable(state, key, date, time) {
    const now = moscowNow();
    if (!date || date < now.date || date > addDays(now.date, 90)) return false;
    const start = Number(time.slice(0, 2)) * 60;
    if (date === now.date && start <= now.minutes) return false;
    const duration = key === 'boarding' ? 60 : durations[key];
    if (start < 540 || start > 1200 || (key !== 'boarding' && start + duration > 1200)) return false;
    return !state.bookings.some(booking => {
      if (booking.cancelled || booking.service !== key || booking.date !== date) return false;
      const bookedStart = Number(booking.time.slice(0, 2)) * 60;
      return start < bookedStart + duration && bookedStart < start + duration;
    });
  }

  function timeValues() {
    return Array.from({ length: 12 }, (_, index) => String(index + 9).padStart(2, '0') + ':00');
  }

  let refreshCalendar = () => {};

  if (bookingForm) {
    const dateInput = byId('order-date');
    const timeInput = byId('order-time');
    const message = bookingForm.querySelector('[data-form-message]');
    const today = moscowNow().date;
    let month = today.slice(0, 7);
    const initial = readState();
    if (initial?.profile) {
      byId('order-pet').value = initial.profile.name;
      byId('order-breed').value = initial.profile.breed;
      byId('order-comment').value = initial.profile.habits;
      byId('passport-booking-hint').textContent = 'Данные подставлены из паспорта питомца. Их можно изменить для этой заявки.';
    }
    byId('order-pet').maxLength = 60;
    byId('order-breed').maxLength = 80;

    function renderTimes(state) {
      const date = dateInput.value;
      const previous = timeInput.value;
      timeInput.replaceChildren(new Option('Выберите время', ''));
      const times = byId('calendar-times');
      times.replaceChildren();

      for (const time of timeValues()) {
        const available = !!state && slotAvailable(state, serviceKey, date, time);
        const option = new Option(time, time);
        option.disabled = !available;
        timeInput.add(option);
        if (!date) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-sm btn-outline-primary';
        button.textContent = time;
        button.disabled = !available;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', time + (available ? ' — свободно' : ' — недоступно'));
        button.addEventListener('click', () => {
          timeInput.value = time;
          renderTimes(readState());
        });
        times.append(button);
      }
      const selected = Array.from(timeInput.options).find(option => option.value === previous && !option.disabled);
      timeInput.value = selected?.value || '';
      for (const button of times.children) {
        const pressed = button.textContent === timeInput.value;
        button.classList.toggle('btn-primary', pressed);
        button.classList.toggle('btn-outline-primary', !pressed);
        button.setAttribute('aria-pressed', String(pressed));
      }
      const hasTime = Array.from(timeInput.options).some(option => option.value && !option.disabled);
      byId('calendar-selection').textContent = !date ? 'Выберите день для просмотра времени.' :
        prettyDate(date) + (hasTime ? ' · выберите свободное время.' : ' · свободного времени нет, выберите другой день.');
    }

    refreshCalendar = () => {
      const now = moscowNow();
      dateInput.min = now.date;
      dateInput.max = addDays(now.date, 90);
      const state = readState();
      const first = dateObject(month + '-01');
      const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
      byId('calendar-month').textContent = monthLabel;
      byId('calendar-prev').disabled = month <= now.date.slice(0, 7);
      byId('calendar-next').disabled = month >= dateInput.max.slice(0, 7);
      const grid = byId('calendar-days');
      grid.replaceChildren();
      const offset = (first.getUTCDay() + 6) % 7;
      const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();

      for (let index = 0; index < offset; index++) {
        grid.append(document.createElement('span'));
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const date = month + '-' + String(day).padStart(2, '0');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar__day';
        button.textContent = day;
        button.disabled = !state || !timeValues().some(time => slotAvailable(state, serviceKey, date, time));
        button.setAttribute('aria-label', prettyDate(date) + (button.disabled ? ' — недоступно' : ''));
        button.setAttribute('aria-pressed', String(date === dateInput.value));
        if (date === now.date) button.setAttribute('aria-current', 'date');
        button.addEventListener('click', () => {
          dateInput.value = date;
          timeInput.value = '';
          refreshCalendar();
        });
        grid.append(button);
      }
      renderTimes(state);
    };

    function changeMonth(direction) {
      const value = dateObject(month + '-01');
      value.setUTCMonth(value.getUTCMonth() + direction);
      month = value.toISOString().slice(0, 7);
      refreshCalendar();
    }
    byId('calendar-prev').addEventListener('click', () => changeMonth(-1));
    byId('calendar-next').addEventListener('click', () => changeMonth(1));
    dateInput.addEventListener('change', () => {
      if (dateInput.validity.valid && dateInput.value) month = dateInput.value.slice(0, 7);
      timeInput.value = '';
      refreshCalendar();
    });
    timeInput.addEventListener('change', () => renderTimes(readState()));
    bookingForm.addEventListener('reset', () => {
      bookingForm.classList.remove('was-validated');
      message.hidden = true;
      byId('booking-tracker-link').hidden = true;
      setTimeout(refreshCalendar, 0);
    });

    bookingForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!validateForm(bookingForm, message)) return;
      const state = readState();
      if (!state) return;
      if (!slotAvailable(state, serviceKey, dateInput.value, timeInput.value)) {
        showMessage(message, 'Это время уже недоступно. Выберите другой день или время.');
        refreshCalendar();
        return;
      }
      if (state.bookings.length >= 100) {
        showMessage(message, 'Достигнут лимит в 100 заявок в этом браузере.');
        return;
      }
      const booking = {
        id: newId('PS'),
        service: serviceKey,
        date: dateInput.value,
        time: timeInput.value,
        pet: byId('order-pet').value,
        breed: byId('order-breed').value,
        comment: byId('order-comment').value,
        stage: 0,
        cancelled: false,
        createdAt: Date.now()
      };
      state.bookings.push(booking);
      if (!saveState(state)) {
        showMessage(message, 'Не удалось сохранить заявку. Попробуйте ещё раз.');
        return;
      }
      showMessage(message, 'Заявка ' + booking.id + ' сохранена. ' + prettyDate(booking.date) + ', ' + booking.time + ' по Москве.', true);
      byId('booking-tracker-link').href = 'account.html#' + booking.id;
      byId('booking-tracker-link').hidden = false;
      bookingForm.classList.remove('was-validated');
      refreshCalendar();
    });

    refreshCalendar();
    window.addEventListener('focus', refreshCalendar);
  }

  // Трекер заявок.
  function renderBookings() {
    const list = byId('booking-list');
    if (!list) return;
    const state = readState();
    if (!state) return;
    list.replaceChildren();
    byId('tracker-empty').hidden = state.bookings.length > 0;
    const labels = ['Заявка принята', 'Специалист назначен', 'Услуга выполняется', 'Завершена'];

    for (const booking of [...state.bookings].reverse()) {
      const fragment = byId('booking-template').content.cloneNode(true);
      fragment.querySelector('article').id = booking.id;
      fragment.querySelector('[data-booking-title]').textContent = serviceNames[booking.service];
      fragment.querySelector('[data-booking-meta]').textContent = booking.id + ' · ' + prettyDate(booking.date) + ', ' + booking.time + ' (Москва)';
      fragment.querySelector('[data-booking-pet]').textContent = booking.pet + ' · ' + booking.breed;
      const comment = fragment.querySelector('[data-booking-comment]');
      comment.textContent = booking.comment || '';
      comment.hidden = !booking.comment;
      const status = fragment.querySelector('[data-booking-status]');
      status.textContent = booking.cancelled ? 'Отменена' : labels[booking.stage];
      status.classList.toggle('text-bg-secondary', booking.cancelled);
      status.classList.toggle('text-bg-success', !booking.cancelled);
      const steps = fragment.querySelector('[data-booking-steps]');
      steps.hidden = booking.cancelled;
      for (const [index, label] of labels.entries()) {
        const step = document.createElement('li');
        step.textContent = label;
        step.className = 'tracker__step';
        step.classList.toggle('tracker__step--done', index <= booking.stage);
        if (index === booking.stage) step.setAttribute('aria-current', 'step');
        steps.append(step);
      }
      fragment.querySelector('[data-booking-note]').textContent = booking.cancelled
        ? 'Заявка отменена. Её время снова доступно в календаре.'
        : 'Демонстрация статусов. Этап меняется по кнопке ниже.';
      const next = fragment.querySelector('[data-booking-next]');
      const cancel = fragment.querySelector('[data-booking-cancel]');
      next.hidden = booking.cancelled || booking.stage === 3;
      cancel.hidden = booking.cancelled || booking.stage === 3;
      fragment.querySelector('[data-booking-review]').hidden = booking.cancelled || booking.stage !== 3;

      function changeBooking(cancelled) {
        const current = readState();
        if (!current) return;
        const item = current.bookings.find(value => value.id === booking.id);
        if (!item || item.cancelled || item.stage === 3) return;
        if (cancelled) item.cancelled = true;
        else item.stage++;
        if (saveState(current)) {
          renderBookings();
          showMessage(byId('tracker-message'), cancelled ? 'Заявка отменена.' : 'Статус заявки обновлён.', true);
        }
      }
      next.addEventListener('click', () => changeBooking(false));
      cancel.addEventListener('click', () => changeBooking(true));
      list.append(fragment);
    }
  }
  renderBookings();

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    renderReviews();
    renderBookings();
    refreshCalendar();
  });
})();
