import { test, expect, type Locator, type Page } from '@playwright/test';

async function drag(
  page: Page,
  source: Locator,
  destination: { x: number; y: number },
  offset = { x: 0, y: 0 },
) {
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  if (!box) throw new Error('Missing drag source');
  await page.mouse.move(box.x + box.width / 2 + offset.x, box.y + box.height / 2 + offset.y);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await page.mouse.up();
}
async function center(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('Missing element');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function trayTo(page: Page, key: string, object: Locator) {
  await drag(page, page.getByTestId(`tray-${key}`), await center(object));
}
const objects = (page: Page) => page.getByTestId('world-element');
const node = (page: Page, kind: string) =>
  page.locator(`[data-testid="world-element"][data-kind="${kind}"]`);
async function challenge(page: Page, id: number) {
  await page.getByRole('button', { name: /^Challenges/ }).click();
  await page.getByRole('button', { name: `Challenge ${id}`, exact: true }).click();
}

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page)).toEqual([]);
});

test('first-run tutorial: drag, combine, simplify, undo, redo and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByText('2 を、ここへドラッグ。')).toBeVisible();
  await drag(page, page.getByTestId('tray-2'), { x: 470, y: 325 });
  await expect(objects(page)).toHaveCount(1);
  await trayTo(page, '+', objects(page).first());
  await expect(node(page, 'operator')).toHaveCount(1);
  await trayTo(page, '3', objects(page).first());
  await expect(node(page, 'add')).toHaveCount(1);
  await expect(page.getByText('A SMALL BEGINNING')).toHaveCount(0);
  await node(page, 'add').dblclick();
  await expect(node(page, 'number')).toHaveAttribute('aria-label', '数式 5');
  await page.keyboard.press('Control+z');
  await expect(node(page, 'add')).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z');
  await expect(node(page, 'number')).toHaveAttribute('aria-label', '数式 5');
  await page.reload();
  await expect(node(page, 'number')).toHaveAttribute('aria-label', '数式 5');
  await expect(page.getByText('A SMALL BEGINNING')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('moving maintains pointer offset, Escape cancels, clear is undoable', async ({ page }) => {
  await drag(page, page.getByTestId('tray-x'), { x: 400, y: 340 });
  const before = await center(objects(page).first());
  await drag(
    page,
    objects(page).first(),
    { x: before.x + 142, y: before.y + 76 },
    { x: 12, y: -4 },
  );
  const after = await center(objects(page).first());
  expect(after.x - before.x).toBeCloseTo(130, 0);
  expect(after.y - before.y).toBeCloseTo(80, 0);
  await page.mouse.move(after.x, after.y);
  await page.mouse.down();
  await page.mouse.move(200, 280);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await center(objects(page).first())).x).toBeCloseTo(after.x, 0);
  await page.getByRole('button', { name: 'すべて消去' }).click();
  await expect(objects(page)).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(objects(page)).toHaveCount(1);
});

test('invalid divide by zero does not consume either element', async ({ page }) => {
  await drag(page, page.getByTestId('tray-6'), { x: 450, y: 335 });
  await trayTo(page, '÷', objects(page).first());
  await trayTo(page, '0', objects(page).first());
  await expect(objects(page)).toHaveCount(2);
  await expect(node(page, 'operator')).toHaveCount(1);
  const a = await center(objects(page).nth(0)),
    b = await center(objects(page).nth(1));
  expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(55);
});

test('power exponent can be selected, and expression can be broken apart', async ({ page }) => {
  await challenge(page, 7);
  await page.getByRole('button', { name: '指数を選択', exact: true }).click();
  await expect(page.getByTestId('inspector').getByText('EXPONENT')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: '指数', exact: true })).toHaveValue('2');
  await node(page, 'power').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '分解 / Break apart' }).click();
  await expect(objects(page)).toHaveCount(3);
  await expect(node(page, 'variable')).toHaveCount(2);
});

for (const id of [1, 2, 3, 4, 6]) {
  test(`challenge ${id}: solve using actual pointer gestures`, async ({ page }) => {
    await challenge(page, id);
    await trayTo(page, '+', objects(page).first());
    await drag(page, objects(page).nth(1), await center(objects(page).first()));
    if (id !== 1) await node(page, 'add').dblclick();
    if (id === 6) {
      await expect(node(page, 'divide')).toHaveClass(/reacting/);
      await expect(node(page, 'divide').locator('annotation')).toContainText('\\frac{3}{6}');
    }
    await expect(page.getByText('発見しました')).toBeVisible();
  });
}

test('challenge 5: equation displays the operation on both sides', async ({ page }) => {
  await challenge(page, 5);
  await node(page, 'equation').click();
  await page.getByRole('button', { name: '両辺から 5 を引く' }).click();
  await expect(node(page, 'equation').locator('annotation')).toContainText('20 - 5');
  await page.getByRole('button', { name: '両辺を 3 で割る' }).click();
  await expect(page.getByText('発見しました')).toBeVisible();
  await expect(node(page, 'equation')).not.toHaveClass(/reacting/);
  await expect(node(page, 'equation')).toHaveAttribute('aria-label', '数式 x = 5');
});

