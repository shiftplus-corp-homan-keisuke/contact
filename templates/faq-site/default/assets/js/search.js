// 検索ページ専用JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeAdvancedSearch();
    loadFAQData();
});

let faqData = [];

/**
 * FAQ データを読み込み
 */
async function loadFAQData() {
    try {
        // 実際の実装では、APIエンドポイントからデータを取得
        // ここでは、ページ内のデータを使用
        const faqItems = document.querySelectorAll('.faq-item');
        faqData = Array.from(faqItems).map(item => {
            const question = item.querySelector('.faq-question h4').textContent;
            const answer = item.querySelector('.answer-content').textContent;
            const category = item.getAttribute('data-category') || 'その他';
            const tags = Array.from(item.querySelectorAll('.tag')).map(tag => tag.textContent);
            
            return {
                id: item.querySelector('.faq-question').getAttribute('data-faq-id'),
                question,
                answer,
                category,
                tags
            };
        });
    } catch (error) {
        console.error('FAQ データの読み込みに失敗しました:', error);
    }
}

/**
 * 高度な検索機能を初期化
 */
function initializeAdvancedSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchButton || !searchResults) return;
    
    // 検索実行
    function performAdvancedSearch() {
        const query = searchInput.value.trim();
        
        if (query === '') {
            showSearchPlaceholder();
            return;
        }
        
        const results = searchFAQsAdvanced(query);
        displaySearchResults(results, query);
    }
    
    // イベントリスナー
    searchButton.addEventListener('click', performAdvancedSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performAdvancedSearch();
        }
    });
    
    // 初期化時にURLパラメータをチェック
    const urlQuery = getSearchQueryFromURL();
    if (urlQuery) {
        searchInput.value = urlQuery;
        performAdvancedSearch();
    }
}

/**
 * 高度なFAQ検索
 */
function searchFAQsAdvanced(query) {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    const results = [];
    
    faqData.forEach(faq => {
        const score = calculateRelevanceScore(faq, searchTerms);
        if (score > 0) {
            results.push({
                ...faq,
                score,
                matchedTerms: getMatchedTerms(faq, searchTerms)
            });
        }
    });
    
    // スコア順でソート
    return results.sort((a, b) => b.score - a.score);
}

/**
 * 関連度スコアを計算
 */
function calculateRelevanceScore(faq, searchTerms) {
    let score = 0;
    const question = faq.question.toLowerCase();
    const answer = faq.answer.toLowerCase();
    const category = faq.category.toLowerCase();
    const tags = faq.tags.map(tag => tag.toLowerCase());
    
    searchTerms.forEach(term => {
        // 質問での一致（高スコア）
        if (question.includes(term)) {
            score += question.indexOf(term) === 0 ? 10 : 5; // 先頭一致はより高スコア
        }
        
        // 回答での一致（中スコア）
        if (answer.includes(term)) {
            score += 3;
        }
        
        // カテゴリでの一致（中スコア）
        if (category.includes(term)) {
            score += 4;
        }
        
        // タグでの一致（中スコア）
        tags.forEach(tag => {
            if (tag.includes(term)) {
                score += 4;
            }
        });
        
        // 完全一致ボーナス
        if (question === term || answer.includes(term)) {
            score += 2;
        }
    });
    
    return score;
}

/**
 * マッチした検索語を取得
 */
function getMatchedTerms(faq, searchTerms) {
    const matched = [];
    const allText = `${faq.question} ${faq.answer} ${faq.category} ${faq.tags.join(' ')}`.toLowerCase();
    
    searchTerms.forEach(term => {
        if (allText.includes(term)) {
            matched.push(term);
        }
    });
    
    return matched;
}

/**
 * 検索結果を表示
 */
function displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-info">
                <p>「${query}」に一致するFAQが見つかりませんでした。</p>
                <div class="search-suggestions">
                    <h4>検索のヒント:</h4>
                    <ul>
                        <li>キーワードを変更してみてください</li>
                        <li>より一般的な用語を使用してみてください</li>
                        <li>スペルを確認してください</li>
                    </ul>
                </div>
            </div>
        `;
        return;
    }
    
    const resultsHTML = `
        <div class="search-info">
            <p>「${query}」の検索結果: ${results.length}件</p>
        </div>
        <div class="search-results-list">
            ${results.map(result => createSearchResultHTML(result, query)).join('')}
        </div>
    `;
    
    searchResults.innerHTML = resultsHTML;
    
    // 結果項目のクリックイベントを追加
    addSearchResultClickEvents();
}

/**
 * 検索結果のHTMLを作成
 */
function createSearchResultHTML(result, query) {
    const highlightedQuestion = highlightText(result.question, query);
    const highlightedAnswer = highlightText(truncateText(result.answer, 200), query);
    
    return `
        <div class="search-result-item" data-faq-id="${result.id}">
            <div class="result-header">
                <h3 class="result-question">${highlightedQuestion}</h3>
                <div class="result-meta">
                    <span class="result-category">${result.category}</span>
                    <span class="result-score">関連度: ${Math.round(result.score * 10)}%</span>
                </div>
            </div>
            <div class="result-answer">
                <p>${highlightedAnswer}</p>
            </div>
            ${result.tags.length > 0 ? `
                <div class="result-tags">
                    ${result.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="result-actions">
                <button class="view-full-answer" data-faq-id="${result.id}">完全な回答を表示</button>
            </div>
        </div>
    `;
}

