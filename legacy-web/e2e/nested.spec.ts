import { test, expect, type Locator, type Page } from '@playwright/test';

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Missing element');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function drag(page: Page, source: Locator, destination: { x: number; y: number }) {
  await source.scrollIntoViewIfNeeded();
  const start = await center(source);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 12 });
  await page.mouse.up();
}
const objects = (page: Page) => page.getByTestId('world-element');
const node = (page: Page, kind: string) =>
  page.locator(`[data-testid="world-element"][data-kind="${kind}"]`);
async function parenthesizedSum(page: Page) {
  await page.goto('/');
  await drag(page, page.getByTestId('tray-2'), { x: 430, y: 330 });
  await drag(page, page.getByTestId('tray-+'), await center(objects(page).first()));
  await drag(page, page.getByTestId('tray-3'), await center(objects(page).first()));
  await page.getByRole('button', { name: '関数', exact: true }).click();
  await drag(page, page.getByTestId('tray-sin'), await center(node(page, 'add')));
  await expect(node(page, 'function')).toHaveCount(1);
  return node(page, 'function');
}
test('select, pull out a number, save its hole, and drop it back', async ({ page }) => {
  const expression = await parenthesizedSum(page);
  const inside = expression.locator('[data-node-path="argument.terms:0"]');
  await inside.click();
  await expect(inside).toHaveAttribute('data-part-selected', 'true');
  await drag(page, inside, { x: 730, y: 380 });
  await expect(objects(page)).toHaveCount(2);
  await expect(expression.locator('[data-hole="true"]')).toHaveCount(1);
  await expect(node(page, 'number')).toHaveAttribute('aria-label', '数式 2');
  await page.reload();
  await expect(node(page, 'function').locator('[data-hole="true"]')).toHaveCount(1);
  const source = await center(node(page, 'number'));
  const slot = await center(node(page, 'function').locator('[data-hole="true"]'));
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(slot.x + 27, slot.y, { steps: 12 });
  await expect(page.locator('.drop-preview')).toContainText('ここに入れる');
  await expect(node(page, 'function').locator('[data-part-target="true"]')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/nested-drop-preview.png', animations: 'disabled' });
  await page.mouse.up();
  await expect(objects(page)).toHaveCount(1);
  await expect(node(page, 'function').locator('[data-hole="true"]')).toHaveCount(0);
  await expect(node(page, 'function')).toHaveAttribute('aria-label', /2 \+3/);
  await page.keyboard.press('Control+z');
  await expect(objects(page)).toHaveCount(2);
  await expect(node(page, 'function').locator('[data-hole="true"]')).toHaveCount(1);
});
test('break apart only the argument using the larger selection buttons', async ({ page }) => {
  const expression = await parenthesizedSum(page);
  await expression.click({ position: { x: 6, y: 6 } });
  await page.getByRole('button', { name: '中身を選択', exact: true }).click();
  await page.getByRole('button', { name: '中身を分解する', exact: true }).click();
  await expect(objects(page)).toHaveCount(4);
  await expect(node(page, 'function')).toHaveAttribute(
    'aria-label',
    '数式 \\sin\\left(\\square\\right)',
  );
  await expect(node(page, 'number')).toHaveCount(2);
  await expect(node(page, 'operator')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(objects(page)).toHaveCount(1);
  await expect(node(page, 'function').locator('[data-hole="true"]')).toHaveCount(0);
});
test('simplify the argument while preserving its function', async ({ page }) => {
  await parenthesizedSum(page);
  await page.getByRole('button', { name: '中身を選択', exact: true }).click();
  await page.getByRole('button', { name: 'この部分を簡約する', exact: true }).click();
  await expect(node(page, 'function')).toHaveAttribute('aria-label', '数式 \\sin\\left(5\\right)');
});
test('Escape during extraction leaves the whole expression untouched', async ({ page }) => {
  const expression = await parenthesizedSum(page);
  const part = expression.locator('[data-node-path="argument.terms:0"]');
  await part.click();
  const start = await center(part);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(730, 370, { steps: 10 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(objects(page)).toHaveCount(1);
  await expect(expression.locator('[data-hole="true"]')).toHaveCount(0);
});
test('a near miss shows the result before committing', async ({ page }) => {
  await page.goto('/');
  await drag(page, page.getByTestId('tray-2'), { x: 450, y: 330 });
  const object = objects(page).first(),
    box = await object.boundingBox();
  if (!box) throw new Error('Missing element');
  const source = await center(page.getByTestId('tray-+'));
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 44, box.y + box.height / 2, { steps: 12 });
  await expect(object).toHaveClass(/magnetic/);
  await expect(page.locator('.drop-preview')).toContainText('離すと確定');
  await page.mouse.up();
  await expect(node(page, 'operator')).toHaveCount(1);
  await expect(objects(page)).toHaveCount(1);
});
test('clicking a tray symbol places it without a drag', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tray-2').click();
  await expect(node(page, 'number')).toHaveCount(1);
  await page.getByTestId('tray-3').click();
  await expect(node(page, 'number')).toHaveCount(2);
});
