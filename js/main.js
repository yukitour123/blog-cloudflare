(function () {
    'use strict';

    // Sanity Config
    var CONFIG = {
        projectId: '6oepnks9',
        dataset: 'production',
        apiVersion: '2024-01-01'
    };

    var POSTS_PER_PAGE = 6;

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

    // HTML escape
    function escapeHTML(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // --------------------------------------------------
    // トップページ: 検索・フィルター・ページネーション付きカードグリッド
    // --------------------------------------------------
    if (isTop) {
        var gridEl = document.getElementById('card-grid');
        var paginationContainer = document.getElementById('pagination-container');
        var loadMoreBtn = document.getElementById('load-more-btn');
        var searchInput = document.getElementById('search-input');
        var searchBtn = document.getElementById('search-btn');
        var categoryFiltersEl = document.getElementById('category-filters');
        var tagFiltersEl = document.getElementById('tag-filters');

        if (!gridEl) return;

        var allPosts = [];
        var filteredPosts = [];
        var displayedCount = 0;
        var activeCategory = null;
        var activeTag = null;
        var searchQuery = '';
        var currentTab = 'new';

        // カテゴリとタグの一覧を取得
        sanityFetch('*[_type == "category"] | order(title asc) { title, "slug": slug.current }')
            .then(function (cats) {
                if (!cats || cats.length === 0) return;
                var allBtn = document.createElement('button');
                allBtn.className = 'filter-btn active';
                allBtn.textContent = 'すべて';
                allBtn.addEventListener('click', function () {
                    activeCategory = null;
                    setActiveFilter(categoryFiltersEl, allBtn);
                    applyFilters();
                });
                categoryFiltersEl.appendChild(allBtn);

                cats.forEach(function (cat) {
                    var btn = document.createElement('button');
                    btn.className = 'filter-btn';
                    btn.textContent = cat.title;
                    btn.addEventListener('click', function () {
                        activeCategory = cat.slug;
                        setActiveFilter(categoryFiltersEl, btn);
                        applyFilters();
                    });
                    categoryFiltersEl.appendChild(btn);
                });
            });

        sanityFetch('*[_type == "tag"] | order(title asc) { title, "slug": slug.current }')
            .then(function (tags) {
                if (!tags || tags.length === 0) return;
                var allBtn = document.createElement('button');
                allBtn.className = 'filter-btn tag-btn active';
                allBtn.textContent = 'すべて';
                allBtn.addEventListener('click', function () {
                    activeTag = null;
                    setActiveFilter(tagFiltersEl, allBtn);
                    applyFilters();
                });
                tagFiltersEl.appendChild(allBtn);

                tags.forEach(function (tag) {
                    var btn = document.createElement('button');
                    btn.className = 'filter-btn tag-btn';
                    btn.textContent = '#' + tag.title;
                    btn.addEventListener('click', function () {
                        activeTag = tag.slug;
                        setActiveFilter(tagFiltersEl, btn);
                        applyFilters();
                    });
                    tagFiltersEl.appendChild(btn);
                });
            });

        function setActiveFilter(container, activeBtn) {
            container.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
            activeBtn.classList.add('active');
        }

        // 全記事を一括取得
        var postsQuery = '*[_type == "post"] | order(date desc) { title, "slug": slug.current, date, _updatedAt, excerpt, "cover": cover.asset->url, "category": category->{title, "slug": slug.current}, "tags": tags[]->{title, "slug": slug.current}, "bodyText": pt::text(body) }';

        sanityFetch(postsQuery)
            .then(function (posts) {
                allPosts = posts || [];
                applyFilters();
            })
            .catch(function (err) {
                console.error(err);
                gridEl.innerHTML = '<div class="loading">記事の読み込みに失敗しました</div>';
            });

        function applyFilters() {
            filteredPosts = allPosts.filter(function (post) {
                // カテゴリ
                if (activeCategory && (!post.category || post.category.slug !== activeCategory)) return false;
                // タグ
                if (activeTag && (!post.tags || !post.tags.some(function (t) { return t.slug === activeTag; }))) return false;
                // 検索
                if (searchQuery) {
                    var q = searchQuery.toLowerCase();
                    var inTitle = post.title && post.title.toLowerCase().indexOf(q) !== -1;
                    var inBody = post.bodyText && post.bodyText.toLowerCase().indexOf(q) !== -1;
                    var inExcerpt = post.excerpt && post.excerpt.toLowerCase().indexOf(q) !== -1;
                    if (!inTitle && !inBody && !inExcerpt) return false;
                }
                return true;
            });

            // ソート
            if (currentTab === 'popular') {
                filteredPosts.sort(function (a, b) {
                    return (b._updatedAt || '').localeCompare(a._updatedAt || '');
                });
            }

            displayedCount = 0;
            gridEl.innerHTML = '';
            loadMore();
        }

        function loadMore() {
            var end = Math.min(displayedCount + POSTS_PER_PAGE, filteredPosts.length);
            if (displayedCount === 0 && filteredPosts.length === 0) {
                gridEl.innerHTML = '<div class="no-posts">記事が見つかりませんでした</div>';
                paginationContainer.style.display = 'none';
                return;
            }

            for (var i = displayedCount; i < end; i++) {
                gridEl.appendChild(createCard(filteredPosts[i]));
            }
            displayedCount = end;

            if (displayedCount < filteredPosts.length) {
                paginationContainer.style.display = 'block';
            } else {
                paginationContainer.style.display = 'none';
            }
        }

        function createCard(post) {
            var card = document.createElement('div');
            card.className = 'article-card';
            card.onclick = function () {
                location.href = '/post.html?slug=' + encodeURIComponent(post.slug);
            };

            var coverDiv = document.createElement('div');
            coverDiv.className = 'card-cover';
            if (post.cover) {
                var coverImg = document.createElement('img');
                coverImg.src = post.cover;
                coverImg.alt = post.title;
                coverImg.loading = 'lazy';
                coverDiv.appendChild(coverImg);
            }

            var bodyDiv = document.createElement('div');
            bodyDiv.className = 'card-body';

            // カテゴリバッジ
            if (post.category) {
                var badge = document.createElement('span');
                badge.className = 'category-badge';
                badge.textContent = post.category.title;
                bodyDiv.appendChild(badge);
            }

            var titleDiv = document.createElement('div');
            titleDiv.className = 'card-title';
            titleDiv.textContent = post.title;

            bodyDiv.appendChild(titleDiv);

            // 抜粋
            if (post.excerpt) {
                var excerptDiv = document.createElement('div');
                excerptDiv.className = 'card-excerpt';
                excerptDiv.textContent = post.excerpt;
                bodyDiv.appendChild(excerptDiv);
            }

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

            bodyDiv.appendChild(metaDiv);
            bodyDiv.appendChild(dateDiv);

            card.appendChild(coverDiv);
            card.appendChild(bodyDiv);
            return card;
        }

        // Events
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMore);
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', function () {
                searchQuery = searchInput.value.trim();
                applyFilters();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    searchQuery = searchInput.value.trim();
                    applyFilters();
                }
            });
        }

        // Tab UI
        var tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                tabs.forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                currentTab = tab.getAttribute('data-tab');
                applyFilters();
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

        var query = '*[_type == "post" && slug.current == $slug][0] { title, "slug": slug.current, date, _updatedAt, "cover": cover.asset->url, body, "category": category->{title, "slug": slug.current}, "tags": tags[]->{title, "slug": slug.current} }';

        sanityFetch(query, { slug: slug })
            .then(function (post) {
                if (!post) {
                    headerEl.innerHTML = '<p class="loading">記事が見つかりませんでした</p>';
                    return;
                }

                // Page title & OGP
                document.title = post.title + ' – 雑記ブログ';
                var metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) metaDesc.content = post.title + ' – 雑記ブログ';
                var ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) ogTitle.content = post.title;

                // Header
                var headerHtml = '<h1>' + escapeHTML(post.title) + '</h1>';

                // Meta info
                var metaHtml = '<div class="post-meta-info">';
                if (post.category) {
                    metaHtml += '<span class="category-badge">' + escapeHTML(post.category.title) + '</span>';
                }
                if (post.tags && post.tags.length > 0) {
                    post.tags.forEach(function (t) {
                        metaHtml += '<span class="filter-btn tag-btn" style="cursor:default; padding:2px 8px; font-size:0.7rem;">#' + escapeHTML(t.title) + '</span>';
                    });
                }
                metaHtml += '</div>';

                var dateStr = post.date ? escapeHTML(post.date) : '';
                if (post._updatedAt) {
                    var upDate = new Date(post._updatedAt).toISOString().split('T')[0];
                    if (upDate !== post.date) {
                        dateStr += ' (更新: ' + escapeHTML(upDate) + ')';
                    }
                }
                if (dateStr) {
                    metaHtml += '<p class="post-date">' + dateStr + '</p>';
                }

                headerEl.innerHTML = headerHtml + metaHtml;

                // Cover image
                if (post.cover) {
                    coverEl.innerHTML = '';
                    var coverImg = document.createElement('img');
                    coverImg.src = post.cover;
                    coverImg.alt = post.title || '';
                    coverEl.appendChild(coverImg);
                }

                // Body (Portable Text → HTML) & TOC generation
                var bodyHtmlArray = [];
                var tocArray = [];
                var headingCount = 0;

                if (post.body && Array.isArray(post.body)) {
                    post.body.forEach(function (block) {
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

                            if (style === 'h2' || style === 'h3') {
                                headingCount++;
                                var anchorId = 'heading-' + headingCount;
                                var levelClass = style === 'h3' ? 'toc-h3' : '';
                                tocArray.push('<li class="' + levelClass + '"><a href="#' + anchorId + '">' + text + '</a></li>');
                                bodyHtmlArray.push('<' + style + ' id="' + anchorId + '">' + text + '</' + style + '>');
                            } else if (style === 'h1') {
                                bodyHtmlArray.push('<h1>' + text + '</h1>');
                            } else if (style === 'blockquote') {
                                bodyHtmlArray.push('<blockquote>' + text + '</blockquote>');
                            } else {
                                bodyHtmlArray.push('<p>' + text + '</p>');
                            }
                        } else if (block._type === 'image' && block.asset) {
                            var imageUrl = block.asset.url || '';
                            if (!imageUrl && block.asset._ref) {
                                var ref = block.asset._ref;
                                var parts = ref.split('-');
                                var id = parts[1];
                                var dim = parts[2];
                                var ext = parts[3];
                                imageUrl = 'https://cdn.sanity.io/images/' + CONFIG.projectId + '/' + CONFIG.dataset + '/' + id + '-' + dim + '.' + ext;
                            }
                            bodyHtmlArray.push('<figure><img src="' + imageUrl + '" alt="" loading="lazy"><figcaption>' + (block.caption || '') + '</figcaption></figure>');
                        }
                    });
                }

                bodyEl.innerHTML = bodyHtmlArray.join('');

                // TOC
                if (tocArray.length > 0) {
                    var tocContainer = document.getElementById('toc-container');
                    var tocList = document.getElementById('toc-list');
                    if (tocContainer && tocList) {
                        tocList.innerHTML = tocArray.join('');
                        tocContainer.style.display = 'block';
                    }
                }

                // Author footer date
                var authorDateEl = document.getElementById('author-footer-date');
                if (authorDateEl && post.date) {
                    authorDateEl.textContent = post.date;
                }

                // Like button
                setupLikeButton(post.slug);

                // Share buttons
                setupShareButtons(post.title);

                // Related posts
                if (post.category) {
                    loadRelatedPosts(post.category.slug, post.slug);
                }
            })
            .catch(function (err) {
                console.error(err);
                headerEl.innerHTML = '<p class="loading">記事情報の読み込みに失敗しました</p>';
            });

        function setupShareButtons(title) {
            var shareContainer = document.getElementById('share-buttons');
            if (!shareContainer) return;

            var url = encodeURIComponent(location.href);
            var text = encodeURIComponent(title + ' | 雑記ブログ');

            var twitterUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text;
            var facebookUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
            var hatebuUrl = 'https://b.hatena.ne.jp/add?mode=confirm&url=' + url + '&title=' + text;

            var html = '';
            html += '<a href="' + twitterUrl + '" class="share-btn share-twitter" target="_blank" rel="noopener noreferrer" aria-label="Xでシェア"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>';
            html += '<a href="' + facebookUrl + '" class="share-btn share-facebook" target="_blank" rel="noopener noreferrer" aria-label="Facebookでシェア"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>';
            html += '<a href="' + hatebuUrl + '" class="share-btn share-hatebu" target="_blank" rel="noopener noreferrer" aria-label="はてなブックマークに追加">B!</a>';

            shareContainer.innerHTML = html;
        }

        function loadRelatedPosts(categorySlug, currentSlug) {
            var section = document.getElementById('related-section');
            var grid = document.getElementById('related-grid');
            if (!section || !grid) return;

            var relQuery = '*[_type == "post" && category->slug.current == "' + categorySlug + '" && slug.current != "' + currentSlug + '"] | order(date desc)[0...3] { title, "slug": slug.current, date, "cover": cover.asset->url }';

            sanityFetch(relQuery).then(function (posts) {
                if (!posts || posts.length === 0) return;

                section.style.display = 'block';
                var html = '';
                posts.forEach(function (p) {
                    html += '<div class="article-card" onclick="location.href=\'/post.html?slug=' + encodeURIComponent(p.slug) + '\'">';
                    html += '<div class="card-cover">' + (p.cover ? '<img src="' + p.cover + '" alt="" loading="lazy">' : '') + '</div>';
                    html += '<div class="card-body">';
                    html += '<div class="card-title" style="font-size:0.88rem;">' + escapeHTML(p.title) + '</div>';
                    html += '<div style="font-size:0.75rem; color:#999; margin-top:6px;">' + escapeHTML(p.date) + '</div>';
                    html += '</div></div>';
                });
                grid.innerHTML = html;
            }).catch(console.error);
        }
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
})();
