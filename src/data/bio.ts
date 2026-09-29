import type { Localized } from '../core/i18n';

export interface BioSection {
  id: string;
  title: Localized;
  paragraphs?: Localized[];
  list?: Localized[];
}

/**
 * Content of the homepage shown in Internet Explorer.
 * PLACEHOLDER TEXT – replace it with your own story.
 */
export const bio = {
  marquee: {
    en: '*** Welcome to my homepage! *** Thanks for visiting! *** Sign my guestbook in Outlook Express! ***',
    cs: '*** Vítejte na mé domovské stránce! *** Díky za návštěvu! *** Zapište se do návštěvní knihy v Outlook Expressu! ***',
  } satisfies Localized,
  greeting: { en: 'Hi, I’m', cs: 'Ahoj, jsem' } satisfies Localized,
  tagline: {
    en: 'Developer. Tinkerer. Collector of old computers and new ideas.',
    cs: 'Vývojář. Kutil. Sběratel starých počítačů a nových nápadů.',
  } satisfies Localized,
  sections: <BioSection[]>[
    {
      id: 'about',
      title: { en: 'About me', cs: 'O mně' },
      paragraphs: [
        {
          en: 'I build things for the web – from small tools that save someone ten minutes a day to larger applications. I enjoy clean code, fast pages and interfaces that are fun to use.',
          cs: 'Tvořím věci pro web – od malých nástrojů, které někomu ušetří deset minut denně, až po větší aplikace. Baví mě čistý kód, rychlé stránky a rozhraní, která je radost používat.',
        },
        {
          en: 'This site is a little tribute to the computers I grew up with. Poke around, open some windows, and do not forget to shut it down properly!',
          cs: 'Tento web je malou poctou počítačům, na kterých jsem vyrůstal. Porozhlédněte se, pootvírejte pár oken a nezapomeňte počítač pořádně vypnout!',
        },
      ],
    },
    {
      id: 'skills',
      title: { en: 'What I work with', cs: 'S čím pracuji' },
      list: [
        { en: 'HTML, CSS & TypeScript', cs: 'HTML, CSS a TypeScript' },
        { en: 'Front-end frameworks and plain old DOM', cs: 'Front-endové frameworky i obyčejný DOM' },
        { en: 'Back-end services and APIs', cs: 'Back-endové služby a API' },
        { en: 'Linux servers & automation', cs: 'Linuxové servery a automatizace' },
        { en: 'Git, testing and continuous deployment', cs: 'Git, testování a průběžné nasazování' },
      ],
    },
  ],
  projectsTitle: { en: 'My projects', cs: 'Moje projekty' } satisfies Localized,
  projectsText: {
    en: 'Demos of my projects live in My Computer. Have a look!',
    cs: 'Ukázky mých projektů bydlí ve složce Tento počítač. Mrkněte na ně!',
  } satisfies Localized,
  projectsLink: { en: 'Open My Computer', cs: 'Otevřít Tento počítač' } satisfies Localized,
  contactTitle: { en: 'Get in touch', cs: 'Kontakt' } satisfies Localized,
  contactText: {
    en: 'Want to work together or just say hi?',
    cs: 'Chcete spolupracovat, nebo jen pozdravit?',
  } satisfies Localized,
  contactMail: { en: 'Send me an e-mail', cs: 'Pošlete mi e-mail' } satisfies Localized,
  contactGithub: { en: 'Visit my GitHub', cs: 'Navštivte můj GitHub' } satisfies Localized,
  construction: { en: 'This page is under construction!', cs: 'Tato stránka je ve výstavbě!' } satisfies Localized,
  counter: { en: 'Visits from this computer:', cs: 'Návštěv z tohoto počítače:' } satisfies Localized,
  bestViewed: {
    en: 'Best viewed with Internet Explorer 4.0 at 800 × 600',
    cs: 'Nejlépe zobrazíte v Internet Exploreru 4.0 při 800 × 600',
  } satisfies Localized,
};
