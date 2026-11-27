import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site, siteUrl } from './site.config.mjs';
import { mainService, serviceDrafts } from './services.mjs';

const preview = process.argv.includes('--preview');
const indexable = !preview && site.indexRelease;
const out = preview ? 'preview' : 'dist';
const routes = [mainService, ...serviceDrafts.filter(item => preview || site.confirmedServices.includes(item.slug))];
const call = 'tel:' + site.tel;
const mail = 'mailto:' + site.email;
const gBa = 'https://www.g-ba.de/themen/veranlasste-leistungen/krankenbefoerderung/';
const icons = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A18 18 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7l.6 3a2 2 0 0 1-.5 2l-1.3 1.2a15 15 0 0 0 6.3 6.3l1.2-1.3a2 2 0 0 1 2-.5l3 .6a2 2 0 0 1 1.7 1.9Z"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-12 5 2 2 4-4"/>',
  car: '<path d="m4 11 2-6h12l2 6M4 19v2m16-2v2"/><rect x="2" y="11" width="20" height="8" rx="2"/><path d="M6 15h2m8 0h2"/>',
  route: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h10a4 4 0 0 1 0 8H7a2 2 0 0 0 0 4h10"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M10 21v-4h4v4M9 7h6m-3-2v4M9 13h.01m6 0h.01"/>',
  shield: '<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><ellipse cx="12" cy="12" rx="4" ry="9"/>',
  moon: '<path d="M21 13.1A9 9 0 1 1 10.9 3 7 7 0 0 0 21 13.1Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  help: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.8-3.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M10 9a2.5 2.5 0 0 1 5 .2c0 1.7-2.5 1.8-2.5 3.3m0 2.8h.01"/>',
  arrowUpRight: '<path d="M6 18 18 6M9 6h9v9"/>',
  previous: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  whatsapp: '<path d="M20.5 12a8.5 8.5 0 0 1-12.7 7.4L3 21l1.6-4.7A8.5 8.5 0 1 1 20.5 12Z"/><path d="M9 8.5c-.7-.3-1.3.4-1.3 1.2 0 2.5 3.4 5.8 5.9 5.8.8 0 1.5-.7 1.2-1.4l-1.8-1-1 .8a7 7 0 0 1-2.4-2.4l.7-1.1L9 8.5Z"/>',
};
const icon = name => `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const floatLink = (name, href, label) => `<a class="floating-${name}" href="${href}" aria-label="${label}" title="${label}">${icon(name)}</a>`;
const floatingContacts = `<nav class="floating-contacts" aria-label="Schnellkontakt">
  ${floatLink('phone', call, 'Jetzt anrufen')}
  ${preview || site.whatsappConfirmed ? floatLink('whatsapp', 'https://wa.me/' + site.tel.replace(/^\+/, ''), 'WhatsApp öffnen') : ''}
  ${floatLink('mail', mail, 'E-Mail schreiben')}
