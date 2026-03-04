document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('post-grid');
    const pillarGrid = document.getElementById('pillar-grid');
    const filterButtons = document.querySelectorAll('.hub-filter-btn');
    let posts = [];

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getUrl(post) {
        const categoryPath = post.category === 'guide' ? 'guides' : 'updates';
        return `/${categoryPath}/${post.slug}`;
    }

    function renderCards(activeFilter) {
        const filtered = posts.filter(function(post) {
            return activeFilter === 'all' || post.category === activeFilter;
        });

        grid.innerHTML = filtered.map(function(post) {
            return `
                <a class="post-card" href="${getUrl(post)}">
                    <img src="${post.featuredImage || '/logo.jpg'}" alt="${post.title}" class="post-image" loading="lazy">
                    <div class="post-card-content">
                        <span class="post-category ${post.category}">${post.categoryLabel}</span>
                        <h3>${post.title}</h3>
                        <p>${post.excerpt || ''}</p>
                        <time datetime="${post.date}">${formatDate(post.date)}</time>
                    </div>
                </a>
            `;
        }).join('');

        if (!filtered.length) {
            grid.innerHTML = '<p>No posts available yet. Use /admin to publish your first post.</p>';
        }
    }

    function renderPillars() {
        const pillars = posts.filter(function(post) {
            return post.category === 'guide' && post.pillar === true;
        });

        pillarGrid.innerHTML = pillars.map(function(post) {
            return `
                <a class="post-card" href="${getUrl(post)}">
                    <img src="${post.featuredImage || '/logo.jpg'}" alt="${post.title}" class="post-image" loading="lazy">
                    <div class="post-card-content">
                        <span class="post-category guide">Pillar Guide</span>
                        <h3>${post.title}</h3>
                        <p>${post.excerpt || ''}</p>
                        <time datetime="${post.date}">${formatDate(post.date)}</time>
                    </div>
                </a>
            `;
        }).join('');

        if (!pillars.length) {
            pillarGrid.innerHTML = '<p>Pillar guides will appear here as they are published.</p>';
        }
    }

    fetch('/.netlify/functions/posts')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            posts = data.posts || [];
            renderCards('all');
            renderPillars();
        })
        .catch(function() {
            grid.innerHTML = '<p>Unable to load posts right now.</p>';
            pillarGrid.innerHTML = '';
        });

    filterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            filterButtons.forEach(function(btn) {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });

            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            renderCards(this.dataset.filter);
        });
    });
});
