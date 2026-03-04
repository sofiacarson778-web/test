const fs = require('fs');
const path = require('path');

const POSTS_ROOT = path.join(process.cwd(), 'content', 'posts');
const CATEGORY_DIRECTORIES = [
    { dir: 'updates', category: 'update', categoryLabel: 'Update' },
    { dir: 'guides', category: 'guide', categoryLabel: 'Guide' }
];

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

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizeMarkdown(markdown) {
    return markdown
        .replace(/^\\([#\-*`>])/gm, '$1')
        .replace(/\\(\*\*|\*|\[|\]|\(|\))/g, '$1');
}

function resolveAssetPath(assetPath, fallback = '') {
    if (!assetPath || typeof assetPath !== 'string') return fallback;

    const cleanedPath = assetPath.trim();
    if (!cleanedPath) return fallback;
    if (/^(https?:)?\/\//.test(cleanedPath) || cleanedPath.startsWith('data:')) return cleanedPath;
    if (cleanedPath.startsWith('/')) return cleanedPath;

    return `/${cleanedPath}`;
}

function markdownToHtml(markdown) {
    const normalizedMarkdown = normalizeMarkdown(markdown);
    const lines = normalizedMarkdown.split('\n');
    const html = [];
    let inList = false;

    function closeList() {
        if (inList) {
            html.push('</ul>');
            inList = false;
        }
    }

    lines.forEach((rawLine) => {
        const line = rawLine.trimEnd();

        if (!line.trim()) {
            closeList();
            return;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            closeList();
            const level = heading[1].length;
            html.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`);
            return;
        }

        if (/^---+$/.test(line.trim())) {
            closeList();
            html.push('<hr>');
            return;
        }

        const listItem = line.match(/^[-*]\s+(.*)$/);
        if (listItem) {
            if (!inList) {
                html.push('<ul>');
                inList = true;
            }
            html.push(`<li>${inlineMarkdownToHtml(listItem[1])}</li>`);
            return;
        }

        closeList();
        html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    });

    closeList();
    return html.join('\n');
}

function inlineMarkdownToHtml(line) {
    return escapeHtml(line)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
}

function normalizeCategory(category) {
    if (category === 'guides' || category === 'guide') return 'guide';
    return 'update';
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

function getMarkdownFilesFromDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath)
        .filter((file) => file.endsWith('.md'))
        .map((file) => path.join(dirPath, file));
}

function getPostSummary(filePath, categoryDefaults) {
    const source = fs.readFileSync(filePath, 'utf8');
    const parsed = parseFrontmatter(source);
    const frontmatter = parsed.data;
    const fileName = path.basename(filePath);

    const category = normalizeCategory(frontmatter.category || categoryDefaults.category);
    const faqFromBody = parseFaqFromLines(parsed.content);

    return {
        title: frontmatter.title || fileName,
        slug: frontmatter.slug || fileName.replace(/\.md$/, ''),
        date: frontmatter.date || new Date().toISOString(),
        featuredImage: resolveAssetPath(frontmatter.featured_image || frontmatter.image, '/logo.jpg'),
        excerpt: frontmatter.excerpt || '',
        category,
        categoryLabel: category === 'guide' ? 'Guide' : 'Update',
        html: markdownToHtml(parsed.content),
        content: parsed.content,
        author: frontmatter.author || 'FM Resumes',
        pdf: resolveAssetPath(frontmatter.pdf, ''),
        pdfThumbnail: resolveAssetPath(frontmatter.pdf_thumbnail, ''),
        pdfDescription: frontmatter.pdf_description || '',
        pillar: frontmatter.pillar === true,
        related: Array.isArray(frontmatter.related) ? frontmatter.related : [],
        faq: frontmatter.faq && frontmatter.faq.length ? frontmatter.faq.map((entry) => {
            const rawEntry = (typeof entry === 'string' ? entry : (entry.qa || '')).replace(/^qa:\s*/, '');
            const faqMatch = rawEntry.match(/^Q:\s*(.*?)\s*\|\s*A:\s*(.*)$/);
            if (!faqMatch) return null;
            return { question: faqMatch[1], answer: faqMatch[2] };
        }).filter(Boolean) : faqFromBody,
        metaTitle: frontmatter.meta_title || '',
        metaDescription: frontmatter.meta_description || ''
    };
}

function loadPosts() {
    const posts = CATEGORY_DIRECTORIES.flatMap((categoryInfo) => {
        const categoryDir = path.join(POSTS_ROOT, categoryInfo.dir);
        const markdownFiles = getMarkdownFilesFromDirectory(categoryDir);
        return markdownFiles.map((filePath) => getPostSummary(filePath, categoryInfo));
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return posts;
}

module.exports = {
    loadPosts,
    markdownToHtml,
    resolveAssetPath
};