</nav>`;
const link = (path, label, className = '') => `<a class="${className}" href="${path}">${label}</a>`;
const request = (label = 'Fahrt anfragen', className = 'button') => link('/kontakt/#anfrage', label, className);
const phone = (label = 'Jetzt anrufen', className = 'button secondary') => link(call, icon('phone') + label, className);
const address = `<address>${site.street}<br>${site.city}<br>Deutschland</address>`;
const photo = () => '<figure class="vehicle"><img src="/assets/fahrzeug.jpg" width="1536" height="1024" alt="Dunkelgrauer Personenwagen vor einem Gebäude" loading="lazy"></figure>';
const serviceImageDescriptions = {
  'krankenfahrten-koeln': 'Personenwagen vor einem Gebäude in Köln',
  'arztfahrten-koeln': 'Ein Fahrgast geht zum Eingang einer Hausarztpraxis',
  'dialysefahrten-koeln': 'Ein Fahrgast geht von einem Auto zum Dialysezentrum',
  'reha-fahrten-koeln': 'Reha-Einrichtung mit Garten und einem Fahrgast mit Reisetasche',
  'therapiefahrten-koeln': 'Eine Frau vor einer Physiotherapiepraxis mit Übungsgeräten hinter dem Fenster',
  'krankenhausfahrten-koeln': 'Personenwagen vor dem überdachten Eingang eines Krankenhauses',
  'chemotherapie-fahrten-koeln': 'Ein Fahrgast sitzt in einem Auto vor einer onkologischen Tagesklinik',
  'strahlentherapie-fahrten-koeln': 'Ein Fahrgast am Eingang einer Einrichtung für Strahlentherapie',
  'serienfahrten-koeln': 'Ein Personenwagen wartet vor einem Wohnhaus auf einen Fahrgast',
  'ambulante-behandlungsfahrten-koeln': 'Ein Fahrgast geht vom Vorplatz zum Eingang einer Ambulanz',
  'entlassungsfahrten-koeln': 'Ein Fahrgast mit Reisetasche geht vom Klinikeingang zum wartenden Auto',
  'facharztfahrten-koeln': 'Eine Frau mit Unterlagen am Eingang eines Facharztzentrums',
};
const servicePhoto = (item, thumbnail = false) => `<figure class="${thumbnail ? 'card-photo' : 'vehicle'}"><img src="/assets/services/${item.slug}${thumbnail ? '-card' : ''}.jpg" width="${thumbnail ? 630 : 1260}" height="${thumbnail ? 420 : 840}" alt="${thumbnail ? '' : serviceImageDescriptions[item.slug]}" loading="lazy" decoding="async"></figure>`;
const heroServices = [mainService.slug, 'arztfahrten-koeln', 'dialysefahrten-koeln', 'reha-fahrten-koeln']
  .map(slug => routes.find(service => service.slug === slug)).filter(Boolean);
const heroSlides = `<div class="hero-photo">${heroServices.map((service, index) => index === 0
  ? '<img data-hero-slide src="/assets/abholung.jpg" width="1536" height="1024" alt="" fetchpriority="high">'
  : `<img data-hero-slide hidden src="/assets/services/${service.slug}.jpg" width="1260" height="840" alt="" loading="lazy" decoding="async">`).join('')}</div>`;
const heroSliderControls = heroServices.length > 1 ? `
<div class="hero-slider" role="group" aria-label="Leistungen im Überblick" hidden>
  <div class="hero-slide-title" aria-live="off">${heroServices.map((service, index) => `<a data-hero-slide-link href="/${service.slug}/"${index ? ' hidden' : ''}>${service.title}${icon('arrowUpRight')}</a>`).join('')}</div>
  <div class="hero-slider-buttons">
    <button type="button" data-hero-step="-1" aria-label="Vorherige Leistung">${icon('previous')}</button>
    ${heroServices.map((service, index) => `<button type="button" data-hero-index="${index}" aria-label="${service.title}" aria-pressed="${index === 0}"><span></span></button>`).join('')}
    <button type="button" data-hero-step="1" aria-label="Nächste Leistung">${icon('next')}</button>
    <button type="button" class="hero-rotation" aria-pressed="false" aria-label="Automatischer Folienwechsel"><span class="hero-rotation-play">${icon('play')}</span><span class="hero-rotation-pause">${icon('pause')}</span></button>
  </div>
