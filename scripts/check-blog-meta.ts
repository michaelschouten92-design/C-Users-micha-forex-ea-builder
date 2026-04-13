/**
 * Check blog post title/description lengths for SEO compliance.
 * Titles should be <= 60 chars, descriptions <= 160 chars.
 */
import { BLOG_POSTS } from "../src/lib/blog/posts";

const TITLE_MAX = 60;
const DESC_MAX = 160;

const issues: Array<{
  slug: string;
  titleLen: number;
  descLen: number;
  title: string;
  desc: string;
}> = [];
for (const p of BLOG_POSTS) {
  if (p.title.length > TITLE_MAX || p.description.length > DESC_MAX) {
    issues.push({
      slug: p.slug,
      titleLen: p.title.length,
      descLen: p.description.length,
      title: p.title,
      desc: p.description,
    });
  }
}

console.log(`Total posts: ${BLOG_POSTS.length}`);
console.log(
  `Posts with overlong title (>${TITLE_MAX}) or description (>${DESC_MAX}): ${issues.length}\n`
);
for (const i of issues) {
  console.log(`slug: ${i.slug}`);
  console.log(`  title (${i.titleLen}${i.titleLen > TITLE_MAX ? " ✗" : ""}): ${i.title}`);
  console.log(`  desc  (${i.descLen}${i.descLen > DESC_MAX ? " ✗" : ""}):  ${i.desc}`);
  console.log();
}
