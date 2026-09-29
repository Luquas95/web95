import { expect, test, type Page } from '@playwright/test';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 640;

async function openIcon(page: Page, id: string) {
  const icon = page.locator(`.desktop-icon[data-id="${id}"]`);
  if (isMobile(page)) await icon.tap();
  else await icon.dblclick();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?boot=0&welcome=0&lang=en');
  await expect(page.locator('#taskbar')).toBeVisible();
});

test('desktop shows the three icons and the taskbar', async ({ page }) => {
  await expect(page.locator('.desktop-icon')).toHaveCount(3);
  await expect(page.locator('.desktop-icon-label')).toHaveText(['My Computer', 'Outlook Express', 'Internet Explorer']);
  await expect(page.locator('.start-button')).toHaveText('Start');
  await expect(page.locator('.tray-clock')).toHaveText(/\d{1,2}:\d{2}/);
});

test('My Computer opens an empty folder with a taskbar button', async ({ page }) => {
  await openIcon(page, 'my-computer');
  const win = page.locator('.window[data-key="my-computer"]');
  await expect(win).toBeVisible();
  await expect(win.locator('.title-text')).toHaveText('My Computer');
  await expect(win.locator('.statusbar')).toContainText('0 object(s)');
  await expect(page.locator('.task-button[data-key="my-computer"]')).toHaveClass(/pressed/);
});

test('windows minimize, restore, maximize and close', async ({ page }) => {
  test.skip(isMobile(page), 'windows start maximized on phones');
  await openIcon(page, 'ie');
  const win = page.locator('.window[data-key="ie"]');
  await expect(win.locator('.title-text')).toHaveText('Luquas95 - Internet Explorer');
  await win.locator('.title-min').click();
  await expect(win).toBeHidden();
  await page.locator('.task-button[data-key="ie"]').click();
  await expect(win).toBeVisible();
  await win.locator('.title-max').click();
  await expect(win).toHaveClass(/maximized/);
  await win.locator('.titlebar').dblclick();
  await expect(win).not.toHaveClass(/maximized/);
  await win.locator('.title-close').click();
  await expect(win).toHaveCount(0);
  await expect(page.locator('.task-button')).toHaveCount(0);
});

test('windows can be dragged by the title bar', async ({ page }) => {
  test.skip(isMobile(page), 'windows start maximized on phones');
  await openIcon(page, 'my-computer');
  const win = page.locator('.window[data-key="my-computer"]');
  const before = (await win.boundingBox())!;
  const title = (await win.locator('.title-text').boundingBox())!;
  await page.mouse.move(title.x + 20, title.y + 5);
  await page.mouse.down();
  await page.mouse.move(title.x + 120, title.y + 85, { steps: 5 });
  await expect(page.locator('.drag-outline')).toBeVisible();
  await page.mouse.up();
  const after = (await win.boundingBox())!;
  expect(Math.round(after.x - before.x)).toBe(100);
  expect(Math.round(after.y - before.y)).toBe(80);
});

test('Internet Explorer shows the bio and can navigate', async ({ page }) => {
  await openIcon(page, 'ie');
  const win = page.locator('.window[data-key="ie"]');
  await expect(win.locator('.bio-page h1')).toHaveText('Luquas95');
  await expect(win.locator('.ie-status-text')).toHaveText('Done');
  await win.locator('.ie-address').fill('nowhere');
  await win.locator('.ie-address').press('Enter');
  await expect(win.locator('.ie-message h1')).toHaveText('The page cannot be displayed');
  await win.locator('[data-id="ie-back"]').click();
  await expect(win.locator('.bio-page')).toBeVisible();
});

test('Start menu is complete and GitHub opens a new tab', async ({ page, context }) => {
  await page.locator('.start-button').click();
  const labels = page.locator('.menu-start > .menu-list > .menu-item .menu-label');
  await expect(labels).toHaveText(['Programs', 'Documents', 'Settings', 'Help', 'Find', 'GitHub', 'Shut Down...']);
  await context.route('https://github.com/**', (route) => route.fulfill({ body: 'github' }));
  const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-id="start-github"]').click()]);
  expect(popup.url()).toBe('https://github.com/Luquas95');
});

