const { chromium } = require('playwright');

(async () => {
  console.log('フロントエンドアプリケーションのデモを開始します...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500,  // 操作を1.5秒間隔で実行
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: null
  });
  
  const page = await context.newPage();
  
  try {
    // 1. ホームページにアクセス
    console.log('1. ホームページにアクセス...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'demo-01-home.png', fullPage: true });
    
    // 2. ログインページの確認
    console.log('2. ログインページの確認...');
    await page.waitForSelector('form', { timeout: 5000 });
    
    // ログインフォームの要素を確認
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const loginButton = page.locator('button[type="submit"]');
    
    console.log('- メールアドレス入力フィールド:', await emailInput.isVisible());
    console.log('- パスワード入力フィールド:', await passwordInput.isVisible());
    console.log('- ログインボタン:', await loginButton.isVisible());
    
    await page.screenshot({ path: 'demo-02-login.png', fullPage: true });
    
    // 3. ダッシュボードページに直接アクセス（認証なし）
    console.log('3. ダッシュボードページにアクセス（認証チェック）...');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    console.log('リダイレクト後のURL:', page.url());
    await page.screenshot({ path: 'demo-03-dashboard-redirect.png', fullPage: true });
    
    // 4. 問い合わせ一覧ページにアクセス
    console.log('4. 問い合わせ一覧ページにアクセス...');
    await page.goto('http://localhost:3001/inquiries');
    await page.waitForLoadState('networkidle');
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'demo-04-inquiries.png', fullPage: true });
    
    // 5. 問い合わせ作成ページにアクセス
    console.log('5. 問い合わせ作成ページにアクセス...');
    await page.goto('http://localhost:3001/inquiries/new');
    await page.waitForLoadState('networkidle');
    console.log('現在のURL:', page.url());
    await page.screenshot({ path: 'demo-05-new-inquiry.png', fullPage: true });
    
    // 6. レスポンシブデザインのテスト
    console.log('6. レスポンシブデザインのテスト（モバイル表示）...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE サイズ
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'demo-06-mobile-login.png', fullPage: true });
    
    // 7. タブレット表示
    console.log('7. タブレット表示のテスト...');
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad サイズ
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'demo-07-tablet-dashboard.png', fullPage: true });
    
    // 8. デスクトップ表示に戻す
    console.log('8. デスクトップ表示に戻す...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    console.log('\n=== デモ完了 ===');
    console.log('撮影されたスクリーンショット:');
    console.log('- demo-01-home.png: ホームページ');
    console.log('- demo-02-login.png: ログインページ');
    console.log('- demo-03-dashboard-redirect.png: ダッシュボード認証チェック');
    console.log('- demo-04-inquiries.png: 問い合わせ一覧');
    console.log('- demo-05-new-inquiry.png: 問い合わせ作成');
    console.log('- demo-06-mobile-login.png: モバイル表示');
    console.log('- demo-07-tablet-dashboard.png: タブレット表示');
    
    console.log('\nブラウザを10秒間開いたままにします...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    await page.screenshot({ path: 'demo-error.png', fullPage: true });
  }
  
  await browser.close();
  console.log('デモを終了しました');
})();