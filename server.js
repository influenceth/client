require('dotenv').config({ silent: true });
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');
const express = require('express');
const enforce = require('express-sslify');
const compression = require('compression');
const historyApiFallback = require('connect-history-api-fallback');
const isBot = require('isbot-fast');

const getOpengraphTags = require('./opengraph')

const readFileAsync = promisify(fs.readFile);

const app = express();

app.use(compression());
app.use(historyApiFallback());
app.use(enforce.HTTPS({ trustProtoHeader: true }));

// https-only, nosniff, no iframing, no xss
app.use((req, res, next) => {
  res.append(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  res.append('X-Content-Type-Options', 'nosniff');
  res.append('X-Frame-Options', 'DENY');
  res.append('X-XSS-Protection', '1; mode=block');
  next();
});

// don't cache service-worker
app.get('/service-worker.js', async (req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  return next();
});

// everything goes to index.html
app.get('/index.html', async (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  let index = (await readFileAsync(indexPath)).toString('utf8');

  // if this is a bot, replace og-tags before response
  if (isBot(req.get('User-Agent'))) {
    const tags = await getOpengraphTags(req.originalUrl);
    const meta = Object.keys(tags).map((k) => {
      if (k === 'twitter:card' || k === 'twitter:site') {
        return `<meta name="${k}" value="${tags[k]}" />`;
      }
      return `<meta property="${k}" value="${tags[k]}" />`;
    });
    index = index.replace('<meta name="opengraph"/>', meta.join('\n'));
  }

  return res.send(index);
});

app.use(express.static(path.join(__dirname, 'build')));

const server = app.listen(process.env.PORT || 3000, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.info('Serving on http://%s:%s', host, port);
});
