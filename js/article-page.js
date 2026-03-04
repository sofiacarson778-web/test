document.addEventListener('DOMContentLoaded', function() {
    const contentEl = document.getElementById('article-content');

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getCurrentPathParts() {
        const parts = window.location.pathname.replace(/^\//, '').split('/').filter(Boolean);
        return {
            category: parts[0],
            slug: parts[1]
        };
    }

    function updateMeta(post) {
        document.title = post.metaTitle || `${post.title} | FM Resumes`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) metaDescription.setAttribute('content', post.metaDescription || post.excerpt || 'FM Resumes career article.');

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', post.metaTitle || post.title);

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute('content', post.metaDescription || post.excerpt || 'Actionable resume and career advice from FM Resumes.');

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', window.location.origin + (post.featuredImage || '/logo.jpg'));
    }

    function renderFaq(faqItems) {
        if (!Array.isArray(faqItems) || !faqItems.length) return '';

        return `
            <section class="article-faq" aria-labelledby="faq-heading">
                <h2 id="faq-heading">Frequently Asked Questions</h2>
                ${faqItems.map(function(item) {
                    return `<div class="faq-item"><h3>${item.question}</h3><p>${item.answer}</p></div>`;
                }).join('')}
            </section>
        `;
    }

    function renderRelated(posts) {
        if (!Array.isArray(posts) || !posts.length) return '';

        return `
            <section class="related-posts" aria-labelledby="related-heading">
                <h2 id="related-heading">Related Posts</h2>
                <div class="related-grid">
                    ${posts.map(function(post) {
                        return `<a class="related-link" href="/${post.category === 'guide' ? 'guides' : 'updates'}/${post.slug}">${post.title}</a>`;
                    }).join('')}
                </div>
            </section>
        `;
    }

    function injectSchema(post) {
        const articleSchema = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription || post.excerpt,
            image: [window.location.origin + (post.featuredImage || '/logo.jpg')],
            datePublished: post.date,
            author: {
                '@type': 'Organization',
                name: 'FM Resumes'
            },
            publisher: {
                '@type': 'Organization',
                name: 'FM Resumes'
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': window.location.href
            }
        };

        const articleScript = document.createElement('script');
        articleScript.type = 'application/ld+json';
        articleScript.textContent = JSON.stringify(articleSchema);
        document.head.appendChild(articleScript);

        if (Array.isArray(post.faq) && post.faq.length) {
            const faqSchema = {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: post.faq.map(function(item) {
                    return {
                        '@type': 'Question',
                        name: item.question,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: item.answer
                        }
                    };
                })
            };

            const faqScript = document.createElement('script');
            faqScript.type = 'application/ld+json';
            faqScript.textContent = JSON.stringify(faqSchema);
            document.head.appendChild(faqScript);
        }
    }

    const pathParts = getCurrentPathParts();
    if (!pathParts.slug || !pathParts.category) {
        contentEl.innerHTML = '<div class="container"><p>Article not found.</p></div>';
        return;
    }

    fetch(`/.netlify/functions/posts?category=${encodeURIComponent(pathParts.category)}&slug=${encodeURIComponent(pathParts.slug)}`)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Not found');
            }
            return response.json();
        })
        .then(function(data) {
            const post = data.post;
            updateMeta(post);
            injectSchema(post);

            const pdfResource = post.pdf ? `
                <section class="pdf-resource" aria-labelledby="pdf-heading">
                    <h2 id="pdf-heading">Downloadable Resume Resource</h2>
                    <div class="pdf-resource-card">
                        <img src="${post.pdfThumbnail || post.featuredImage || '/logo.jpg'}" alt="PDF preview for ${post.title}">
                        <div>
                            <p>${post.pdfDescription || 'Download the companion PDF resource for this guide.'}</p>
                            <a class="btn btn-primary" href="${post.pdf}" download>Download PDF</a>
                        </div>
                    </div>
                </section>
            ` : (post.category === 'guide' ? `
                <section class="pdf-resource" aria-labelledby="pdf-heading">
                    <h2 id="pdf-heading">Downloadable Resume Resource</h2>
                    <p>No PDF is available for this guide yet.</p>
                </section>
            ` : '');

            contentEl.innerHTML = `
                <div class="container article-container">
                    <header class="article-hero">
                        <img src="${post.featuredImage || '/logo.jpg'}" alt="${post.title}" class="article-hero-image">
                        <div class="article-meta">
                            <span class="post-category ${post.category}">${post.categoryLabel}</span>
                            <h1>${post.title}</h1>
                            <p>By FM Resumes • <time datetime="${post.date}">${formatDate(post.date)}</time></p>
                        </div>
                    </header>
                    <section class="article-body">${post.html}</section>
                    ${pdfResource}
                    ${renderFaq(post.faq)}
                    ${renderRelated(post.relatedPosts)}
                </div>
            `;
        })
        .catch(function() {
            contentEl.innerHTML = '<div class="container"><p>Unable to load this article right now.</p></div>';
        });
});
