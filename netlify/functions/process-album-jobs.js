const { Client } = require('pg');
const AWS = require('aws-sdk');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const OUTPUT_BUCKET = process.env.ALBUM_OUTPUT_BUCKET || process.env.AWS_S3_BUCKET || 'albumgrom';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const ensureEnv = () => {
  if (!process.env.NEON_DB_URL) {
    throw new Error('Missing NEON_DB_URL env var');
  }
};

const createClient = () =>
  new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

const s3 = new AWS.S3({ region: AWS_REGION });

const slugify = (value, fallback = 'album') => {
  if (!value || typeof value !== 'string') return fallback;
  const cleaned = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 60) || fallback;
};

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sanitizeUrl = (value = '') => value.replace(/"/g, '%22');

const camelToKebab = (str = '') =>
  str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const styleToCss = (style = {}) =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${camelToKebab(key)}:${value}`)
    .join(';');

const buildTextSlotHtml = (page, slot, globalStyle) => {
  const bounds = slot?.bounds || {};
  const slotStyle = {
    top: `${bounds.top ?? 0}%`,
    left: `${bounds.left ?? 0}%`,
    width: `${bounds.width ?? 0}%`,
    height: `${bounds.height ?? 0}%`,
    position: 'absolute',
  };

  const textIndex = slot?.textIndex ?? 0;
  const rawHtml = page.texts?.[textIndex] || '';
  const style = {
    ...globalStyle,
    ...(slot?.style || {}),
  };

  return `
    <div class="text-slot" style="${styleToCss(slotStyle)}">
      <div class="text-slot-content" style="${styleToCss(style)}">${rawHtml}</div>
    </div>
  `;
};

const buildPhotoSlotHtml = (page, slot) => {
  const bounds = slot?.bounds || {};
  const slotStyle = {
    top: `${bounds.top ?? 0}%`,
    left: `${bounds.left ?? 0}%`,
    width: `${bounds.width ?? 0}%`,
    height: `${bounds.height ?? 0}%`,
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: '8px',
  };

  const slotIndex = slot?.slotIndex ?? 0;
  const applyEdit = page.edits?.[slotIndex];
  const imageSrc = applyEdit?.previewDataUrl || page.assignedImages?.[slotIndex];
  if (!imageSrc) return '';

  return `
    <div class="photo-slot" style="${styleToCss(slotStyle)}">
      <img src="${sanitizeUrl(imageSrc)}" alt="Slot ${slotIndex + 1}" />
    </div>
  `;
};

const buildTitleOverlay = (payload, layout) => {
  const overlay = layout?.titleOverlay;
  if (!overlay || (!payload.title && !payload.subtitle)) return '';

  const bounds = overlay.bounds || {};
  const wrapperStyle = {
    top: `${bounds.top ?? 0}%`,
    left: `${bounds.left ?? 0}%`,
    width: `${bounds.width ?? 100}%`,
    height: `${bounds.height ?? 100}%`,
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const headingStyle = overlay.headingStyle || {};
  const subheadingStyle = overlay.subheadingStyle || {};
  const baseStyle = overlay.style || {};

  return `
    <div class="title-overlay">
      ${payload.title ? `<h2>${escapeHtml(payload.title)}</h2>` : ''}
      ${payload.subtitle ? `<h4>${escapeHtml(payload.subtitle)}</h4>` : ''}
    </div>
  `;
};

const buildAlbumHtml = (payload) => {
  const pages = Array.isArray(payload.pages) ? payload.pages : [];
  const widthCm = Number(payload.albumSize?.width) || 20;
  const heightCm = Number(payload.albumSize?.height) || 20;

  const globalTextStyle = payload.textSettings || {};

  const pageHtml = pages
    .map((page) => {
      const layout = page.layout || { slots: [], textSlots: [] };
      const backgroundPieces = [];
      if (page.theme?.image) {
        backgroundPieces.push(`background-image:url('${sanitizeUrl(page.theme.image)}')`);
        backgroundPieces.push('background-size:cover');
        backgroundPieces.push('background-position:center');
      } else if (page.theme?.color) {
        backgroundPieces.push(`background-color:${page.theme.color}`);
      } else {
        backgroundPieces.push('background-color:#ffffff');
      }

      const slotHtml = (layout.slots || []).map((slot) => buildPhotoSlotHtml(page, slot)).join('');
      const textHtml = (layout.textSlots || []).map((slot) => buildTextSlotHtml(page, slot, globalTextStyle)).join('');
      const overlayHtml = buildTitleOverlay(payload, layout);

      return `
        <div class="album-page">
          <div class="page-wrapper" style="${backgroundPieces.join(';')}">
            ${slotHtml}
            ${textHtml}
            ${overlayHtml}
          </div>
        </div>
      `;
    })
    .join('');

  const css = `
    :root {
      color-scheme: light;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ${globalTextStyle.fontFamily || 'Inter, system-ui, sans-serif'};
      background: #f5f5f5;
    }
    .album-page {
      width: ${widthCm}cm;
      height: ${heightCm}cm;
      page-break-after: always;
      position: relative;
      padding: 0;
    }
    .album-page:last-child {
      page-break-after: auto;
    }
    .page-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 12px;
      overflow: hidden;
    }
    .photo-slot {
      position: absolute;
      overflow: hidden;
      border-radius: 12px;
    }
    .photo-slot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .text-slot {
      position: absolute;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .text-slot-content {
      padding: 14px;
      width: 100%;
      height: 100%;
      overflow-wrap: anywhere;
    }
    .title-overlay h1,
    .title-overlay h2 {
      margin: 0;
    }
    .title-overlay h1 {
      margin-bottom: 6px;
    }
  `;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Album PDF</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
${pageHtml}
</body>
</html>`;

  return { html, widthCm, heightCm, pageCount: pages.length };
};