for (const [id, key] of [
  [7, 'd/dx'],
  [8, '∫ dx'],
] as const) {
  test(`challenge ${id}: calculus tool transforms the AST`, async ({ page }) => {
    await challenge(page, id);
    await trayTo(page, key, objects(page).first());
    await expect(page.getByText('発見しました')).toBeVisible();
    await expect(objects(page).first()).not.toHaveClass(/reacting/);
    if (id === 8) await expect(objects(page).first()).toHaveAttribute('aria-label', /C/);
  });
}

test('challenge 9: head-to-tail vector addition', async ({ page }) => {
  await challenge(page, 9);
  const first = node(page, 'vector').nth(0),
    second = node(page, 'vector').nth(1);
  const a = await center(first),
    b = await center(second);
  await page.mouse.move(b.x + 14, b.y - 28);
  await page.mouse.down();
  await page.mouse.move(a.x + 3 * 28 + 14, a.y - 28 - 28, { steps: 15 });
  await page.mouse.up();
  await expect(node(page, 'vector')).toHaveCount(1);
  await expect(page.getByText('発見しました')).toBeVisible();
});

test('editable matrix transforms a coordinate grid through dragging', async ({ page }) => {
  await page.getByRole('button', { name: '実験を開く' }).click();
  await page.getByRole('button', { name: '矢印と空間' }).click();
  await node(page, 'matrix').click();
  await page.getByRole('spinbutton', { name: '行列 1,1' }).fill('3');
  await page.getByRole('spinbutton', { name: '行列 1,1' }).press('Enter');
  await drag(page, node(page, 'matrix'), await center(page.getByTestId('coordinate-grid')));
  await expect(node(page, 'matrix')).toHaveCount(0);
  await expect(page.locator('.transformed-grid')).toHaveAttribute(
    'style',
    /matrix\(3, 0, 0, 1, 0, 0\)/,
  );
});

test('challenge 10: launch a projectile and reach the physical target', async ({ page }) => {
  await challenge(page, 10);
  await objects(page).first().click();
  await page.getByRole('spinbutton', { name: '初速', exact: true }).fill('20');
  await page.getByRole('spinbutton', { name: '初速', exact: true }).press('Enter');
  await page.getByRole('button', { name: '再生', exact: true }).click();
  await expect(page.getByText('発見しました')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('live-values')).toContainText('40.775');
  await expect(page.locator('.trajectory')).toHaveAttribute('points', /,/);
});

test('corrupted persistence boots; tablet touch drag works', async ({ page, context }) => {
  await page.evaluate(() => localStorage.setItem('math-elements:v1', '{broken'));
  await page.reload();
  await expect(page.getByText('A SMALL BEGINNING')).toBeVisible();
  await page.setViewportSize({ width: 820, height: 1180 });
  const source = await center(page.getByTestId('tray-2'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: source.x, y: source.y }],
  });
  for (let i = 1; i <= 12; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: source.x + ((330 - source.x) * i) / 12, y: source.y + ((410 - source.y) * i) / 12 },
      ],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(node(page, 'number')).toHaveCount(1);
  await expect(node(page, 'number')).toHaveAttribute('aria-label', '数式 2');
});

test('desktop and mobile layouts fit the viewport without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.screenshot({ path: 'test-results/sandbox-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('tray-2')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/sandbox-mobile.png', animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('vector endpoints change components with correct coordinates', async ({ page }) => {
  await challenge(page, 9);
  const origin = await center(node(page, 'vector').first());
  await page.mouse.click(origin.x + 42, origin.y - 14);
  const end = page.getByTestId('vector-end');
  const tip = await center(end);
  await drag(page, end, { x: tip.x + 28, y: tip.y - 28 });
  await expect(page.getByRole('spinbutton', { name: 'x component' })).toHaveValue('4');
  await expect(page.getByRole('spinbutton', { name: 'y component' })).toHaveValue('2');
  const start = page.getByTestId('vector-start');
  const tail = await center(start);
  await drag(page, start, { x: tail.x - 28, y: tail.y });
  await expect(page.getByRole('spinbutton', { name: 'x component' })).toHaveValue('5');
});

test('force dragged onto a body produces acceleration and live motion', async ({ page }) => {
  await page.getByRole('button', { name: 'Physics', exact: true }).click();
  await drag(page, page.getByTestId('tray-mass'), { x: 400, y: 400 });
  await trayTo(page, 'force', objects(page).first());
  await expect(objects(page)).toHaveCount(1);
  await expect(page.getByRole('spinbutton', { name: '力 Fx', exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: '再生', exact: true }).click();
  await expect.poll(async () => (await center(objects(page).first())).x).toBeGreaterThan(410);
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await expect(page.getByTestId('live-values')).toContainText('5 / 0');
  await expect(page.locator('.inspector-equation annotation')).toHaveText('\\vec{F}=m\\vec{a}');
  await page.screenshot({ path: 'test-results/physics-desktop.png', animations: 'disabled' });
});

test('populated algebra and help render valid notation', async ({ page }) => {
  await page.getByRole('button', { name: '実験を開く' }).click();
  await page.getByRole('button', { name: 'つり合いを動かす' }).click();
  await node(page, 'equation').click();
  await page.screenshot({ path: 'test-results/equation-desktop.png', animations: 'disabled' });
  await page.getByRole('button', { name: '遊び方', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.katex-error')).toHaveCount(0);
  await expect(page.getByRole('dialog').locator('.help-example annotation')).toContainText(
    '\\longrightarrow',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
