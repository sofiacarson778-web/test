const { loadPosts } = require('../../lib/posts');

function normalizeCategory(category) {
    if (category === 'guides' || category === 'guide') return 'guide';
    return 'update';
}

exports.handler = async function(event) {
    try {
        const posts = loadPosts();

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