test('Find lists everything on the computer', async ({ page }) => {
  await page.keyboard.press('Control+Escape');
  await page.locator('[data-id="start-find"]').click();
  await page.locator('[data-id="find-files"]').click();
  const win = page.locator('.window[data-key="find"]');
  await win.locator('.find-named').fill('*.htm');
  await win.locator('[data-id="find-now"]').click();
  await expect(win.locator('.statusbar')).toContainText('1 file(s) found');
  await expect(win.locator('tbody tr')).toHaveText([/bio\.htm/]);
  await expect(win.locator('.title-text')).toHaveText('Find: Files named *.htm');
});

test('Outlook Express validates and reports an unconfigured mail server', async ({ page }) => {
  await openIcon(page, 'outlook');
  const oe = page.locator('.window[data-key="outlook"]');
  await expect(oe.locator('.oe-message-text')).toContainText('Hi there!');
  await oe.locator('[data-id="oe-compose"]').click();
  const compose = page.locator('.compose-window');
  await compose.locator('[data-id="compose-send"]').click();
  await expect(page.locator('.msgbox-text')).toContainText('valid e-mail address');
  await page.locator('[data-id="msg-ok"]').click();
  await compose.locator('.oe-from').fill('visitor@example.com');
  await compose.locator('.oe-subject').fill('Hello');
  await expect(compose.locator('.title-text')).toHaveText('Hello');
  await compose.locator('.oe-body').fill('Nice site!');
  await compose.locator('[data-id="compose-send"]').click();
  await expect(page.locator('.msgbox-text')).toContainText('mail server has not been configured');
});

test('closing an unsent message offers to save it as a draft', async ({ page }) => {
  await openIcon(page, 'outlook');
  await page.locator('[data-id="oe-compose"]').click();
  const compose = page.locator('.compose-window');
  await compose.locator('.oe-body').fill('Draft text');
  await compose.locator('.title-close').click();
  await expect(page.locator('.msgbox-text')).toContainText('save changes');
  await page.locator('[data-id="msg-yes"]').click();
  await expect(compose).toHaveCount(0);
  if (isMobile(page)) await page.locator('.oe-folder-select').selectOption('drafts');
  else await page.locator('[data-folder="drafts"]').click();
  await expect(page.locator('.oe-list tbody tr')).toHaveCount(1);
});

test('language switches to Czech from the tray', async ({ page }) => {
  await openIcon(page, 'my-computer');
  await page.locator('[data-id="tray-lang"]').click();
  await page.locator('[data-id="lang-cs"]').click();
  await expect(page.locator('.desktop-icon-label').first()).toHaveText('Tento počítač');
  await expect(page.locator('.window[data-key="my-computer"] .title-text')).toHaveText('Tento počítač');
  await expect(page.locator('[data-id="tray-lang"]')).toHaveText('CS');
  await page.reload();
  await expect(page.locator('.desktop-icon-label').first()).toHaveText('My Computer'); // ?lang=en wins
});

test('Shut Down shows the safe screen and redirects to DuckDuckGo', async ({ page }) => {
  await page.route('https://duckduckgo.com/**', (route) => route.fulfill({ body: '<title>DuckDuckGo</title>' }));
  await page.locator('.start-button').click();
  await page.locator('[data-id="start-shutdown"]').click();
  await expect(page.locator('.shutdown-dialog')).toBeVisible();
  await page.locator('[data-id="shutdown-yes"]').click();
  await expect(page.locator('.shutdown-safe')).toContainText('safe to turn off', { timeout: 5000 });
  await page.waitForURL('https://duckduckgo.com/', { timeout: 8000 });
});

test('boot screen runs once per session and can be skipped', async ({ page }) => {
  await page.goto('/?welcome=0');
  await expect(page.locator('.bios-screen')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('.bios-screen, .splash-screen')).toHaveCount(0);
  await expect(page.locator('#taskbar')).toBeVisible();
  await page.reload();
  await expect(page.locator('#taskbar')).toBeVisible();
  await expect(page.locator('.bios-screen')).toHaveCount(0);
});

test('windows open maximized on phones', async ({ page }) => {
  test.skip(!isMobile(page), 'phone layout only');
  await openIcon(page, 'outlook');
  await expect(page.locator('.window[data-key="outlook"]')).toHaveClass(/maximized/);
});