const renderAlbumPdf = async (payload) => {
  const { html, widthCm, heightCm, pageCount } = buildAlbumHtml(payload);
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: Math.ceil(widthCm * 37.7952755906),
      height: Math.ceil(heightCm * 37.7952755906),
      deviceScaleFactor: 2,
    },
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'] });
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: `${widthCm}cm`,
      height: `${heightCm}cm`,
      preferCSSPageSize: true,
      pageRanges: pageCount > 0 ? `1-${pageCount}` : undefined,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

const buildOutputKey = (job, payload) => {
  const customer = slugify(payload.customerName || job.customer_name || 'customer');
  const title = slugify(payload.title || job.album_title || 'album');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const sessionPart = slugify(payload.sessionId || job.session_id || 'session');
  return `${sessionPart}/${customer}-${title}-${timestamp}.pdf`;
};

exports.handler = async () => {
  try {
    ensureEnv();
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const client = createClient();
  await client.connect();

  let job;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      SELECT id, user_id, session_id, customer_name, album_title, album_subtitle, payload
      FROM album_jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);

    if (!rows.length) {
      await client.query('COMMIT');
      await client.end();
      return {
        statusCode: 200,
        body: JSON.stringify({ processed: 0 }),
      };
    }

    job = rows[0];
    await client.query(
      `UPDATE album_jobs
       SET status = 'processing', started_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [job.id],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
    console.error('Failed to lock job', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to lock job', details: err.message }),
    };
  }

  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

  try {
    const pdfBuffer = await renderAlbumPdf(payload);
    const key = buildOutputKey(job, payload);

    await s3
      .putObject({
        Bucket: OUTPUT_BUCKET,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      })
      .promise();

    await client.query(
      `UPDATE album_jobs
       SET status = 'completed', completed_at = NOW(), updated_at = NOW(), output_key = $2
       WHERE id = $1`,
      [job.id, key],
    );

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: 1, jobId: job.id, outputKey: key }),
    };
  } catch (err) {
    console.error('Failed to process album job', err);
    await client.query(
      `UPDATE album_jobs
       SET status = 'failed', error_message = $2, updated_at = NOW()
       WHERE id = $1`,
      [job.id, err.message?.slice(0, 2000) || 'Unknown error'],
    );
    await client.end();

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process album job', details: err.message }),
    };
  }
};
