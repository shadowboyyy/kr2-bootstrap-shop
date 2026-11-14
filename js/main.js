// Каталог: показываем карточки, которые подходят под все выбранные фильтры.
const filters = document.querySelector('#filters');

if (filters) {
  const cards = document.querySelectorAll('[data-service]');
  const count = document.querySelector('#service-count');
  const empty = document.querySelector('#no-services');
  const type = new URLSearchParams(location.search).get('type');

  if (Array.from(filters.elements.type.options).some(option => option.value === type)) {
    filters.elements.type.value = type;
  }

  function filterServices() {
    const values = new FormData(filters);
    let visible = 0;

    for (const card of cards) {
      const matchType = !values.get('type') || card.dataset.type === values.get('type');
      const matchDuration = !values.get('duration') || card.dataset.duration === values.get('duration');
      const matchFormat = !values.get('format') || card.dataset.format === values.get('format');
      const matchDistrict = !values.get('district') || card.dataset.district.split(' ').includes(values.get('district'));

      card.hidden = !(matchType && matchDuration && matchFormat && matchDistrict);
      if (!card.hidden) visible++;
    }

    count.textContent = 'Найдено услуг: ' + visible;
    empty.hidden = visible !== 0;
  }

  filters.addEventListener('change', filterServices);
  filters.addEventListener('reset', () => {
    // Событие reset происходит до возврата значений по умолчанию.
    setTimeout(filterServices, 0);
    if (location.search) history.replaceState(null, '', 'catalog.html' + location.hash);
  });

  filterServices();
}

// Bootstrap открывает окно; мы заполняем его данными нажатой карточки.
const modal = document.querySelector('#serviceModal');

if (modal) {
  modal.addEventListener('show.bs.modal', event => {
    const card = event.relatedTarget.closest('[data-service]');
    document.querySelector('#serviceModalLabel').textContent = card.querySelector('.card-title').textContent;
    const cardImage = card.querySelector('.service-card__photo');
    const modalImage = document.querySelector('#modal-image');
    modalImage.src = cardImage.src;
    modalImage.alt = cardImage.alt;
    document.querySelector('#modal-description').textContent = card.querySelector('.card-text').textContent;
    document.querySelector('#modal-meta').textContent = card.querySelector('.service-card__meta').textContent;
    document.querySelector('#modal-price').textContent = card.querySelector('.service-card__price').textContent;
    document.querySelector('#modal-link').href = 'product.html?service=' + card.dataset.service;
  });
}

// На одной странице показываем детали выбранной услуги.
// Описание индивидуального выгула уже есть в HTML: оно открывается по умолчанию.
const services = {
  group: {
    image: 'dog-walk.jpg',
    imageAlt: 'Две собаки бегут по дорожке вместе',
    title: 'Групповой выгул',
    badge: 'Онлайн-запись',
    color: 'success',
    description: 'Час в парке в компании до трёх собак. Группу подбираем по размеру и темпераменту.',
    price: '490 ₽',
    duration: '60 минут',
    place: 'Парк «Сокольники», встреча у главного входа',
    person: 'Анна Морозова, выгульщик. Подбирает собак со схожим характером и знакомит их перед прогулкой.',
    included: 'Прогулка на поводках, перерывы на воду и фотоотчёт.',
    requirements: 'Подходит дружелюбным собакам, которые спокойно гуляют рядом с другими. Возьмите поводок и шлейку.'
  },
  pass: {
    image: 'service-pass.jpg',
    imageAlt: 'Женщина гуляет с собакой в парке',
    title: 'Абонемент на 5 прогулок',
    badge: 'Акция',
    color: 'danger',
    description: 'Пять индивидуальных прогулок по 30 минут с одним выгульщиком. В заявке выберите время первого выгула.',
    price: '2 490 ₽ за 5 прогулок',
    duration: '5 × 30 минут',
    place: 'Сокольники или Хамовники, встреча у вашего дома',
    person: 'Анна Морозова, выгульщик. Знакомится с питомцем на первой прогулке и согласовывает постоянный маршрут.',
    included: 'Пять прогулок, вода и отдельный фотоотчёт о каждой прогулке.',
    requirements: 'Подготовьте поводок и шлейку. Укажите в комментарии, в какие дни вам удобно гулять.'
  },
  boarding: {
    image: 'service-boarding.jpg',
    imageAlt: 'Собака отдыхает в лежанке дома',
    title: 'Домашняя передержка',
    description: 'На время вашего отъезда питомец останется дома у специалиста.',
    price: '1 490 ₽ за сутки',
    duration: '24 часа',
    place: 'Митино, у специалиста дома',
    hours: 'Заезд ежедневно с 09:00 до 20:00',
    person: 'Мария Белова, зооняня. Принимает одного питомца за раз, чтобы сохранить привычный для него распорядок.',
    included: 'Кормление по расписанию, прогулки для собак и ежедневные фото.',
    requirements: 'Возьмите привычный корм, лежанку и ветеринарный паспорт. Сообщите о важных особенностях ухода.'
  },
  grooming: {
    image: 'service-grooming.jpg',
    imageAlt: 'Женщина моет собаку в ванне',
    title: 'Груминг',
    badge: 'Онлайн-запись',
    color: 'success',
    description: 'Базовый уход за шерстью и когтями по записи.',
    price: '1 290 ₽',
    duration: '60 минут',
    place: 'Хамовники, у специалиста в студии',
    person: 'Дарья Волкова, грумер. Работает с собаками и делает перерывы, если питомец устаёт.',
    included: 'Мытьё, сушка, вычёсывание и уход за когтями.',
    requirements: 'Расскажите о чувствительности кожи, аллергиях и реакции питомца на сушку.'
  },
  sitter: {
    image: 'service-sitter.jpg',
    imageAlt: 'Женщина держит кошку на руках',
    title: 'Зооняня на дом',
    description: 'Специалист приедет к питомцу, пока вас нет дома. Подходит для кошек и собак.',
    price: '990 ₽',
    duration: '2 часа',
    place: 'Митино или Хамовники, у вас дома',
    person: 'Мария Белова, зооняня. Ухаживает за кошками и собаками и соблюдает привычный режим кормления.',
    included: 'Кормление, свежая вода, игры, уборка лотка и фото после визита.',
    requirements: 'Оставьте корм и инструкции по уходу. Укажите, как попасть в квартиру, при согласовании визита.'
  }
};

