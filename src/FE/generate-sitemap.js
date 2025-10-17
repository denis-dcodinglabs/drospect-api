const fs = require('fs');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');

const sitemap = new SitemapStream({ hostname: 'https://www.drospect.ai' });

const links = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/projects', changefreq: 'weekly', priority: 0.8 },
  { url: '/login', changefreq: 'monthly', priority: 0.2 },
  // Add other routes here
];

links.forEach((link) => sitemap.write(link));

sitemap.end();

streamToPromise(sitemap).then((data) => {
  fs.writeFileSync(
    path.join(__dirname, 'public', 'sitemap.xml'),
    data.toString(),
  );
});
