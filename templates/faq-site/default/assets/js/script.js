// FAQ サイトのメインJavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeFAQToggle();
    initializeCategoryFilter();
    initializeSearch();
});

/**
 * FAQ の開閉機能を初期化
 */
function initializeFAQToggle() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqId = this.getAttribute('data-faq-id');
            const answer = document.getElementById(`answer-${faqId}`);
            const toggleIcon = this.querySelector('.toggle-icon');
            
            if (answer.classList.contains('active')) {
                // 閉じる
                answer.classList.remove('active');
                this.classList.remove('active');
                toggleIcon.textContent = '+';
            } else {
                // 開く
                answer.classList.add('active');
                this.classList.add('active');
                toggleIcon.textContent = '−';
            }
        });
    });
}

/**
 * カテゴリフィルター機能を初期化
 */
function initializeCategoryFilter() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    const faqItems = document.querySelectorAll('.faq-item');
    const categorySections = document.querySelectorAll('.category-section');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedCategory = this.getAttribute('data-category');
            
            // ボタンのアクティブ状態を更新
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // FAQ項目の表示/非表示を制御
            if (selectedCategory === 'all') {
                // すべて表示
                faqItems.forEach(item => {
                    item.style.display = 'block';
                });
                categorySections.forEach(section => {
                    section.style.display = 'block';
                });
            } else {
                // 特定のカテゴリのみ表示
                faqItems.forEach(item => {
                    const itemCategory = item.getAttribute('data-category');
                    if (itemCategory === selectedCategory || itemCategory === null) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                categorySections.forEach(section => {
                    const sectionCategory = section.getAttribute('data-category');
                    if (sectionCategory === selectedCategory) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                });
            }
        });
    });
}

/**
 * 検索機能を初期化
 */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (!searchInput || !searchButton) return;
    
    // 検索実行
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query === '') {
            showAllFAQs();
            return;
        }
        
        searchFAQs(query);
    }
    
    // 検索ボタンクリック
    searchButton.addEventListener('click', performSearch);
    
    // Enterキー押下
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // リアルタイム検索（オプション）
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = this.value.trim().toLowerCase();
            if (query.length >= 2) {
                searchFAQs(query);
            } else if (query.length === 0) {
                showAllFAQs();
            }
        }, 300);
    });
}

/**
 * FAQ検索を実行
 */
function searchFAQs(query) {
    const faqItems = document.querySelectorAll('.faq-item');
    const categorySections = document.querySelectorAll('.category-section');
    let visibleCount = 0;
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question h4').textContent.toLowerCase();
        const answer = item.querySelector('.answer-content').textContent.toLowerCase();
        
        if (question.includes(query) || answer.includes(query)) {
            item.style.display = 'block';
            highlightSearchTerms(item, query);
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // カテゴリセクションの表示制御
    categorySections.forEach(section => {
        const visibleItems = section.querySelectorAll('.faq-item[style*="block"]');
        if (visibleItems.length > 0) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    // 検索結果の表示
    updateSearchInfo(query, visibleCount);
}

/**
 * すべてのFAQを表示
 */
function showAllFAQs() {
    const faqItems = document.querySelectorAll('.faq-item');
    const categorySections = document.querySelectorAll('.category-section');
    
    faqItems.forEach(item => {
        item.style.display = 'block';
        removeHighlight(item);
    });
    
    categorySections.forEach(section => {
        section.style.display = 'block';
    });
    
    // カテゴリフィルターをリセット
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    const allButton = document.querySelector('.category-btn[data-category="all"]');
    if (allButton) {
        allButton.classList.add('active');
    }
    
    updateSearchInfo('', -1);
}

/**
 * 検索語をハイライト
 */
function highlightSearchTerms(item, query) {
    const question = item.querySelector('.faq-question h4');
    const answer = item.querySelector('.answer-content');
    
    [question, answer].forEach(element => {
        if (!element) return;
        
        const originalText = element.textContent;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        const highlightedText = originalText.replace(regex, '<span class="search-highlight">$1</span>');
        
        if (highlightedText !== originalText) {
            element.innerHTML = highlightedText;
        }
    });
}

/**
 * ハイライトを削除
 */
function removeHighlight(item) {
    const highlights = item.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

/**
 * 検索情報を更新
 */
function updateSearchInfo(query, count) {
    const searchInfo = document.querySelector('.search-info');
    if (!searchInfo) return;
    
    if (count === -1) {
        searchInfo.innerHTML = '<p>検索キーワードを入力してください。</p>';
    } else if (count === 0) {
        searchInfo.innerHTML = `<p>「${query}」に一致するFAQが見つかりませんでした。</p>`;
    } else {
        searchInfo.innerHTML = `<p>「${query}」の検索結果: ${count}件</p>`;
    }
}

/**
 * 正規表現用文字列をエスケープ
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * スムーススクロール
 */
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * URLパラメータから検索クエリを取得
 */
function getSearchQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('q') || '';
}

/**
 * 初期化時にURLパラメータをチェック
 */
document.addEventListener('DOMContentLoaded', function() {
    const query = getSearchQueryFromURL();
    if (query) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = query;
            searchFAQs(query.toLowerCase());
        }
    }
});

/**
 * FAQ項目の統計情報を取得
 */
function getFAQStats() {
    const totalFAQs = document.querySelectorAll('.faq-item').length;
    const categories = new Set();
    
    document.querySelectorAll('.faq-item').forEach(item => {
        const category = item.getAttribute('data-category');
        if (category) {
            categories.add(category);
        }
    });
    
    return {
        total: totalFAQs,
        categories: categories.size
    };
}

/**
 * アクセシビリティ機能
 */
function initializeAccessibility() {
    // キーボードナビゲーション
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // 検索をクリア
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value) {
                searchInput.value = '';
                showAllFAQs();
            }
        }
    });
    
    // フォーカス管理
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.setAttribute('tabindex', '0');
        question.setAttribute('role', 'button');
        question.setAttribute('aria-expanded', 'false');
        
        question.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// アクセシビリティ機能を初期化
document.addEventListener('DOMContentLoaded', initializeAccessibility);