</div>` : '';
const homeGuides = [
  {
    id: 'angehoerige', label: 'Für Angehörige', title: 'Eine Fahrt für jemanden organisieren',
    copy: 'Wenn Sie eine Fahrt für einen Angehörigen anfragen, stimmen Sie zuerst Termin und Treffpunkt mit der mitfahrenden Person ab. Geben Sie bei der Anfrage an, wer für Rückfragen erreichbar ist.',
    alt: 'Zwei Frauen schauen gemeinsam auf einen Kalender', href: '/kontakt/#anfrage', action: 'Fahrt für Angehörige anfragen',
  },
  {
    id: 'vorbereitung', label: 'Vor dem Termin', title: 'Zeit für die Anmeldung einplanen',
    copy: 'Manche Praxen bitten darum, schon vor dem eigentlichen Termin da zu sein. Nennen Sie bei der Fahrtanfrage die Uhrzeit, zu der Sie an der Anmeldung sein sollen.',
    alt: 'Kalender, Stift und Brille auf einem Tisch', href: '/faq/', action: 'Häufige Fragen zur Fahrt',
  },
  {
    id: 'treffpunkt', label: 'Abholort', title: 'Den richtigen Eingang vereinbaren',
    copy: 'Bei Kliniken und Ärztehäusern kann es mehrere Eingänge geben. Nennen Sie den Gebäudeteil oder einen eindeutigen Treffpunkt. So ist auch bei der Rückfahrt klar, wo Sie warten.',
    alt: 'Ein Mann wartet vor einem Gebäudeeingang', href: '/krankenfahrten-koeln/', action: 'Mehr zu Abholung und Rückfahrt',
  },
  {
    id: 'terminreihe', label: 'Mehrere Fahrtage', title: 'Wiederkehrende Termine im Blick behalten',
    copy: 'Schreiben Sie die bekannten Fahrtage mit den jeweiligen Uhrzeiten auf. Vermerken Sie Feiertage, Änderungen und Tage, an denen Sie eine Rückfahrt brauchen. Bei der Anfrage können Sie die Termine zusammen besprechen.',
    alt: 'Ein Fahrgast geht in einer Wohnstraße auf einen Personenwagen zu', href: '/kontakt/#anfrage', action: 'Mehrere Termine besprechen',
  },
];
const guideSections = homeGuides.map(({ id, label, title, copy, alt, href, action }, index) => `
<section class="section home-guide ${index % 2 === 0 ? 'pale' : 'home-guide-reversed'}" aria-labelledby="guide-${id}"><div class="wrap split">
<div class="guide-copy"><p class="eyebrow">${label}</p><h2 id="guide-${id}">${title}</h2><p>${copy}</p>${link(href, action, 'text-link')}</div>
<figure class="vehicle"><img src="/assets/home-${id}.jpg" width="1080" height="720" alt="${alt}" loading="lazy" decoding="async"></figure>
</div></section>`).join('');
const districts = ['Innenstadt', 'Rodenkirchen', 'Lindenthal', 'Ehrenfeld', 'Nippes', 'Chorweiler', 'Porz', 'Kalk', 'Mülheim'];
const districtList = `<ul class="area-districts" aria-label="Kölner Stadtbezirke">${districts.map(district => `<li translate="no">${icon('pin')}${district}</li>`).join('')}</ul>`;
const areaPageLink = link('/einsatzgebiet/', 'Einsatzgebiet ansehen', 'button');
const faq = [
  ['Wie frage ich eine Krankenfahrt an?', 'Rufen Sie an oder bereiten Sie eine E-Mail vor. Halten Sie Datum, Uhrzeit, Abholort und Ziel bereit. Die Fahrt steht erst nach persönlicher Bestätigung fest.'],
  ['Kann ich eine Rückfahrt mit anfragen?', 'Ja. Geben Sie bei der Anfrage an, ob Sie eine Rückfahrt benötigen und ob die voraussichtliche Endzeit bereits feststeht.'],
  ['Übernimmt die Krankenkasse die Kosten?', 'Die Voraussetzungen hängen vom Anlass und vom Einzelfall ab. Klären Sie vorab mit Ihrer Krankenkasse, ob Sie eine ärztliche Verordnung oder eine Genehmigung benötigen.'],
  ['Kann ich für eine andere Person anfragen?', 'Ja. Stimmen Sie die Fahrt mit der mitfahrenden Person ab und nennen Sie eine Telefonnummer, unter der Rückfragen möglich sind.'],
  ['Welche Orte werden angefahren?', 'Der Schwerpunkt liegt auf Köln und Umgebung. Fragen Sie Ihre konkrete Route an, damit wir die Verfügbarkeit prüfen können.'],
  ['Welche Art von Fahrten bietet der Krankenfahrdienst an?', 'Wir organisieren geplante Personenfahrten zu medizinischen Terminen. Während der Fahrt erfolgt keine medizinische Betreuung. Bei einem akuten medizinischen Notfall wählen Sie 112.'],
];
const answers = (entries, firstOpen = false) => `<div class="answers">${entries.map(([q, a], i) => `<details${firstOpen && i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`;
const intro = (label, title, copy = '') => `<header class="section-title"><p class="eyebrow">${label}</p><h2>${title}</h2>${copy ? `<p>${copy}</p>` : ''}</header>`;
const crumbs = title => `<nav class="crumbs wrap" aria-label="Brotkrümelnavigation"><a href="/">Startseite</a><span aria-hidden="true">/</span><span aria-current="page">${title}</span></nav>`;
const pageHero = (title, copy) => `<section class="subhero"><div class="wrap"><h1>${title}</h1><p>${copy}</p></div></section>`;
const cards = items => `<div class="cards">${items.map(item => `<article class="card${item.slug ? ' card-with-photo' : ''}">${item.slug ? servicePhoto(item, true) : ''}<div class="card-body"><span class="tile-icon">${icon(item.icon)}</span><h3>${item.title}</h3><p>${item.intro}</p>${item.slug ? link('/' + item.slug + '/', 'Mehr erfahren', 'text-link') : ''}</div></article>`).join('')}</div>`;
const showcaseCards = items => `<div class="cards showcase-cards">${items.map(item => {
  const href = item.slug ? `/${item.slug}/` : item.href;
  const picture = item.slug ? servicePhoto(item, true) : `<figure class="card-photo"><img src="/assets/${item.image}" width="1080" height="720" alt="" loading="lazy" decoding="async"></figure>`;
  return `<article class="card showcase-card">
    <div class="showcase-image">${picture}</div>
    <h3><a class="showcase-link" href="${href}">${item.title}<span class="showcase-arrow">${icon('arrowUpRight')}</span></a></h3>
    <p>${item.intro}</p>
  </article>`;
}).join('')}</div>`;
const journeyCards = [
  { icon: 'calendar', title: 'Einzelne Termine', intro: 'Teilen Sie uns mit, wann und wo Ihr medizinischer Termin stattfindet.' },
  { icon: 'route', title: 'Hin- und Rückfahrt', intro: 'Fragen Sie beide Wege gemeinsam an und nennen Sie die voraussichtliche Endzeit.', href: '#guide-treffpunkt', image: 'home-treffpunkt.jpg' },
  { icon: 'repeat', title: 'Wiederkehrende Termine', intro: 'Wenn Sie mehrere Fahrtage planen, geben Sie uns die bekannten Termine durch.', href: '#guide-terminreihe', image: 'home-terminreihe.jpg' },
];
const howItWorks = [
  ['calendar', 'Fahrt anfragen', 'Halten Sie Datum, Uhrzeit, Start und Ziel bereit.'],
  ['pin', 'Abholung abstimmen', 'Besprechen Sie den Treffpunkt und bei Bedarf die Rückfahrt.'],
  ['check', 'Bestätigung erhalten', 'Nach der persönlichen Bestätigung steht Ihre Fahrt fest.'],
  ['car', 'Zum Termin fahren', 'Seien Sie zur bestätigten Zeit am Treffpunkt. Wenn sich Ihr Termin verschiebt, rufen Sie uns bitte an.'],
];
const steps = `<ol class="steps">${howItWorks.slice(0, 3).map(([, title, copy]) => `<li><h3>${title}</h3><p>${copy}</p></li>`).join('')}</ol>`;
const cta = `<section class="cta"><div class="wrap cta-inner"><div><p class="eyebrow">Persönlicher Kontakt</p><h2>Wann ist Ihr nächster Termin?</h2><p>Besprechen Sie Ihre Fahrt direkt mit uns.</p></div><div class="actions">${request()}${phone()}</div></div></section>`;
const rideForm = (id, compact = false) => `
<form id="${id}" data-mail="${mail}" hidden>
<div class="form-fields">
<div><label for="${id}-pickup">Abholort</label><input id="${id}-pickup" name="pickup" maxlength="150" required></div>
<div><label for="${id}-destination">Zielort</label><input id="${id}-destination" name="destination" maxlength="150" required></div>
<div><label for="${id}-date">Termindatum</label><input id="${id}-date" name="date" type="date" required></div>
<div><label for="${id}-time">Terminzeit</label><input id="${id}-time" name="time" type="time" required></div>
<div class="form-wide"><label for="${id}-callback">Rückrufnummer</label><input id="${id}-callback" name="callback" autocomplete="tel" type="tel" maxlength="40" required></div>
</div>
<label class="check"><input type="checkbox" name="return"> Rückfahrt ebenfalls anfragen</label>
<button class="button" type="submit">In E-Mail-App öffnen</button>
${compact ? '<p class="form-help">Bitte senden Sie keine Diagnosen oder Befunde.</p>' : ''}
<p class="form-status" role="status" hidden>Ihre E-Mail-App sollte sich jetzt öffnen. Alternativ erreichen Sie uns telefonisch unter ${link(call, site.phone)}.</p>
</form><noscript><p>${link(mail, 'E-Mail direkt öffnen', 'text-link')}</p></noscript>`;
const homepage = `
<section class="hero" data-hero-slider>${heroSlides}<div class="hero-inner"><div class="hero-copy"><p class="hero-location">${icon('pin')} Köln und Umgebung</p><h1>Krankenfahrdienst<br>in Köln</h1><p class="hero-text">Geplante Krankenfahrten zu Praxen und Kliniken in Köln und Umgebung. Stimmen Sie Ihre Abholung und bei Bedarf die Rückfahrt direkt mit uns ab.</p><div class="actions">${link('#schnellanfrage', 'Fahrt anfragen', 'button')}${link('#leistungen', 'Leistungen ansehen', 'button secondary')}</div>${heroSliderControls}</div><aside class="hero-contact" aria-label="Telefonischer Kontakt"><p>Persönlich erreichbar</p><div class="hero-contact-panel"><div class="hero-contact-icons" aria-hidden="true">${['phone', 'mail', 'calendar'].map(name => `<span>${icon(name)}</span>`).join('')}</div>${link(call, site.phone)}</div></aside></div></section>
<div class="quick wrap"><div>${icon('phone')}<span><small>Telefonischer Kontakt</small>${link(call, site.phone)}</span></div><div>${icon('calendar')}<span><small>Fahrtplanung</small>Einzelne oder mehrere Termine</span></div><div>${icon('pin')}<span><small>Einsatzgebiet</small>Köln und Umgebung</span></div></div>
<section class="section wrap ride-intro" aria-labelledby="ride-intro-title">
  <div class="ride-intro-photos">
    <figure class="vehicle"><img src="/assets/home-angehoerige.jpg" width="1080" height="720" alt="Zwei Frauen planen einen Termin am Kalender" loading="lazy" decoding="async"></figure>
    <figure class="vehicle"><img src="/assets/fahrzeug.jpg" width="1536" height="1024" alt="Dunkelgrauer Personenwagen vor einem Gebäude" loading="lazy" decoding="async"></figure>
  </div>
  <div class="ride-intro-copy">
    <h2 id="ride-intro-title">Ihre Fahrt in guten Händen</h2>
    <p>Sie haben einen medizinischen Termin in Köln oder Umgebung? Besprechen Sie mit uns, wann Sie am Ziel sein müssen, wo wir Sie abholen sollen und ob Sie eine Rückfahrt brauchen.</p>
    <ul><li>${icon('check')} Abholung und Rückfahrt abstimmen</li><li>${icon('check')} Fahrten auch für Angehörige anfragen</li><li>${icon('check')} Persönliche Bestätigung vor der Fahrt</li></ul>
    ${link('#schnellanfrage', 'Fahrt anfragen', 'button')}
  </div>
</section>
<section class="section wrap home-services" id="leistungen">${intro('Leistungen','Krankenfahrten rund um Ihren Termin','Geplante Fahrten für medizinische Termine in Köln und Umgebung.')}${showcaseCards(routes.length > 1 ? routes : [mainService, ...journeyCards.slice(1)])}</section>
<section class="section pale home-process" id="so-funktionierts" aria-labelledby="home-process-title"><div class="wrap">
  <header class="section-title"><h2 id="home-process-title">So funktioniert Ihre Krankenfahrt</h2></header>
  <ol class="process-steps">${howItWorks.map(([symbol, title, copy]) => `<li><span class="process-icon">${icon(symbol)}</span><h3>${title}</h3><p>${copy}</p></li>`).join('')}</ol>
  <div class="process-action">${link('#schnellanfrage', 'Fahrt anfragen', 'button')}</div>
</div></section>
<section class="section wrap split home-enquiry" id="schnellanfrage" aria-labelledby="quick-ride-heading"><div><p class="eyebrow">Ihre Fahrt planen</p><h2 id="quick-ride-heading">Fahrt anfragen</h2><p>Für die erste Anfrage genügen Termin, Start und Ziel sowie eine Nummer für Rückfragen. Die Fahrt steht nach persönlicher Bestätigung fest.</p></div><div class="enquiry"><p>Bereiten Sie Ihre Anfrage vor und senden Sie sie aus Ihrer E-Mail-App.</p>${rideForm('quick-ride', true)}</div></section>
<section class="section wrap split">${photo()}<div>${intro('Unterwegs im Raum Köln','Abholung und Rückfahrt im Blick','Ob der Termin gleich um die Ecke oder am anderen Ende der Stadt liegt, nennen Sie uns den genauen Treffpunkt. Ein gut beschriebener Praxiseingang oder eine eindeutige Abholadresse erleichtert die Abstimmung.')}<p>Wenn Sie für einen Angehörigen anfragen oder Fragen zum Einstieg haben, besprechen Sie das vorab telefonisch.</p>${link('/ueber-uns/', 'Über den Fahrdienst', 'text-link')}</div></section>
${guideSections}
<section class="section" id="einsatzgebiet" aria-labelledby="area-home-title"><div class="wrap split area-home">
  <div><p class="eyebrow">Einsatzgebiet</p><h2 id="area-home-title">Krankenfahrten in Köln und Umgebung</h2><p>Ob der Termin im eigenen Stadtbezirk oder auf der anderen Rheinseite liegt, teilen Sie uns Ihren Abholort und Ihr Ziel mit. Für Strecken ins Umland prüfen wir die Verfügbarkeit auf Anfrage.</p>${areaPageLink}</div>
  ${districtList}
</div></section>
<section class="section pale" id="kosten"><div class="wrap split"><div>${intro('Kosten und Verordnung','Was sollten Sie vorher klären?','Fragen Sie Ihre Krankenkasse oder den zuständigen Kostenträger vor der Fahrt, welche Voraussetzungen für eine mögliche Kostenübernahme gelten.')}${link(gBa, 'Informationen des Gemeinsamen Bundesausschusses', 'text-link')}</div><div class="note">${icon('shield')}<h3>Vorbereitung für Ihren Anruf</h3><p>Halten Sie Termin, Abholort und Ziel bereit. Fragen Sie Ihre Kasse, ob eine Verordnung oder eine Genehmigung erforderlich ist.</p></div></div></section>
<section class="section wrap home-faq" aria-labelledby="home-faq-title">
  <header class="section-title"><h2 id="home-faq-title">Häufige Fragen zur Krankenfahrt</h2><p>Antworten rund um Anfrage, Abholung und Kostenübernahme.</p></header>
  <div class="home-faq-layout">
    <aside class="faq-contact">${icon('help')}<h3>Haben Sie noch Fragen?</h3><p>Schreiben Sie uns, wenn Sie Fragen zu Ihrer Fahrt haben.</p>${link(mail, 'E-Mail schreiben', 'button secondary')}</aside>
    <div>${answers(faq, true)}${link('/faq/', 'Alle Fragen ansehen', 'text-link')}</div>
  </div>
</section>
<section class="home-booking-banner" aria-labelledby="home-booking-title">
  <figure><img src="/assets/home-booking.jpg" width="1680" height="600" alt="Zwei Frauen stehen neben einem Personenwagen" loading="lazy" decoding="async"></figure>
  <div class="home-booking-copy">
    <p class="eyebrow">${icon('pin')} Köln und Umgebung</p>
    <h2 id="home-booking-title">Planen Sie Ihre nächste Krankenfahrt</h2>
    <p>Teilen Sie uns Ihren Termin, den Abholort und Ihr Ziel mit.</p>
    ${link('#schnellanfrage', 'Fahrt anfragen', 'button')}
  </div>
</section>`;

function servicePage(item) {
  const related = routes.filter(service => service !== item);
  return crumbs(item.title) + pageHero(item.title, item.intro) + `<section class="section wrap split"><div><h2>Für wen kommt die Fahrt infrage?</h2><p>${item.audience}</p><h2> Ihren Termin vorbereiten</h2><p>${item.detail}</p><h2>Abholung und Rückfahrt</h2><p>${item.returnTrip}</p></div>${servicePhoto(item)}</section>
  <section class="section pale"><div class="wrap">${intro('Buchung','Fahrt im Raum Köln abstimmen','Teilen Sie uns Ihren Startpunkt und die vollständige Zieladresse in Köln oder Umgebung mit. Wir klären die Strecke bei Ihrer Anfrage.')}${steps}</div></section>
  <section class="section wrap narrow"><h2>Häufige Fragen</h2>${answers([[item.question, item.answer], faq[2], faq.at(-1)])}${link('/faq/', 'Weitere Fragen zur Fahrt', 'text-link')}</section>
  ${related.length ? `<section class="section pale"><div class="wrap"><h2>Weitere Fahrten</h2>${cards(related.slice(0, 3))}</div></section>` : `<section class="wrap related"><h2>Weitere Informationen</h2>${link('/#kosten', 'Kosten und Verordnung', 'text-link')}</section>`}${cta}`;
}

const contact = crumbs('Kontakt') + pageHero('Fahrt anfragen', 'Für eine Anfrage genügen zunächst der Fahrttermin, die Strecke und eine Rückrufnummer.') + `
<section class="section wrap split contact" id="anfrage"><div><h2>Direkt Kontakt aufnehmen</h2><p>${phone(site.phone, 'button')}</p><p>${link(mail, site.email, 'text-link')}</p>${address}</div>
<div class="enquiry"><h2>E-Mail vorbereiten</h2><p>Das Formular öffnet Ihre E-Mail-App. Prüfen und senden Sie die Nachricht dort. Bitte senden Sie keine Diagnosen oder Befunde.</p>
${rideForm('ride-form')}</div></section>`;

const areas = crumbs('Einsatzgebiet') + pageHero('Unser Einsatzgebiet in Köln', 'Fragen Sie eine geplante Krankenfahrt zu einer Praxis, Klinik oder Behandlungseinrichtung im Raum Köln an.') + `
<section class="section wrap split area-home">
  <div><h2>Die neun Kölner Stadtbezirke</h2><p>Für eine Fahrt innerhalb Kölns nennen Sie bitte den Stadtteil oder die Postleitzahl und bei Kliniken den genauen Eingang.</p>${districtList}</div>
  ${photo()}
</section>
<section class="section pale"><div class="wrap split">
  <div><h2>Fahrten ins Kölner Umland</h2><p>Liegt Ihr Start oder Ziel außerhalb Kölns, geben Sie bitte beide Orte, die Postleitzahlen und die gewünschte Terminzeit an. Wir prüfen, ob die Strecke zum Termin möglich ist.</p>${request()}</div>
  <div class="note">${icon('route')}<h3>Rückfahrt gleich mit anfragen</h3><p>Nennen Sie die voraussichtliche Endzeit oder besprechen Sie, wie wir uns bei einer Änderung erreichen.</p>${link('/krankenfahrten-koeln/', 'Mehr über Krankenfahrten', 'text-link')}</div>
</div></section>` + cta;

const pages = [
  ['', 'Krankenfahrdienst Köln | Geplante Krankenfahrten', 'Krankenfahrdienst für geplante medizinische Termine in Köln und Umgebung. Fahrt, Abholung und Rückfahrt direkt telefonisch oder per E-Mail anfragen.', homepage],
  ...routes.map(item => [item.slug, item.title + ' | Krankenfahrdienst', item.intro, servicePage(item)]),
  ['ueber-uns', 'Über uns | Krankenfahrdienst Köln', 'Ihr Ansprechpartner für geplante Krankenfahrten in Köln und Umgebung.', crumbs('Über uns') + pageHero('Ihr Krankenfahrdienst in Köln','Wir organisieren geplante Personenfahrten zu medizinischen Terminen im Raum Köln.') + `<section class="section wrap split">${photo()}<div><h2>Persönlich erreichbar</h2><p>Teilen Sie uns mit, wann Sie am Ziel sein möchten und wo wir Sie abholen sollen. Angehörige können die Anfrage ebenfalls übernehmen. Bei Fragen zum Ein- oder Ausstieg besprechen wir vorab, welche Fahrt infrage kommt.</p><h2>Unser Standort</h2>${address}</div></section>${cta}`],
  ['kontakt', 'Fahrt anfragen | Krankenfahrdienst Köln', 'Kontakt zum Krankenfahrdienst in Köln. Fragen Sie eine Fahrt telefonisch oder per E-Mail an.', contact],
  ['einsatzgebiet', 'Einsatzgebiet | Krankenfahrdienst Köln', 'Geplante Krankenfahrten in den Kölner Stadtbezirken. Fragen Sie Fahrten in Köln und ins Umland mit Ihrer konkreten Strecke an.', areas],
  ['faq', 'Häufige Fragen | Krankenfahrdienst Köln', 'Antworten zu Anfragen, Abholung, Rückfahrten und möglicher Kostenübernahme in Köln.', crumbs('FAQ') + pageHero('Häufige Fragen','Informationen zu Ihrer Fahrt, zur Anfrage und zur Kostenübernahme.') + `<section class="section wrap narrow">${answers(faq)}<p>${link(gBa,'Informationen zur Krankenbeförderung beim Gemeinsamen Bundesausschuss','text-link')}</p></section>${cta}`],
  ['impressum', 'Impressum | Krankenfahrdienst Köln', 'Anschrift und Kontakt des Krankenfahrdienstes in Köln.', crumbs('Impressum') + pageHero('Impressum','Anschrift und Kontakt') + `<section class="section wrap narrow"><h2>${site.name}</h2>${address}<p>${link(call,site.phone)}<br>${link(mail,site.email)}</p><p>Die vollständigen Anbieterangaben werden vor Veröffentlichung ergänzt.</p><h2>Bildnachweis</h2><p>Die KI-generierten Symbolfotos zeigen beispielhafte Fahrsituationen.</p></section>`],
  ['datenschutz', 'Datenschutz | Krankenfahrdienst Köln', 'Informationen zur Kontaktaufnahme und zum Anfrageformular.', crumbs('Datenschutz') + pageHero('Datenschutz','Informationen zur Kontaktaufnahme') + `<section class="section wrap narrow"><h2>Anfragen per E-Mail</h2><p>Das Anfrageformular bereitet eine Nachricht in Ihrem E-Mail-Programm vor. Die Website überträgt die Formularfelder dabei an keinen Server. Erst wenn Sie die Nachricht in Ihrer E-Mail-App versenden, erhält der Fahrdienst die Angaben.</p><h2>Telefonischer Kontakt</h2><p>Bei einem Anruf können Sie Abholort, Ziel und Termin direkt besprechen. Bitte beschränken Sie Ihre Angaben auf die Fahrtplanung.</p><h2>Kontakt</h2><p>${link(mail,site.email)}</p><p>Die vollständigen Datenschutzhinweise werden vor Veröffentlichung ergänzt.</p></section>`],
];

const nav = [['/', 'Startseite'], ['/#leistungen', 'Leistungen'], ['/einsatzgebiet/', 'Einsatzgebiet'], ['/ueber-uns/', 'Über uns'], ['/faq/', 'FAQ'], ['/kontakt/', 'Kontakt']];
const themeButton = `<button class="theme-toggle" type="button" aria-label="Dunkles Design" aria-pressed="false" title="Dunkles Design" hidden><span class="theme-moon">${icon('moon')}</span><span class="theme-sun">${icon('sun')}</span></button>`;
const restoreTheme = '<script>try { if (localStorage.getItem("ride-theme") === "dark") document.documentElement.dataset.theme = "dark"; } catch {}</script>';
const languageMenu = `<details class="language-menu" hidden translate="no">
<summary>${icon('globe')}<span>Sprache</span></summary>
<div class="language-options">
${[['de','Deutsch'],['en','English'],['tr','Türkçe'],['ar','العربية'],['ru','Русский']].map(([code,name]) => `<button type="button" data-language="${code}" lang="${code}" aria-pressed="${code === 'de'}">${name}</button>`).join('')}
<p class="language-status" role="status"></p>
</div></details>`;
function navItem([href, label], path) {
  if (href === '/#leistungen') {
    return `<details class="service-menu"><summary>${label}</summary><ul class="service-links"><li class="service-links-overview">${link(href, 'Alle Leistungen')}</li>${routes.map(item => {
      const route = `/${item.slug}/`;
      return `<li><a class="service-menu-card" href="${route}"${path === route ? ' aria-current="page"' : ''}><img src="/assets/services/${item.slug}-card.jpg" width="630" height="420" alt="" loading="lazy" decoding="async"><span>${item.title}</span></a></li>`;
    }).join('')}</ul></details>`;
  }
  return `<a href="${href}"${href === path ? ' aria-current="page"' : ''}>${label}</a>`;
}
const brand = '<a class="brand" href="/"><img src="/assets/logo-koeln.png" alt="Krankenfahrdienst Köln – Startseite" width="2120" height="742"></a>';
const footer = `<footer class="footer" id="footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">${brand}<p>Geplante Krankenfahrten in Köln und Umgebung.</p>
      <figure class="footer-photo"><img src="/assets/fahrzeug.jpg" width="1536" height="1024" alt="Personenwagen vor einem Gebäude" loading="lazy" decoding="async"></figure>
    </div>
    <nav aria-label="Leistungen im Fußbereich"><h2>Leistungen</h2>
      ${routes.slice(0, 5).map(item => link('/' + item.slug + '/', item.title)).join('')}
      ${link('/#leistungen', 'Alle Leistungen')}
    </nav>
    <nav aria-label="Informationen im Fußbereich"><h2>Informationen</h2>
      ${link('/ueber-uns/', 'Über uns')}${link('/einsatzgebiet/', 'Einsatzgebiet')}${link('/#kosten', 'Kosten und Verordnung')}${link('/faq/', 'Häufige Fragen')}${link('/kontakt/#anfrage', 'Fahrt anfragen')}
    </nav>
    <div class="footer-contact"><h2>Kontakt</h2>
      ${link(call, icon('phone') + site.phone)}${link(mail, icon('mail') + site.email)}
      <div class="footer-address">${icon('pin')}${address}</div>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>Krankenfahrdienst Köln</span>
    <div>${link('/impressum/', 'Impressum')}${link('/datenschutz/', 'Datenschutz')}</div>
    <span class="footer-credit">Website von ${link(site.footerCreditUrl, 'Techosoft')}</span>
  </div>
</footer>`;
const schema = {
  '@context': 'https://schema.org', '@type': 'LocalBusiness', name: site.name, url: siteUrl, telephone: site.tel, email: site.email,
  areaServed: { '@type': 'City', name: 'Köln' },
  address: { '@type': 'PostalAddress', streetAddress: site.street, postalCode: '50739', addressLocality: 'Köln', addressCountry: 'DE' },
};
function document([slug,title,description,body]) {
  const path = slug ? `/${slug}/` : '/';
  const canonical = new URL(path, siteUrl).href;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}">${indexable ? '' : '<meta name="robots" content="noindex,nofollow">'}<link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}">${restoreTheme}<link rel="stylesheet" href="/assets/style.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><script src="/assets/site.js" defer></script>${slug ? '' : `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}</head>
<body><a class="skip" href="#main">Zum Inhalt springen</a><header class="site-header"><div class="wrap header-inner"><nav id="navigation" aria-label="Hauptnavigation">${nav.map(item => navItem(item, path)).join('')}${request('Fahrt anfragen', 'button mobile-request')}</nav>${brand}<div class="header-tools">${languageMenu}${themeButton}${request('Fahrt anfragen', 'button header-request')}<button class="menu-toggle" aria-expanded="false" aria-controls="navigation" type="button" hidden><span class="menu-label">Menü</span><span class="menu-bars" aria-hidden="true"></span></button></div></div></header>
<main id="main" tabindex="-1">${body}</main>
${floatingContacts}
${footer}</body></html>`;
}

await mkdir(join(out, 'assets'), { recursive: true });
await cp('src/assets', join(out, 'assets'), { recursive: true });
await mkdir(join(out, 'assets', 'services'), { recursive: true });
for (const item of routes) {
  for (const suffix of ['.jpg', '-card.jpg']) {
    const filename = item.slug + suffix;
    await cp(join('src', 'service-images', filename), join(out, 'assets', 'services', filename));
  }
}
for (const item of serviceDrafts.filter(item => !routes.includes(item))) {
  await rm(join(out, item.slug, 'index.html'), { force: true });
  for (const suffix of ['.jpg', '-card.jpg']) {
    await rm(join(out, 'assets', 'services', item.slug + suffix), { force: true });
  }
}
for (const page of pages) {
  const directory = join(out, page[0]);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), document(page));
}
await writeFile(join(out, 'robots.txt'), 'User-agent: *\nDisallow:\n' + (indexable ? 'Sitemap: ' + new URL('sitemap.xml', siteUrl).href + '\n' : ''));
const sitemap = pages.map(([slug]) => `<url><loc>${new URL(slug ? slug + '/' : '', siteUrl)}</loc></url>`).join('');
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap}</urlset>`);
console.log(`Built ${pages.length} pages in ${out}/`);
