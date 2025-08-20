const { chromium } = require('playwright');

(async () => {
  console.log('ブラウザを起動中...');
  
  // ブラウザを起動（ヘッドレスモードをオフにして表示）
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: null  // フルスクリーンで表示
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Next.jsアプリケーションにアクセス中...');
    await page.goto('http://localhost:3001');
    
    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
    
    console.log('アプリケーションが読み込まれました');
    console.log('現在のURL:', page.url());
    
    // ページの基本情報を取得
    const title = await page.title();
    console.log('ページタイトル:', title);
    
    // ページの内容を確認
    const bodyText = await page.locator('body').textContent();
    if (bodyText.includes('ログイン')) {
      console.log('ログインページが表示されています');
    } else if (bodyText.includes('ダッシュボード')) {
      console.log('ダッシュボードページが表示されています');
    } else {
      console.log('不明なページが表示されています');
    }
    
    // ブラウザを30秒間開いたままにして手動確認を可能にする
    console.log('ブラウザを30秒間開いたままにします。手動でアプリケーションを確認してください...');
    console.log('確認できる機能:');
    console.log('- ログインページのUI');
    console.log('- レスポンシブデザイン');
    console.log('- ナビゲーション');
    console.log('- エラーハンドリング（APIが動いていない場合）');
    
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    
    // エラーページのスクリーンショットを撮影
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('エラーのスクリーンショットを保存しました: error-screenshot.png');
    
    // ブラウザを開いたままにしてエラーを確認
    console.log('エラーが発生しましたが、ブラウザを10秒間開いたままにします...');
    await page.waitForTimeout(10000);
  }
  
  await browser.close();
  console.log('ブラウザを閉じました');
})();