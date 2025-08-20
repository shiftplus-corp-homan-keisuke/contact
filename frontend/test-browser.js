const { chromium } = require('playwright');

(async () => {
  // ブラウザを起動
  const browser = await chromium.launch({ 
    headless: false,  // ブラウザを表示
    slowMo: 1000      // 操作を1秒間隔で実行
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('フロントエンドアプリケーションにアクセス中...');
    
    // Next.jsアプリケーションにアクセス
    await page.goto('http://localhost:3000');
    
    // ページタイトルを確認
    const title = await page.title();
    console.log('ページタイトル:', title);
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    // ログインページが表示されているか確認
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      console.log('ログインページが表示されています');
      
      // ログインフォームの要素を確認
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const loginButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible()) {
        console.log('メールアドレス入力フィールドが見つかりました');
      }
      if (await passwordInput.isVisible()) {
        console.log('パスワード入力フィールドが見つかりました');
      }
      if (await loginButton.isVisible()) {
        console.log('ログインボタンが見つかりました');
      }
      
      // スクリーンショットを撮影
      await page.screenshot({ path: 'login-page.png', fullPage: true });
      console.log('ログインページのスクリーンショットを保存しました: login-page.png');
    }
    
    // ダッシュボードページに直接アクセスしてみる（認証なしでどうなるか確認）
    console.log('ダッシュボードページにアクセス中...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'dashboard-redirect.png', fullPage: true });
    console.log('ダッシュボードアクセス時のスクリーンショットを保存しました: dashboard-redirect.png');
    
    // 問い合わせ一覧ページにアクセスしてみる
    console.log('問い合わせ一覧ページにアクセス中...');
    await page.goto('http://localhost:3000/inquiries');
    await page.waitForLoadState('networkidle');
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'inquiries-page.png', fullPage: true });
    console.log('問い合わせページのスクリーンショットを保存しました: inquiries-page.png');
    
    console.log('ブラウザを5秒間開いたままにします...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    await page.screenshot({ path: 'error-page.png', fullPage: true });
  }
  
  // ブラウザを閉じる
  await browser.close();
  console.log('ブラウザを閉じました');
})();