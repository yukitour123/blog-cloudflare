(function () {
    'use strict';

    var path = location.pathname;
    var isTop = path.endsWith('index.html') || path.endsWith('/');
    var isPost = path.endsWith('post.html');

    // SVG icons
    var heartOutline = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    var heartFilled = '<svg viewBox="0 0 24 24" fill="#e8467f" stroke="#e8467f" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

    // --------------------------------------------------
    // トップページ: カードグリッド描画
    // --------------------------------------------------
    if (isTop) {
        var gridEl = document.getElementById('card-grid');
        if (!gridEl) return;

        fetch('content/posts.json')
            .then(function (res) { return res.json(); })
            .then(function (posts) {
                gridEl.innerHTML = '';
                if (posts.length === 0) {
                    gridEl.innerHTML = '<div class="no-posts">記事がまだありません</div>';
                    return;
                }
                posts.forEach(function (post) {
                    var card = document.createElement('div');
                    card.className = 'article-card';
                    card.onclick = function () {
                        location.href = 'post.html?slug=' + encodeURIComponent(post.slug);
                    };

                    // Cover
                    var coverDiv = document.createElement('div');
                    coverDiv.className = 'card-cover';
                    if (post.cover) {
                        var coverImg = document.createElement('img');
                        coverImg.src = post.cover;
                        coverImg.alt = post.title;
                        coverImg.loading = 'lazy';
                        coverDiv.appendChild(coverImg);
                    }

                    // Body
                    var bodyDiv = document.createElement('div');
                    bodyDiv.className = 'card-body';

                    var titleDiv = document.createElement('div');
                    titleDiv.className = 'card-title';
                    titleDiv.textContent = post.title;

                    var metaDiv = document.createElement('div');
                    metaDiv.className = 'card-meta';

                    var authorDiv = document.createElement('div');
                    authorDiv.className = 'card-author';
                    authorDiv.innerHTML = '<div class="card-author-avatar"></div><span>ブログ運営者</span>';

                    var likesDiv = document.createElement('div');
                    likesDiv.className = 'card-likes';
                    var likeCount = getLikeCount(post.slug);
                    likesDiv.innerHTML = heartOutline + '<span>' + likeCount + '</span>';

                    metaDiv.appendChild(authorDiv);
                    metaDiv.appendChild(likesDiv);

                    var dateDiv = document.createElement('div');
                    dateDiv.style.fontSize = '0.76rem';
                    dateDiv.style.color = '#999';
                    dateDiv.style.marginTop = '8px';
                    dateDiv.textContent = post.date;

                    bodyDiv.appendChild(titleDiv);
                    bodyDiv.appendChild(metaDiv);
                    bodyDiv.appendChild(dateDiv);

                    card.appendChild(coverDiv);
                    card.appendChild(bodyDiv);
                    gridEl.appendChild(card);
                });
            })
            .catch(function () {
                gridEl.innerHTML = '<div class="loading">記事の読み込みに失敗しました</div>';
            });

        // Tab UI (decorative – both show same content)
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
            });
        });
    }

    // --------------------------------------------------
    // 記事ページ: Markdownを読み込んで表示
    // --------------------------------------------------
    if (isPost) {
        var params = new URLSearchParams(location.search);
        var slug = params.get('slug');
        var headerEl = document.getElementById('post-header');
        var bodyEl = document.getElementById('post-body');
        var coverEl = document.getElementById('post-cover');

        if (!slug) {
            headerEl.innerHTML = '<p class="loading">記事が指定されていません</p>';
            return;
        }

        fetch('content/posts.json')
            .then(function (res) { return res.json(); })
            .then(function (posts) {
                var meta = posts.find(function (p) { return p.slug === slug; });

                // Cover image
                if (meta && meta.cover) {
                    var coverImg = document.createElement('img');
                    coverImg.src = meta.cover;
                    coverImg.alt = meta.title || '';
                    coverEl.appendChild(coverImg);
                }

                // Markdown
                fetch('content/posts/' + slug + '.md')
                    .then(function (res) {
                        if (!res.ok) throw new Error('not found');
                        return res.text();
                    })
                    .then(function (md) {
                        var html = marked.parse(md);

                        var tmp = document.createElement('div');
                        tmp.innerHTML = html;
                        var firstH1 = tmp.querySelector('h1');
                        var title = firstH1 ? firstH1.textContent : slug;
                        if (firstH1) firstH1.remove();

                        document.title = title + ' – 雑記ブログ';

                        var dateStr = meta ? meta.date : '';
                        headerEl.innerHTML =
                            '<h1>' + escapeHTML(title) + '</h1>' +
                            (dateStr ? '<p class="post-date">' + escapeHTML(dateStr) + '</p>' : '');

                        bodyEl.innerHTML = tmp.innerHTML;

                        // Author footer date
                        var authorDateEl = document.getElementById('author-footer-date');
                        if (authorDateEl && dateStr) {
                            authorDateEl.textContent = dateStr;
                        }

                        // Like button
                        setupLikeButton(slug);
                    })
                    .catch(function () {
                        headerEl.innerHTML = '<p class="loading">記事が見つかりませんでした</p>';
                    });
            })
            .catch(function () {
                headerEl.innerHTML = '<p class="loading">記事情報の読み込みに失敗しました</p>';
            });
    }

    // --------------------------------------------------
    // Like helpers (localStorage)
    // --------------------------------------------------
    function getLikeCount(slug) {
        try {
            var data = JSON.parse(localStorage.getItem('blog_likes') || '{}');
            return data[slug] ? data[slug].count : 0;
        } catch (e) {
            return 0;
        }
    }

    function isLiked(slug) {
        try {
            var data = JSON.parse(localStorage.getItem('blog_likes') || '{}');
            return data[slug] ? data[slug].liked : false;
        } catch (e) {
            return false;
        }
    }

    function toggleLike(slug) {
        try {
            var data = JSON.parse(localStorage.getItem('blog_likes') || '{}');
            if (!data[slug]) data[slug] = { count: 0, liked: false };
            if (data[slug].liked) {
                data[slug].count = Math.max(0, data[slug].count - 1);
                data[slug].liked = false;
            } else {
                data[slug].count += 1;
                data[slug].liked = true;
            }
            localStorage.setItem('blog_likes', JSON.stringify(data));
            return data[slug];
        } catch (e) {
            return { count: 0, liked: false };
        }
    }

    function setupLikeButton(slug) {
        var btn = document.getElementById('like-btn');
        var countEl = document.getElementById('like-count');
        if (!btn || !countEl) return;

        var state = { count: getLikeCount(slug), liked: isLiked(slug) };
        updateLikeUI(btn, countEl, state);

        btn.addEventListener('click', function () {
            state = toggleLike(slug);
            updateLikeUI(btn, countEl, state);
        });
    }

    function updateLikeUI(btn, countEl, state) {
        countEl.textContent = state.count;
        var svgContainer = btn.querySelector('svg');
        if (state.liked) {
            btn.classList.add('liked');
            if (svgContainer) svgContainer.outerHTML = heartFilled;
        } else {
            btn.classList.remove('liked');
            if (svgContainer) svgContainer.outerHTML = heartOutline;
        }
    }

    // HTML escape
    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
