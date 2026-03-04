const fs = require('fs');
const path = require('path');
const { loadPosts } = require('../lib/posts');

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function ensureDirectory(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function renderRelated(posts) {
    if (!posts.length) return '';

    return `
        <section class="related-posts" aria-labelledby="related-heading">
            <h2 id="related-heading">Related Posts</h2>
            <div class="related-grid">
                ${posts.map((post) => `<a class="related-link" href="/${post.category === 'guide' ? 'guides' : 'updates'}/${post.slug}">${post.title}</a>`).join('')}
            </div>
        </section>
    `;
}

function renderFaq(items) {
    if (!items.length) return '';
    return `
        <section class="article-faq" aria-labelledby="faq-heading">
            <h2 id="faq-heading">Frequently Asked Questions</h2>
            ${items.map((item) => `<div class="faq-item"><h3>${item.question}</h3><p>${item.answer}</p></div>`).join('')}
        </section>
    `;
}

function renderPdf(post) {
    if (!post.pdf) return '';
    return `
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
    `;
}

function renderPostPage(post, relatedPosts) {
    const canonicalPath = post.category === 'guide' ? 'guides' : 'updates';
    const pageTitle = post.metaTitle || `${post.title} | FM Resumes`;
    const metaDescription = post.metaDescription || post.excerpt || 'FM Resumes career article.';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="apple-touch-icon" href="/favicon.png">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <meta name="description" content="${metaDescription}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:url" content="https://fmresumes.online/${canonicalPath}/${post.slug}">
    <meta property="og:image" content="https://fmresumes.online${post.featuredImage || '/logo.jpg'}">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <a href="/index.html" class="logo">
                <img src="/logo.jpg" alt="FM Resumes">
                <span>FM Resumes</span>
            </a>
            <div class="nav-links">
                <a href="/index.html">Home</a>
                <a href="/services.html">Services</a>
                <a href="/pricing.html">Pricing</a>
                <a href="/contact.html">Contact</a>
                <a href="/ats.html">ATS Scanner</a>
                <a href="/updates.html" class="active">Updates</a>
                <a href="/pricing.html" class="nav-cta">Get Started</a>
            </div>
            <button class="mobile-menu-btn" aria-label="Toggle menu">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </div>
    </nav>

    <main class="article-page">
        <article class="section" id="article-content" aria-live="polite">
            <div class="container article-container">
                <header class="article-hero">
                    <img src="${post.featuredImage || '/logo.jpg'}" alt="${post.title}" class="article-hero-image">
                    <div class="article-meta">
                        <span class="post-category ${post.category}">${post.categoryLabel}</span>
                        <h1>${post.title}</h1>
                        <p>By ${post.author || 'FM Resumes'} • <time datetime="${post.date}">${formatDate(post.date)}</time></p>
                    </div>
                </header>
                <section class="article-body">${post.html}</section>
                ${renderPdf(post)}
                ${renderFaq(post.faq || [])}
                ${renderRelated(relatedPosts)}
            </div>
        </article>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
                    <a href="/index.html" class="logo">
                        <img src="/logo.jpg" alt="FM Resumes">
                        <span>FM Resumes</span>
                    </a>
                    <p>Professional resume writing services helping job seekers land their dream careers.</p>
                </div>
                <div>
                    <h4>Quick Links</h4>
                    <ul class="footer-links">
                        <li><a href="/index.html">Home</a></li>
                        <li><a href="/services.html">Services</a></li>
                        <li><a href="/pricing.html">Pricing</a></li>
                        <li><a href="/updates.html">Updates</a></li>
                        <li><a href="/contact.html">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4>Contact Us</h4>
                    <ul class="footer-links">
                        <li><strong>Email:</strong><br><a href="mailto:services@fmresumes.online">services@fmresumes.online</a></li>
                        <li><strong>Location:</strong><br>New York, NY, United States</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 FM Resumes Limited. All rights reserved.</p>
                <div class="footer-bottom-links">
                    <a href="#">Privacy Policy</a>
                    <a href="/terms.html">Terms of Service</a>
                </div>
            </div>
        </div>
    </footer>

    <script src="/main.js"></script>
</body>
</html>`;
}

function build() {
    const posts = loadPosts();

    ensureDirectory(DATA_DIR);

    const postsForFeed = posts.map((post) => ({
        title: post.title,
        slug: post.slug,
        date: post.date,
        featuredImage: post.featuredImage,
        excerpt: post.excerpt,
        category: post.category,
        categoryLabel: post.categoryLabel,
        pillar: post.pillar
    }));

    fs.writeFileSync(path.join(DATA_DIR, 'posts.json'), JSON.stringify({ posts: postsForFeed }, null, 2));

    posts.forEach((post) => {
        const relatedPosts = posts
            .filter((item) => post.related.includes(item.slug) && item.slug !== post.slug)
            .slice(0, 3)
            .map((item) => ({ title: item.title, slug: item.slug, category: item.category }));

        const routeFolder = post.category === 'guide' ? 'guides' : 'updates';
        const postDir = path.join(ROOT, routeFolder, post.slug);
        ensureDirectory(postDir);
        fs.writeFileSync(path.join(postDir, 'index.html'), renderPostPage(post, relatedPosts));
    });

    console.log(`Built ${posts.length} posts and generated static article pages.`);
}

build();
