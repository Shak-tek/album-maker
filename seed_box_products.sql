-- SQL script to insert box album products (square format albums)
-- These products feature square (1:1) aspect ratio pages

BEGIN;

-- Insert Box Album products
INSERT INTO products (name, price, images, details)
VALUES
  (
    'Box Album - Classic Square',
    49.99,
    ARRAY['/products/box-album-classic-1.jpg', '/products/box-album-classic-2.jpg', '/products/box-album-classic-3.jpg', '/products/box-album-classic-4.jpg'],
    'A beautiful square-format photo album perfect for Instagram photos and modern layouts. Features premium 200gsm paper and a sleek hardcover design.'
  ),
  (
    'Box Album - Premium',
    79.99,
    ARRAY['/products/box-album-premium-1.jpg', '/products/box-album-premium-2.jpg', '/products/box-album-premium-3.jpg', '/products/box-album-premium-4.jpg'],
    'Our premium square album with enhanced paper quality and a luxurious linen cover. Perfect for weddings, special events, and cherished memories.'
  ),
  (
    'Box Album - Mini',
    29999.99,
    ARRAY['/products/box-album-mini-1.jpg', '/products/box-album-mini-2.jpg', '/products/box-album-mini-3.jpg', '/products/box-album-mini-4.jpg'],
    'Compact square album ideal for travel memories or gift giving. High-quality printing on durable 180gsm paper with a matte finish cover.'
  )
ON CONFLICT DO NOTHING;

COMMIT;

-- Notes:
-- To apply this migration, run:
-- psql $NEON_DB_URL -f seed_box_products.sql
--
-- Square album sizes to be offered (defined in ProductDetailPage):
-- - 20cm × 20cm (Small Square)
-- - 25cm × 25cm (Medium Square)
-- - 30cm × 30cm (Large Square)
