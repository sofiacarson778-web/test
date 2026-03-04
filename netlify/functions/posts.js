const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');

function parseValue(raw) {
    const value = raw.trim();
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value.startsWith('[') && value.endsWith(']')) {
        return value
            .slice(1, -1)
            .split(',')
            .map((item) => item.trim().replace(/^"|"$/g, ''))
            .filter(Boolean);
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

function parseFrontmatter(fileContent) {
    const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { data: {}, content: fileContent };

    const lines = match[1].split('\n');
    const data = {};
    let currentKey = null;

    lines.forEach((line) => {
        if (!line.trim()) return;

        const keyMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
        if (keyMatch) {
            const [, key, value] = keyMatch;

            if (value === '') {
                data[key] = [];
                currentKey = key;
            } else {
                data[key] = parseValue(value);
                currentKey = null;
            }
            return;
        }

        const listItemMatch = line.match(/^\s*-\s*(.*)$/);
        if (listItemMatch && currentKey) {
            data[currentKey].push(parseValue(listItemMatch[1]));
        }
    });

    return { data, content: match[2].trim() };
}

function markdownToHtml(markdown) {
    return markdown
        .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/^-\s+(.*)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<h|<ul|<li|<\/ul)(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '');
}

function parseFaqFromLines(content) {
    const lines = content.split('\n');
    const faq = [];

    lines.forEach((line) => {
        const faqMatch = line.match(/^Q:\s*(.*?)\s*\|\s*A:\s*(.*)$/);
        if (faqMatch) {
            faq.push({ question: faqMatch[1], answer: faqMatch[2] });
        }
    });

    return faq;
}

function normalizeCategory(category) {
    if (category === 'guides' || category === 'guide') return 'guide';
    return 'update';
}

function inferCategory(frontmatterCategory, relativeFilePath) {
    if (frontmatterCategory) {
        return normalizeCategory(frontmatterCategory);
    }

    const normalizedPath = relativeFilePath.replace(/\\/g, '/');
    if (normalizedPath.startsWith('guides/')) return 'guide';
    if (normalizedPath.startsWith('updates/')) return 'update';
    return 'update';
}

function collectMarkdownFiles(dir, parent = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    entries.forEach((entry) => {
        const relativePath = parent ? path.join(parent, entry.name) : entry.name;
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...collectMarkdownFiles(fullPath, relativePath));
            return;
        }

        if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(relativePath);
        }
    });

    return files;
}

function getPostSummary(relativeFilePath) {
    const filePath = path.join(POSTS_DIR, relativeFilePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const parsed = parseFrontmatter(source);
    const frontmatter = parsed.data;

    const category = inferCategory(frontmatter.category, relativeFilePath);
    const faqFromBody = parseFaqFromLines(parsed.content);
    const fileName = path.basename(relativeFilePath);

    return {
        title: frontmatter.title || fileName,
        slug: frontmatter.slug || fileName.replace(/\.md$/, ''),
        date: frontmatter.date || new Date().toISOString(),
        featuredImage: frontmatter.featured_image || frontmatter.image || '/logo.jpg',
        excerpt: frontmatter.excerpt || '',
        category,
        categoryLabel: category === 'guide' ? 'Guide' : 'Update',
        html: markdownToHtml(parsed.content),
        author: 'FM Resumes',
        pdf: frontmatter.pdf || '',
        pdfThumbnail: frontmatter.pdf_thumbnail || '',
        pdfDescription: frontmatter.pdf_description || '',
        pillar: frontmatter.pillar === true,
        related: frontmatter.related || [],
        faq: frontmatter.faq && frontmatter.faq.length ? frontmatter.faq.map((entry) => {
            let rawEntry = typeof entry === 'string' ? entry : (entry.qa || '');
            rawEntry = rawEntry.replace(/^qa:\s*/, '');
            const faqMatch = rawEntry.match(/^Q:\s*(.*?)\s*\|\s*A:\s*(.*)$/);
            if (!faqMatch) return null;
            return { question: faqMatch[1], answer: faqMatch[2] };
        }).filter(Boolean) : faqFromBody,
        metaTitle: frontmatter.meta_title || '',
        metaDescription: frontmatter.meta_description || ''
    };
}

exports.handler = async function(event) {
    try {
        const files = collectMarkdownFiles(POSTS_DIR);
        const posts = files.map(getPostSummary).sort((a, b) => new Date(b.date) - new Date(a.date));

        const query = event.queryStringParameters || {};
        if (!query.slug) {
            return {
                statusCode: 200,
                body: JSON.stringify({ posts })
            };
        }

        const requestedCategory = normalizeCategory(query.category || 'update');
        const post = posts.find((item) => item.slug === query.slug && item.category === requestedCategory);

        if (!post) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Post not found' })
            };
        }

        const relatedPosts = posts
            .filter((item) => post.related.includes(item.slug) && item.slug !== post.slug)
            .slice(0, 3)
            .map((item) => ({
                title: item.title,
                slug: item.slug,
                category: item.category
            }));

        return {
            statusCode: 200,
            body: JSON.stringify({
                post: {
                    ...post,
                    relatedPosts
                }
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Unable to load posts', details: error.message })
        };
    }
};
