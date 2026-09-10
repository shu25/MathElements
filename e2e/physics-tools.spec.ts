import { test, expect, type Page, type Locator } from '@playwright/test';
async function center(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('Missing element');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function drag(page: Page, el: Locator, to: { x: number; y: number }) {
  await el.scrollIntoViewIfNeeded();
  const p = await center(el);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
test('left library, duplicate, rotate, precise move and undo persist', async ({ page }) => {
  await page.goto('/');
  const tray = await page.getByRole('complementary', { name: 'アイテム欄' }).boundingBox();
  const stage = await page.getByTestId('workspace').boundingBox();
  expect(tray!.x + tray!.width).toBe(stage!.x);
  await page.getByTestId('tray-2').click();
  await page.getByRole('button', { name: '複製', exact: true }).click();
  await expect(page.getByTestId('world-element')).toHaveCount(2);
  const beforeRotation = await center(page.locator('.world-element.selected'));
  await page.getByRole('button', { name: '回転 +15°', exact: true }).click();
  const selected = page.locator('.world-element.selected');
  await expect(selected).toHaveCSS('rotate', '-15deg');
  expect((await center(selected)).x).toBeCloseTo(beforeRotation.x, 3);
  expect((await center(selected)).y).toBeCloseTo(beforeRotation.y, 3);
  await page.getByText('位置・回転', { exact: true }).click();
  await page.getByRole('spinbutton', { name: '位置 X', exact: true }).fill('350');
  await page.getByRole('spinbutton', { name: '位置 X', exact: true }).press('Enter');
  expect(await selected.evaluate((el) => (el as HTMLElement).style.left)).toBe('350px');
  await page.reload();
  await expect(page.getByTestId('world-element')).toHaveCount(2);
  await expect(page.getByTestId('world-element').last()).toHaveCSS('rotate', '-15deg');
});
test('move mode places a symbol over another without combining', async ({ page }) => {
  await page.goto('/');
  await drag(page, page.getByTestId('tray-2'), { x: 420, y: 300 });
  await drag(page, page.getByTestId('tray-+'), { x: 680, y: 400 });
  await page.getByRole('button', { name: '移動', exact: true }).click();
  const two = page.locator('[data-kind=number]'),
    plus = page.locator('[data-kind=operator]');
  await drag(page, plus, await center(two));
  await expect(page.getByTestId('world-element')).toHaveCount(2);
  await expect(plus).toHaveAttribute('aria-label', '数式 +');
  expect(Math.abs((await center(plus)).x - (await center(two)).x)).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.move-mode-banner')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  expect(Math.abs((await center(plus)).x - (await center(two)).x)).toBeGreaterThan(100);
});
test('all new physical items apply, survive reload and simulate without errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Physics', exact: true }).click();
  await drag(page, page.getByTestId('tray-mass'), { x: 440, y: 340 });
  const body = page.locator('.is-body');
  for (const key of ['gravity', 'friction', 'drag', 'lift', 'buoyancy', 'wind', 'bounce']) {
    await drag(page, page.getByTestId(`tray-${key}`), await center(body));
    await expect(page.getByTestId('world-element')).toHaveCount(1);
  }
  for (const [label, value] of [
    ['摩擦係数', '0.3'],
    ['抵抗係数', '0.47'],
    ['揚力係数', '0.6'],
    ['水中の体積', '0.002'],
    ['流体密度', '1000'],
    ['風速 X', '5'],
    ['反発係数', '0.7'],
  ]) {
    await expect(page.getByRole('spinbutton', { name: label, exact: true })).toHaveValue(value);
  }
  await page.reload();
  await page.getByRole('button', { name: 'Physics', exact: true }).click();
  await body.click();
  await expect(page.getByRole('spinbutton', { name: '反発係数', exact: true })).toHaveValue('0.7');
  await page.getByRole('button', { name: '再生', exact: true }).click();
  await expect.poll(async () => (await center(body)).x).toBeGreaterThan(445);
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await expect(page.locator('.fluid-force-indicator')).not.toHaveCount(0);
  await page.screenshot({ path: 'test-results/physics-forces.png' });
  expect(errors).toEqual([]);
});
test('mobile left library can scroll to the last physics item', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Physics', exact: true }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'アイテム欄を下へスクロール' }).click();
  await page.getByTestId('tray-distance').click();
  await expect(page.getByTestId('world-element')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
