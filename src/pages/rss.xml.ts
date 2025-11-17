import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { siteConfig } from '@/config';
import { parse as htmlParser } from 'node-html-parser';
import { getImage } from 'astro:assets';
import type { APIContext, ImageMetadata } from 'astro';
import type { RSSFeedItem } from '@astrojs/rss';
import { getSortedPosts, getSortedTools } from '@/utils/content-utils';

const markdownParser = new MarkdownIt();

const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
    '/src/content/**/*.{jpeg,jpg,png,gif,webp}',
);

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error('site not set');
	}

    const posts = await getSortedPosts();
    const tools = await getSortedTools();
    const feed: RSSFeedItem[] = [];

    async function pushItems(entries: typeof posts, base: 'posts' | 'tools') {
        for (const entry of entries) {
            const body = markdownParser.render(entry.body);
            const html = htmlParser.parse(body);
            const images = html.querySelectorAll('img');

            for (const img of images) {
                const src = img.getAttribute('src');
                if (!src) continue;

                if (src.startsWith('./') || src.startsWith('../')) {
                    let importPath: string | null = null;
                    if (src.startsWith('./')) {
                        const prefixRemoved = src.slice(2);
                        importPath = `/src/content/${base}/${prefixRemoved}`;
                    } else {
                        const cleaned = src.replace(/^\.\.\//, '');
                        importPath = `/src/content/${cleaned}`;
                    }
                    const imageMod = await imagesGlob[importPath]?.()?.then((res) => res.default);
                    if (imageMod) {
                        const optimizedImg = await getImage({ src: imageMod });
                        img.setAttribute('src', new URL(optimizedImg.src, context.site).href);
                    }
                } else if (src.startsWith('/')) {
                    img.setAttribute('src', new URL(src, context.site).href);
                }
            }

            feed.push({
                title: entry.data.title,
                description: entry.data.description,
                pubDate: entry.data.published,
                link: `/${base}/${entry.slug}/`,
                content: sanitizeHtml(html.toString(), {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
                }),
            });
        }
    }

    await pushItems(posts, 'posts');
    await pushItems(tools, 'tools');

    return rss({
        title: siteConfig.title,
        description: siteConfig.subtitle || 'No description',
        site: context.site,
        items: feed,
        customData: `<language>${siteConfig.lang}</language>`,
    });
}
