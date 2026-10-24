import { expect, test } from '@playwright/test';

test('login, series switching, manuscript, aliases, assets, and settings', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@lorelight.local');
  await page.getByLabel('Password').fill('Lorelight2024!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/series$/);
  await expect(page.getByRole('heading', { name: 'Children of Glass' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Imported Smoke/ })).toBeVisible();

  await page.getByRole('button', { name: /Children of Glass/ }).click();
  await expect(page).toHaveURL(/\/overview$/);

  const seriesPath = new URL(page.url()).pathname.replace(/\/overview$/, '');

  await page.goto(`${seriesPath}/reader`);
  await expect(page.getByRole('heading', { name: 'The Relay Room' })).toBeVisible();
  await expect(page.getByText('Signal wakes')).toBeVisible();
  await expect(page.getByText('Unknown voice')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Glass Memory' })).toBeVisible();
  await page.getByRole('button', { name: /Signal wakes/ }).click();
  await expect(page).toHaveURL(/\/clips\/.+/);
  await expect(page.getByText('Clip details')).toBeVisible();

  await page.goto(`${seriesPath}/characters`);
  await expect(page.getByText('mara-vey-mv01')).toBeVisible();
  await expect(page.getByText('cael-orin-co01')).toBeVisible();

  await page.goto(`${seriesPath}/assets`);
  await expect(page.getByRole('link', { name: 'Download' })).toBeVisible();

  await page.goto(`${seriesPath}/settings`);
  await expect(page.getByRole('heading', { name: 'AI Providers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add provider' })).toBeVisible();
});
