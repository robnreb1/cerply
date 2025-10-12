#!/usr/bin/env node

/**
 * Lighthouse CI script for marketing site
 * Validates Performance, Accessibility, and SEO scores
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const TARGET_URL = process.env.SITE_URL || 'http://localhost:3002';
const MIN_PERFORMANCE = 95;
const MIN_ACCESSIBILITY = 95;
const MIN_SEO = 95;

async function runLighthouse() {
  console.log(`🔍 Running Lighthouse on ${TARGET_URL}\n`);

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'seo'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(TARGET_URL, options);
    const { categories } = runnerResult.lhr;

    const performance = Math.round(categories.performance.score * 100);
    const accessibility = Math.round(categories.accessibility.score * 100);
    const seo = Math.round(categories.seo.score * 100);

    console.log('📊 Lighthouse Results:');
    console.log(`   Performance:   ${performance}/100 (min: ${MIN_PERFORMANCE})`);
    console.log(`   Accessibility: ${accessibility}/100 (min: ${MIN_ACCESSIBILITY})`);
    console.log(`   SEO:           ${seo}/100 (min: ${MIN_SEO})`);
    console.log('');

    let failed = false;

    if (performance < MIN_PERFORMANCE) {
      console.error(`❌ Performance score ${performance} is below ${MIN_PERFORMANCE}`);
      failed = true;
    } else {
      console.log(`✅ Performance passed`);
    }

    if (accessibility < MIN_ACCESSIBILITY) {
      console.error(`❌ Accessibility score ${accessibility} is below ${MIN_ACCESSIBILITY}`);
      failed = true;
    } else {
      console.log(`✅ Accessibility passed`);
    }

    if (seo < MIN_SEO) {
      console.error(`❌ SEO score ${seo} is below ${MIN_SEO}`);
      failed = true;
    } else {
      console.log(`✅ SEO passed`);
    }

    console.log('');

    if (failed) {
      console.error('❌ Lighthouse validation failed');
      await chrome.kill();
      process.exit(1);
    } else {
      console.log('🎉 All Lighthouse checks passed!');
      await chrome.kill();
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running Lighthouse:', error);
    await chrome.kill();
    process.exit(1);
  }
}

runLighthouse();