const serviceTitle = document.querySelector('#service-title');

if (serviceTitle) {
  const id = new URLSearchParams(location.search).get('service');
  const service = Object.hasOwn(services, id) ? services[id] : null;
  const report = document.querySelector('#report');

  if (service) {
    const image = document.querySelector('#service-image');
    image.src = 'images/' + service.image;
    image.alt = service.imageAlt;

    for (const field of ['title', 'description', 'price', 'duration', 'place', 'person', 'included', 'requirements']) {
      document.querySelector('#service-' + field).textContent = service[field];
    }

    const badge = document.querySelector('#service-badge');
    badge.hidden = !service.badge;
    if (service.badge) {
      badge.textContent = service.badge;
      badge.classList.replace('text-bg-warning', 'text-bg-' + service.color);
    }

    if (service.hours) document.querySelector('#service-hours').textContent = service.hours;
    document.querySelector('#order-service').defaultValue = service.title;
    document.title = service.title + ' — Pet Steps';
    report.hidden = !['group', 'pass'].includes(id);
  }

  function openReport() {
    if (location.hash === '#report' && !report.hidden) report.open = true;
  }

  openReport();
  window.addEventListener('hashchange', openReport);
}

// Проверка формы обратной связи.
document.querySelectorAll('[data-demo-form]').forEach(form => {
  const message = form.querySelector('[data-form-message]');

  function showMessage(text, isSuccess) {
    message.textContent = text;
    message.classList.toggle('alert-success', isSuccess);
    message.classList.toggle('alert-danger', !isSuccess);
    message.hidden = false;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    // Имя или комментарий из одних пробелов тоже считаем пустыми.
    for (const field of form.querySelectorAll('input[type="text"], input:not([type]), textarea')) {
      if (!field.readOnly) field.value = field.value.trim();
    }

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      showMessage('Проверьте отмеченные поля и попробуйте ещё раз.', false);
      form.querySelector(':invalid').focus();
      return;
    }

    form.reset();
    const result = 'Демо-сообщение принято.';
    showMessage(result + ' Данные никуда не отправлены.', true);
  });

  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    message.hidden = true;
  });
});

// Считаем от нуля, когда блок статистики впервые появляется на экране.
const statsSection = document.querySelector('.stats');

if (statsSection && 'IntersectionObserver' in window) {
  const statsObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;

    observer.disconnect();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const counters = Array.from(statsSection.querySelectorAll('.stats__number'), element => ({
      element,
      target: Number(element.textContent)
    }));
    const duration = 1400;
    let start;

    function tick(time) {
      start ??= time;
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;

      for (const { element, target } of counters) {
        element.textContent = Math.floor(target * eased);
      }

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, { threshold: 0.25 });
  statsObserver.observe(statsSection);
}

// Кнопка появляется только после прокрутки.
const backTop = document.querySelector('.back-top');

function updateBackTop() {
  backTop.hidden = window.scrollY < 320;
}

window.addEventListener('scroll', updateBackTop, { passive: true });
updateBackTop();
