/** Site-wide settings. Edit these to personalise the desktop. */
export const config = {
  /** Shown as the mail recipient, in the bio and in About dialogs. */
  ownerName: 'Luquas95',
  /** The vertical banner in the Start menu and the boot screen: <bold><light>. */
  brand: { bold: 'Kompas', light: '95' },
  githubUrl: 'https://github.com/Luquas95',
  /** Address shown in Internet Explorer for the bio page. */
  homepageAddress: 'http://luquas95.github.io/bio.htm',
  /** Where "Shut Down" sends the visitor. */
  shutdownRedirect: 'https://duckduckgo.com/',
  /** Milliseconds the "It's now safe to turn off your computer" screen stays up. */
  shutdownRedirectDelay: 3500,
  /**
   * Web3Forms access key. Provide it at build time as VITE_WEB3FORMS_KEY
   * (see .env.example and the deploy workflow).
   */
  web3formsKey: (import.meta.env.VITE_WEB3FORMS_KEY as string | undefined) ?? '',
} as const;
