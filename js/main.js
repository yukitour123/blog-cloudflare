(function () {
    'use strict';

    // Sanity Config
    var CONFIG = {
        projectId: '6oepnks9',
        dataset: 'production',
        apiVersion: '2024-01-01'
    };

    var path = location.pathname;
    var isTop = path.endsWith('index.html') || path.endsWith('/') || path === '';
    var isPost = path.includes('post');

    // SVG icons
    var heartOutline = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    var heartFilled = '<svg viewBox="0 0 24 24" fill="#e8467f" stroke="#e8467f" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

    /**
     * Sanity API Helper
     */
    function sanityFetch(query, params) {
        var url = 'https://' + CONFIG.projectId + '.api.sanity.io/v' + CONFIG.apiVersion + '/data/query/' + CONFIG.dataset + '?query=' + encodeURIComponent(query);
        if (params) {
            for (var key in params) {
                url += '&' + encodeURIComponent('$' + key) + '=' + encodeURIComponent('"' + params[key] + '"');
            }
        }
        return fetch(url).then(function (res) { return res.json(); }).then(function (json) { return json.result; });
    }

    /**
     * Simple Portable Text to HTML Converter
     */
    function portableTextToHtml(blocks) {
        if (!blocks || !Array.isArray(blocks)) return '';
        return blocks.map(function (block) {
            if (block._type === 'block') {
                var text = block.children.map(function (span) {
                    var content = escapeHTML(span.text);
                    if (span.marks && span.marks.length > 0) {
                        span.marks.forEach(function (mark) {
                            if (mark === 'strong') content = '<strong>' + content + '</strong>';
                            if (mark === 'em') content = '<em>' + content + '</em>';
                            if (mark === 'code') content = '<code>' + content + '</code>';
                        });
                    }
                    return content;
                }).join('');

                var style = block.style || 'normal';
                if (style === 'h1') return '<h1>' + text + '</h1>';
                if (style === 'h2') return '<h2>' + text + '</h2>';
                if (style === 'h3') return '<h3>' + text + '</h3>';
                if (style === 'blockquote') return '<blockquote>' + text + '</blockquote>';
                return '<p>' + text + '</p>';
            }
            if (block._type === 'image' && block.asset) {
                // Asset references require expansion in GROQ, but if we have the URL already from expansion:
                var imageUrl = block.asset.url || '';
                if (!imageUrl && block.asset._ref) {
                    // Simple URL builder for Sanity assets if not expanded
                    var ref = block.asset._ref;
                    var parts = ref.split('-');
                    var id = parts[1];
                    var dim = parts[2];
                    var ext = parts[3];
                    imageUrl = 'https://cdn.sanity.io/images/' + CONFIG.projectId + '/' + CONFIG.dataset + '/' + id + '-' + dim + '.' + ext;
                }
                return '<figure><img src="' + imageUrl + '" alt=""><figcaption>' + (block.caption || '') + '</figcaption></figure>';
            }
            return '';
        }).join('');
    }

    // --------------------------------------------------
    // トップページ: カードグリッド描画
    // --------------------------------------------------
    if (isTop) {
        var gridEl = document.getElementById('card-grid');
        if (!gridEl) return;

        var query = '*[_type == "post"] | order(date desc) { title, "slug": slug.current, date, "cover": cover.asset->url }';

        sanityFetch(query)
            .then(function (posts) {
                gridEl.innerHTML = '';
                if (!posts || posts.length === 0) {
                    gridEl.innerHTML = '<div class="no-posts">記事がまだありません</div>';
                    return;
                }
                posts.forEach(function (post) {
                    var card = document.createElement('div');
                    card.className = 'article-card';
                    card.onclick = function () {
                        location.href = '/post.html?slug=' + encodeURIComponent(post.slug);
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
            .catch(function (err) {
                console.error(err);
                gridEl.innerHTML = '<div class="loading">記事の読み込みに失敗しました</div>';
            });

        // Tab UI
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
            });
        });
    }

    // --------------------------------------------------
    // 記事ページ: Sanityからデータを取得して表示
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

        var query = '*[_type == "post" && slug.current == $slug][0] { title, "slug": slug.current, date, "cover": cover.asset->url, body }';

        sanityFetch(query, { slug: slug })
            .then(function (post) {
                if (!post) {
                    headerEl.innerHTML = '<p class="loading">記事が見つかりませんでした</p>';
                    return;
                }

                // Title & Page title
                document.title = post.title + ' – 雑記ブログ';
                headerEl.innerHTML =
                    '<h1>' + escapeHTML(post.title) + '</h1>' +
                    (post.date ? '<p class="post-date">' + escapeHTML(post.date) + '</p>' : '');

                // Cover image
                if (post.cover) {
                    coverEl.innerHTML = '';
                    var coverImg = document.createElement('img');
                    coverImg.src = post.cover;
                    coverImg.alt = post.title || '';
                    coverEl.appendChild(coverImg);
                }

                // Body (Portable Text → HTML)
                bodyEl.innerHTML = portableTextToHtml(post.body);

                // Author footer date
                var authorDateEl = document.getElementById('author-footer-date');
                if (authorDateEl && post.date) {
                    authorDateEl.textContent = post.date;
                }

                // Like button
                setupLikeButton(post.slug);
            })
            .catch(function (err) {
                console.error(err);
                headerEl.innerHTML = '<p class="loading">記事情報の読み込みに失敗しました</p>';
            });
    }

    // --------------------------------------------------
    // Like helpers (localStorage) - Sanity移行後もそのまま使用
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