/**
 * テキストをハイライト
 */
function highlightText(text, query) {
    const terms = query.toLowerCase().split(/\s+/);
    let highlightedText = text;
    
    terms.forEach(term => {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<span class="search-highlight">$1</span>');
    });
    
    return highlightedText;
}

/**
 * テキストを切り詰め
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * 検索結果のクリックイベントを追加
 */
function addSearchResultClickEvents() {
    const viewButtons = document.querySelectorAll('.view-full-answer');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const faqId = this.getAttribute('data-faq-id');
            showFullAnswer(faqId);
        });
    });
}

/**
 * 完全な回答を表示
 */
function showFullAnswer(faqId) {
    const faq = faqData.find(item => item.id === faqId);
    if (!faq) return;
    
    const modal = createAnswerModal(faq);
    document.body.appendChild(modal);
    
    // モーダルを表示
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // 閉じるイベント
    const closeButton = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    [closeButton, overlay].forEach(element => {
        element.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        });
    });
    
    // ESCキーで閉じる
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeButton.click();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

/**
 * 回答モーダルを作成
 */
function createAnswerModal(faq) {
    const modal = document.createElement('div');
    modal.className = 'answer-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>${faq.question}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="answer-content">
                    ${faq.answer.replace(/\n/g, '<br>')}
                </div>
                ${faq.tags.length > 0 ? `
                    <div class="faq-tags">
                        ${faq.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <span class="faq-category">カテゴリ: ${faq.category}</span>
            </div>
        </div>
    `;
    
    return modal;
}

/**
 * 検索プレースホルダーを表示
 */
function showSearchPlaceholder() {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = `
        <div class="search-info">
            <p>検索キーワードを入力してください。</p>
            <div class="search-tips">
                <h4>検索のコツ:</h4>
                <ul>
                    <li>複数のキーワードを組み合わせて検索できます</li>
                    <li>カテゴリ名やタグでも検索できます</li>
                    <li>部分一致でも検索結果に表示されます</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * 正規表現用文字列をエスケープ
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * URLパラメータから検索クエリを取得
 */
function getSearchQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || '';
}

// モーダル用CSS（動的に追加）
const modalStyles = `
    .answer-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .answer-modal.active {
        opacity: 1;
        visibility: visible;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 800px;
        max-height: 80vh;
        width: 90%;
        overflow: hidden;
    }
    
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    
    .modal-header h2 {
        margin: 0;
        color: #2c3e50;
        flex: 1;
        margin-right: 1rem;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-close:hover {
        color: #495057;
    }
    
    .modal-body {
        padding: 1.5rem;
        max-height: 60vh;
        overflow-y: auto;
    }
    
    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e9ecef;
        background-color: #f8f9fa;
    }
    
    .faq-category {
        color: #6c757d;
        font-size: 0.9rem;
    }
    
    .search-result-item {
        background-color: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        transition: box-shadow 0.3s ease;
    }
    
    .search-result-item:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .result-header {
        margin-bottom: 1rem;
    }
    
    .result-question {
        color: #2c3e50;
        margin-bottom: 0.5rem;
        font-size: 1.2rem;
    }
    
    .result-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.9rem;
        color: #6c757d;
    }
    
    .result-category {
        background-color: #e9ecef;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
    }
    
    .result-score {
        font-weight: bold;
    }
    
    .result-answer {
        margin-bottom: 1rem;
        color: #495057;
        line-height: 1.6;
    }
    
    .result-tags {
        margin-bottom: 1rem;
    }
    
    .result-actions {
        text-align: right;
    }
    
    .view-full-answer {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }
    
    .view-full-answer:hover {
        background-color: #0056b3;
    }
    
    .search-tips {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 4px;
    }
    
    .search-tips h4 {
        margin-bottom: 0.5rem;
        color: #495057;
    }
    
    .search-tips ul {
        margin: 0;
        padding-left: 1.5rem;
    }
    
    .search-tips li {
        margin-bottom: 0.25rem;
        color: #6c757d;
    }
    
    .search-suggestions {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #fff3cd;
        border-radius: 4px;
        border-left: 4px solid #ffc107;
    }
    
    .search-suggestions h4 {
        margin-bottom: 0.5rem;
        color: #856404;
    }
    
    .search-suggestions ul {
        margin: 0;
        padding-left: 1.5rem;
    }
    
    .search-suggestions li {
        margin-bottom: 0.25rem;
        color: #856404;
    }
`;

// スタイルを追加
const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);