const { Client } = require('pg');

const requiredEnv = () => {
  if (!process.env.NEON_DB_URL) {
    throw new Error('Missing NEON_DB_URL env var');
  }
};

const createClient = () =>
  new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

const baseSelect = `
  SELECT
    o.id,
    o.order_number AS "orderNumber",
    o.user_id AS "userId",
    o.status,
    o.album_size AS "albumSize",
    o.amount_paid AS "amountPaid",
    o.currency,
    o.images_count AS "imagesCount",
    o.pages_count AS "pagesCount",
    o.city,
    o.order_date AS "orderDate",
    o.production_started_at AS "productionStartedAt",
    o.production_completed_at AS "productionCompletedAt",
    o.payment_date AS "paymentDate",
    o.payment_method AS "paymentMethod",
    o.payment_status AS "paymentStatus",
    o.payment_transaction_id AS "paymentTransactionId",
    o.referral_source AS "referralSource",
    o.device_info AS "deviceInfo",
    o.occasion,
    o.occasion_date AS "occasionDate",
    o.gift_recipient_name AS "giftRecipientName",
    o.gift_recipient_relationship AS "giftRecipientRelationship",
    o.notes,
    o.created_at AS "createdAt",
    o.updated_at AS "updatedAt",
    u.name AS "userName",
    u.email AS "userEmail",
    u.phone_number AS "userPhone",
    u.address AS "userAddress",
    u.postcode AS "userPostcode",
    u.role AS "userRole"
  FROM orders o
  JOIN users u ON u.id = o.user_id
`;

exports.handler = async (event) => {
  try {
    requiredEnv();
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 };
  }

  const client = createClient();
  await client.connect();

  try {
    if (event.httpMethod === 'GET') {
      const filters = event.queryStringParameters || {};
      const clauses = [];
      const values = [];

      if (filters.status) {
        clauses.push('o.status = $' + (values.length + 1));
        values.push(filters.status);
      }

      if (filters.search) {
        const idx = values.length + 1;
        values.push(`%${filters.search.toLowerCase()}%`);
        clauses.push(`(
          lower(o.order_number) LIKE $${idx}
          OR lower(u.name) LIKE $${idx}
          OR lower(u.email) LIKE $${idx}
          OR lower(u.phone_number) LIKE $${idx}
        )`);
      }

      const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
      const { rows } = await client.query(
        `${baseSelect} ${where} ORDER BY o.order_date DESC, o.id DESC`,
        values
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ orders: rows }),
      };
    }

    if (event.httpMethod === 'POST') {
      let payload;
      try {
        payload = JSON.parse(event.body || '{}');
      } catch (err) {
        return { statusCode: 400, body: 'Invalid JSON body' };
      }

      const required = ['userId', 'orderNumber', 'status', 'amountPaid', 'orderDate'];
      const missing = required.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === '');
      if (missing.length) {
        return {
          statusCode: 400,
          body: `Missing fields: ${missing.join(', ')}`,
        };
      }

      const amountPaid = Number(payload.amountPaid);
      if (!Number.isFinite(amountPaid)) {
        return { statusCode: 400, body: "amountPaid must be a valid number" };
      }

      const imagesCount = payload.imagesCount !== undefined && payload.imagesCount !== null
        ? Number(payload.imagesCount)
        : null;
      if (imagesCount !== null && (!Number.isInteger(imagesCount) || imagesCount < 0)) {
        return { statusCode: 400, body: "imagesCount must be a positive integer" };
      }

      const pagesCount = payload.pagesCount !== undefined && payload.pagesCount !== null
        ? Number(payload.pagesCount)
        : null;
      if (pagesCount !== null && (!Number.isInteger(pagesCount) || pagesCount < 0)) {
        return { statusCode: 400, body: "pagesCount must be a positive integer" };
      }

      const insertQuery = `
        INSERT INTO orders (
          order_number,
          user_id,
          status,
          album_size,
          amount_paid,
          currency,
          images_count,
          pages_count,
          city,
          order_date,
          production_started_at,
          production_completed_at,
          payment_date,
          payment_method,
          payment_status,
          payment_transaction_id,
          referral_source,
          device_info,
          occasion,
          occasion_date,
          gift_recipient_name,
          gift_recipient_relationship,
          notes
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
        )
        RETURNING id
      `;
      const values = [
        payload.orderNumber,
        payload.userId,
        payload.status,
        payload.albumSize || null,
        amountPaid,
        payload.currency || 'PKR',
        imagesCount,
        pagesCount,
        payload.city || null,
        payload.orderDate,
        payload.productionStartedAt || null,
        payload.productionCompletedAt || null,
        payload.paymentDate || null,
        payload.paymentMethod || null,
        payload.paymentStatus || null,
        payload.paymentTransactionId || null,
        payload.referralSource || null,
        payload.deviceInfo || null,
        payload.occasion || null,
        payload.occasionDate || null,
        payload.giftRecipientName || null,
        payload.giftRecipientRelationship || null,
        payload.notes || null,
      ];

      const insertResult = await client.query(insertQuery, values);
      const insertedId = insertResult.rows[0].id;

      const { rows } = await client.query(
        `${baseSelect} WHERE o.id = $1`,
        [insertedId]
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ order: rows[0] }),
      };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  } finally {
    await client.end();
  }
};







