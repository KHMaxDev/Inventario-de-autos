import { test, expect } from '@playwright/test';

async function dragToStage(page, card, target = null) {
  await card.scrollIntoViewIfNeeded();
  const start = await card.boundingBox();
  const end = await page.getByTestId('showroom').boundingBox();
  // Start on the image: the complete card, including the PNG, is draggable.
  await page.mouse.move(start.x + 45, start.y + 35);
  await page.mouse.down();
  await page.mouse.move(target?.x ?? end.x + end.width / 2, target?.y ?? end.y + end.height / 2, { steps: 15 });
  await page.mouse.up();
}

test('no automatic or click preview; whole card drag previews and assignment requires confirmation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.hero-vehicle')).toHaveCount(0);
  await expect(page.locator('.card-actions, .drag-handle, .location-tag')).toHaveCount(0);
  const card = page.locator('[data-vehicle]').first();
  const id = await card.getAttribute('data-vehicle');
  await card.click();
  await expect(page.locator('.hero-vehicle')).toHaveCount(0);
  await dragToStage(page, card);
  await expect(page.locator('.hero-vehicle')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('¿Asignar vehículo al proyecto?');
  await expect(page.getByRole('dialog')).toContainText('Proyecto 1');
  await expect(page.locator('[data-assigned]')).toHaveCount(0);
  await expect(page.locator('.stats strong').nth(1)).toHaveText('81');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card).toBeVisible();
  await expect(page.locator('.hero-vehicle')).toBeVisible();
  await dragToStage(page, card);
  await page.getByRole('button', { name: 'Sí, asignar vehículo', exact: true }).click();
  await expect(page.locator(`[data-assigned="${id}"]`)).toBeVisible();
  await expect(page.locator(`[data-vehicle="${id}"]`)).toHaveCount(0);
  await expect(page.locator('.stats strong').nth(1)).toHaveText('80');
  await page.reload();
  await expect(page.locator(`[data-assigned="${id}"]`)).toBeVisible();
  await page.getByRole('button', { name: 'Proyecto 2, 0 vehículos', exact: true }).click();
  await expect(page.locator('.hero-vehicle')).toHaveCount(0);
  await page.getByRole('button', { name: 'Proyecto 1, 1 vehículos', exact: true }).click();
  const remove = page.locator(`[data-assigned="${id}"]`).getByRole('button', { name: /Retirar/ });
  await expect(remove).toHaveClass(/remove-assignment/);
  await remove.click();
  await expect(page.getByRole('dialog')).toContainText('¿Retirar vehículo del proyecto?');
  await page.keyboard.press('Escape');
  await expect(page.locator(`[data-assigned="${id}"]`)).toBeVisible();
  await remove.click();
  await page.getByRole('button', { name: 'Sí, retirar vehículo', exact: true }).click();
  await expect(page.locator('[data-assigned]')).toHaveCount(0);
  await expect(page.locator('.stats strong').nth(1)).toHaveText('81');
  await expect(card).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-assigned]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [plate, reason] of [['USF282R', 'estado malo'], ['USF283R', 'en mantenimiento'], ['URZ982K', 'para baja por enajenación']]) {
  test(`blocks assignment of ${plate}, keeps its preview and inventory count`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Buscar vehículo').fill(plate);
    const card = page.getByRole('button', { name: `Arrastrar ${plate}`, exact: true });
    await dragToStage(page, card);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('No se puede asignar este vehículo');
    await expect(dialog).toContainText(reason);
    await expect(dialog.getByRole('button', { name: 'Sí, asignar vehículo' })).toHaveCount(0);
    await expect(page.locator('[data-assigned]')).toHaveCount(0);
    await expect(page.locator('.stats strong').nth(1)).toHaveText('81');
    if (plate === 'USF283R') await page.screenshot({ path: 'test-results/assignment-warning.png', fullPage: true });
    await page.getByRole('button', { name: 'Entendido' }).click();
    await expect(page.locator('.hero-vehicle')).toHaveAttribute('alt', new RegExp(plate));
    await expect(card).toBeVisible();
    await page.getByRole('button', { name: /Más información/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Sin asignar');
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('.stats strong').nth(2)).toHaveText('0');
  });
}

test('drop outside only previews; keyboard drag can cancel or request confirmation', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-vehicle]').first();
  await dragToStage(page, card, { x: 500, y: 35 });
  await expect(page.locator('.hero-vehicle')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.floating-card')).toHaveCount(0);
  await card.focus();
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.floating-card')).toHaveCount(0);
  await card.focus();
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('showroom')).toHaveClass(/is-over/);
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toContainText('¿Asignar vehículo al proyecto?');
  await page.getByRole('button', { name: 'Sí, asignar vehículo' }).click();
  await expect(page.locator('[data-assigned]')).toHaveCount(1);
});

test('mobile supports keyboard preview, reduced motion, projects, filters and detail dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click();
  await page.getByLabel('Nombre del proyecto').fill('Operación regional');
  await page.getByRole('button', { name: 'Crear proyecto' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operación regional');
  await page.getByLabel('Estado', { exact: true }).selectOption('BUENO');
  await expect(page.locator('[data-vehicle]')).toHaveCount(14);
  await page.getByLabel('Buscar vehículo').fill('USF302R');
  const card = page.getByRole('button', { name: 'Arrastrar USF302R', exact: true });
  await card.focus();
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.floating-card')).toHaveCount(0);
  await expect(page.locator('.hero-vehicle')).toBeVisible();
  await page.getByRole('button', { name: /Más información/ }).click();
  await expect(page.getByRole('dialog')).toContainText('USF302R');
  await page.getByRole('button', { name: 'Cerrar información' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('scene settings, complete details, pause and compact projects still work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Cambiar fondo' }).click();
  await page.getByRole('button', { name: 'Valle', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('showroom')).toHaveAttribute('data-scene', 'bg-3');
  await expect(page.locator('.hero-vehicle')).toHaveCount(0);
  await page.getByRole('button', { name: 'Proyecto 2, 0 vehículos', exact: true }).click();
  await expect(page.getByTestId('showroom')).toHaveAttribute('data-scene', 'bg-5');
  await page.getByRole('button', { name: 'Compactar proyectos' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/);
  await dragToStage(page, page.locator('[data-vehicle]').first());
  await page.screenshot({ path: 'test-results/assignment-confirmation.png', fullPage: true });
  await page.getByRole('button', { name: 'Sí, asignar vehículo' }).click();
  await page.getByRole('button', { name: 'Pausar movimiento' }).click();
  const transform = await page.locator('.scene-world').evaluate((element) => getComputedStyle(element).transform);
  await page.mouse.move(500, 420);
  await page.waitForTimeout(300);
  expect(await page.locator('.scene-world').evaluate((element) => getComputedStyle(element).transform)).toBe(transform);
  await expect(page.locator('.pending-card')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Más información/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Número de serie');
  await expect(page.getByRole('dialog')).toContainText('Proyecto 2');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ver detalles del proyecto' }).click();
  await expect(page.getByRole('dialog')).toContainText('Unidades del proyecto');
});
