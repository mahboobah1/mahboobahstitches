-- Phase 3b: organise the supplied photos into collections and products, and add cover/homepage pictures.
-- Products are real photos of Mahboobah Stitches pieces. NO prices, sizes, fabrics or stock counts are invented:
-- every product has one 'Standard' option with price 0 (shown on the site as 'Price on request') and stock is not counted.
-- The owner sets real prices, sizes and stock in Admin > Products.

ALTER TABLE collections ADD COLUMN image_url TEXT;

INSERT OR IGNORE INTO collections (id, slug, name, blurb, sort_order) VALUES
 ('col_two_piece','two-piece-sets','Two-Piece Sets','Matching khimar and skirt sets, and fitted tops with skirts.',2);
UPDATE collections SET sort_order=1 WHERE id='col_jilbab';
UPDATE collections SET sort_order=3 WHERE id='col_abaya';
UPDATE collections SET sort_order=4 WHERE id='col_flower_pattern';
UPDATE collections SET sort_order=5 WHERE id='col_kiddies_hijab';
UPDATE collections SET sort_order=6 WHERE id='col_prayer';
UPDATE collections SET sort_order=7 WHERE id='col_combo_gift';

INSERT OR IGNORE INTO categories (id, collection_id, slug, name, sort_order) VALUES
 ('cat_khimar_sets','col_two_piece','khimar-sets','Khimar sets',1),
 ('cat_top_skirt','col_two_piece','top-and-skirt-sets','Top and skirt sets',2);

-- collection cover pictures
UPDATE collections SET image_url='/images/products/jilbab-emerald-button-cuff.webp' WHERE id='col_jilbab';
UPDATE collections SET image_url='/images/products/two-piece-mustard-khimar-skirt.webp' WHERE id='col_two_piece';
UPDATE collections SET image_url='/images/products/abaya-green-silver-trim-tassel.webp' WHERE id='col_abaya';
UPDATE collections SET image_url='/images/products/dress-yellow-zebra-print.webp' WHERE id='col_flower_pattern';

-- homepage pictures (editable in Admin > Settings)
INSERT OR REPLACE INTO settings (key, value) VALUES ('site.heroImage','/images/products/abaya-mauve-satin-diagonal-trim.webp'),('site.bespokeImage','/images/products/dress-beige-floral-trim.webp');

INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-teal-button-cuff','jilbab-teal-button-cuff','Teal jilbab with button cuffs','Teal one-piece jilbab with attached hood and silver buttons on pleated cuffs.','col_jilbab','cat_one_piece','ready_to_wear','active',1760000000,1760000000);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-teal-button-cuff','prd_jilbab-teal-button-cuff','JILBAB-TEAL-BUTTON-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-teal-button-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-teal-button-cuff','prd_jilbab-teal-button-cuff','/images/products/jilbab-teal-button-cuff.webp','Teal one-piece jilbab with attached hood and silver buttons on pleated cuffs',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_dress-dusty-pink-pleated-cuff','dress-dusty-pink-pleated-cuff','Dusty pink flared dress with pleated cuffs','Dusty pink long-sleeve flared dress with button detail and pleated cuffs on a mannequin.','col_abaya','cat_occasion_abaya','ready_to_wear','active',1760000060,1760000060);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_dress-dusty-pink-pleated-cuff','prd_dress-dusty-pink-pleated-cuff','DRESS-DUSTY-PINK-PLEATED-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_dress-dusty-pink-pleated-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_dress-dusty-pink-pleated-cuff','prd_dress-dusty-pink-pleated-cuff','/images/products/dress-dusty-pink-pleated-cuff.webp','Dusty pink long-sleeve flared dress with button detail and pleated cuffs on a mannequin',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-tan-pleated-cuff','jilbab-tan-pleated-cuff','Tan jilbab with pleated cuffs','Tan one-piece jilbab with attached hood and pleated cuffs on a mannequin.','col_jilbab','cat_one_piece','ready_to_wear','active',1760000120,1760000120);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-tan-pleated-cuff','prd_jilbab-tan-pleated-cuff','JILBAB-TAN-PLEATED-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-tan-pleated-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-tan-pleated-cuff','prd_jilbab-tan-pleated-cuff','/images/products/jilbab-tan-pleated-cuff.webp','Tan one-piece jilbab with attached hood and pleated cuffs on a mannequin',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_set-pink-slit-top-skirt','set-pink-slit-top-skirt','Pink top and skirt set with front slit','Pink long-sleeve fitted top with front slit and a matching flared skirt.','col_two_piece','cat_top_skirt','ready_to_wear','active',1760000180,1760000180);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_set-pink-slit-top-skirt','prd_set-pink-slit-top-skirt','SET-PINK-SLIT-TOP-SKIRT','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_set-pink-slit-top-skirt',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_set-pink-slit-top-skirt','prd_set-pink-slit-top-skirt','/images/products/set-pink-slit-top-skirt.webp','Pink long-sleeve fitted top with front slit and a matching flared skirt',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_dress-geometric-print-shirt','dress-geometric-print-shirt','Geometric print shirt dress','Long shirt dress in a geometric print with black collar, pockets and belt.','col_flower_pattern','cat_patterned','ready_to_wear','active',1760000240,1760000240);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_dress-geometric-print-shirt','prd_dress-geometric-print-shirt','DRESS-GEOMETRIC-PRINT-SHIRT','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_dress-geometric-print-shirt',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_dress-geometric-print-shirt','prd_dress-geometric-print-shirt','/images/products/dress-geometric-print-shirt.webp','Long shirt dress in a geometric print with black collar, pockets and belt',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_abaya-pale-blue-button-front','abaya-pale-blue-button-front','Pale blue button-front abaya','Pale blue long abaya with dark buttons down the front and balloon sleeves, with a royal blue scarf.','col_abaya','cat_everyday_abaya','ready_to_wear','active',1760000300,1760000300);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_abaya-pale-blue-button-front','prd_abaya-pale-blue-button-front','ABAYA-PALE-BLUE-BUTTON-FRONT','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_abaya-pale-blue-button-front',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_abaya-pale-blue-button-front','prd_abaya-pale-blue-button-front','/images/products/abaya-pale-blue-button-front.webp','Pale blue long abaya with dark buttons down the front and balloon sleeves, with a royal blue scarf',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-lilac-ruffle-cuff','jilbab-lilac-ruffle-cuff','Lilac jilbab with ruffle cuffs','Lilac one-piece jilbab with attached hood and ruffled cuffs on a mannequin.','col_jilbab','cat_one_piece','ready_to_wear','active',1760000360,1760000360);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-lilac-ruffle-cuff','prd_jilbab-lilac-ruffle-cuff','JILBAB-LILAC-RUFFLE-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-lilac-ruffle-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-lilac-ruffle-cuff','prd_jilbab-lilac-ruffle-cuff','/images/products/jilbab-lilac-ruffle-cuff.webp','Lilac one-piece jilbab with attached hood and ruffled cuffs on a mannequin',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_two-piece-navy-khimar-gold-button','two-piece-navy-khimar-gold-button','Navy two-piece khimar set with gold buttons','Navy two-piece khimar and skirt set with gold buttons, front view.','col_two_piece','cat_khimar_sets','ready_to_wear','active',1760000420,1760000420);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_two-piece-navy-khimar-gold-button','prd_two-piece-navy-khimar-gold-button','TWO-PIECE-NAVY-KHIMAR-GOLD-BUTTON','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_two-piece-navy-khimar-gold-button',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_two-piece-navy-khimar-gold-button-1','prd_two-piece-navy-khimar-gold-button','/images/products/two-piece-navy-khimar-gold-button-1.webp','Navy two-piece khimar and skirt set with gold buttons, front view',1);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_two-piece-navy-khimar-gold-button-2','prd_two-piece-navy-khimar-gold-button','/images/products/two-piece-navy-khimar-gold-button-2.webp','Navy two-piece khimar and skirt set with gold buttons, angled view',2);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_dress-green-batik-sleeve','dress-green-batik-sleeve','Green dress with batik-print sleeves','Green button-front dress with white and green batik-print sleeves and side panels.','col_flower_pattern','cat_patterned','ready_to_wear','active',1760000480,1760000480);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_dress-green-batik-sleeve','prd_dress-green-batik-sleeve','DRESS-GREEN-BATIK-SLEEVE','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_dress-green-batik-sleeve',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_dress-green-batik-sleeve','prd_dress-green-batik-sleeve','/images/products/dress-green-batik-sleeve.webp','Green button-front dress with white and green batik-print sleeves and side panels',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-navy-ruffle-cuff','jilbab-navy-ruffle-cuff','Navy blue jilbab with ruffle cuffs','Navy blue one-piece jilbab with attached hood and gathered ruffle cuffs.','col_jilbab','cat_one_piece','ready_to_wear','active',1760000540,1760000540);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-navy-ruffle-cuff','prd_jilbab-navy-ruffle-cuff','JILBAB-NAVY-RUFFLE-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-navy-ruffle-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-navy-ruffle-cuff','prd_jilbab-navy-ruffle-cuff','/images/products/jilbab-navy-ruffle-cuff.webp','Navy blue one-piece jilbab with attached hood and gathered ruffle cuffs',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_abaya-sky-blue-black-ruffle-sleeve','abaya-sky-blue-black-ruffle-sleeve','Sky blue abaya with black ruffle sleeves','Sky blue long abaya with wide black ruffled sleeves on a mannequin.','col_abaya','cat_everyday_abaya','ready_to_wear','active',1760000600,1760000600);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_abaya-sky-blue-black-ruffle-sleeve','prd_abaya-sky-blue-black-ruffle-sleeve','ABAYA-SKY-BLUE-BLACK-RUFFLE-SLEEVE','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_abaya-sky-blue-black-ruffle-sleeve',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_abaya-sky-blue-black-ruffle-sleeve','prd_abaya-sky-blue-black-ruffle-sleeve','/images/products/abaya-sky-blue-black-ruffle-sleeve.webp','Sky blue long abaya with wide black ruffled sleeves on a mannequin',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_set-purple-fringe-trim','set-purple-fringe-trim','Purple top and skirt set with fringe trim','Purple flared top with lilac fringe trim worn over a matching long skirt.','col_two_piece','cat_top_skirt','ready_to_wear','active',1760000660,1760000660);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_set-purple-fringe-trim','prd_set-purple-fringe-trim','SET-PURPLE-FRINGE-TRIM','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_set-purple-fringe-trim',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_set-purple-fringe-trim','prd_set-purple-fringe-trim','/images/products/set-purple-fringe-trim.webp','Purple flared top with lilac fringe trim worn over a matching long skirt',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_dress-beige-floral-trim','dress-beige-floral-trim','Beige long dress with floral trim','Beige long-sleeve dress with brown flower appliques at the neck and waist and a front zip.','col_flower_pattern','cat_floral','ready_to_wear','active',1760000720,1760000720);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_dress-beige-floral-trim','prd_dress-beige-floral-trim','DRESS-BEIGE-FLORAL-TRIM','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_dress-beige-floral-trim',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_dress-beige-floral-trim','prd_dress-beige-floral-trim','/images/products/dress-beige-floral-trim.webp','Beige long-sleeve dress with brown flower appliques at the neck and waist and a front zip',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-caramel-beaded-cuff','jilbab-caramel-beaded-cuff','Caramel one-piece jilbab with beaded cuffs','Caramel one-piece jilbab with attached hood and beaded cuff ties, shown on a mannequin.','col_jilbab','cat_one_piece','ready_to_wear','active',1760000780,1760000780);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-caramel-beaded-cuff','prd_jilbab-caramel-beaded-cuff','JILBAB-CARAMEL-BEADED-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-caramel-beaded-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-caramel-beaded-cuff','prd_jilbab-caramel-beaded-cuff','/images/products/jilbab-caramel-beaded-cuff.webp','Caramel one-piece jilbab with attached hood and beaded cuff ties, shown on a mannequin',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_abaya-mauve-satin-diagonal-trim','abaya-mauve-satin-diagonal-trim','Mauve satin abaya with diagonal trim','Mauve satin abaya with matching scarf, diagonal black trim and gathered balloon cuffs.','col_abaya','cat_occasion_abaya','ready_to_wear','active',1760000840,1760000840);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_abaya-mauve-satin-diagonal-trim','prd_abaya-mauve-satin-diagonal-trim','ABAYA-MAUVE-SATIN-DIAGONAL-TRIM','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_abaya-mauve-satin-diagonal-trim',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_abaya-mauve-satin-diagonal-trim','prd_abaya-mauve-satin-diagonal-trim','/images/products/abaya-mauve-satin-diagonal-trim.webp','Mauve satin abaya with matching scarf, diagonal black trim and gathered balloon cuffs',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_two-piece-mustard-khimar-skirt','two-piece-mustard-khimar-skirt','Mustard two-piece khimar and skirt set','Mustard two-piece set of a long pointed khimar with button cuffs and a matching skirt.','col_two_piece','cat_khimar_sets','ready_to_wear','active',1760000900,1760000900);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_two-piece-mustard-khimar-skirt','prd_two-piece-mustard-khimar-skirt','TWO-PIECE-MUSTARD-KHIMAR-SKIRT','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_two-piece-mustard-khimar-skirt',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_two-piece-mustard-khimar-skirt','prd_two-piece-mustard-khimar-skirt','/images/products/two-piece-mustard-khimar-skirt.webp','Mustard two-piece set of a long pointed khimar with button cuffs and a matching skirt',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_dress-yellow-zebra-print','dress-yellow-zebra-print','Yellow and black zebra print dress','Yellow and black zebra-print dress with black lace trim at the neck and ruffled shoulders.','col_flower_pattern','cat_patterned','ready_to_wear','active',1760000960,1760000960);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_dress-yellow-zebra-print','prd_dress-yellow-zebra-print','DRESS-YELLOW-ZEBRA-PRINT','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_dress-yellow-zebra-print',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_dress-yellow-zebra-print','prd_dress-yellow-zebra-print','/images/products/dress-yellow-zebra-print.webp','Yellow and black zebra-print dress with black lace trim at the neck and ruffled shoulders',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_jilbab-emerald-button-cuff','jilbab-emerald-button-cuff','Emerald green jilbab with button cuffs','Emerald green one-piece jilbab with attached hood and silver buttons on the cuffs.','col_jilbab','cat_one_piece','ready_to_wear','active',1760001020,1760001020);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_jilbab-emerald-button-cuff','prd_jilbab-emerald-button-cuff','JILBAB-EMERALD-BUTTON-CUFF','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_jilbab-emerald-button-cuff',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_jilbab-emerald-button-cuff','prd_jilbab-emerald-button-cuff','/images/products/jilbab-emerald-button-cuff.webp','Emerald green one-piece jilbab with attached hood and silver buttons on the cuffs',1);
INSERT INTO products (id,slug,name,description,collection_id,category_id,product_type,status,created_at,updated_at) VALUES ('prd_abaya-green-silver-trim-tassel','abaya-green-silver-trim-tassel','Green abaya with silver trim and tassels','Green abaya with silver braided trim, beads and tassels on the sleeves.','col_abaya','cat_occasion_abaya','ready_to_wear','active',1760001080,1760001080);
INSERT INTO product_variants (id,product_id,sku,size,colour,price_minor,currency) VALUES ('var_abaya-green-silver-trim-tassel','prd_abaya-green-silver-trim-tassel','ABAYA-GREEN-SILVER-TRIM-TASSEL','','',0,'NGN');
INSERT INTO inventory (variant_id,track_stock,on_hand,allow_backorder) VALUES ('var_abaya-green-silver-trim-tassel',0,0,0);
INSERT INTO product_images (id,product_id,url,alt_text,sort_order) VALUES ('img_abaya-green-silver-trim-tassel','prd_abaya-green-silver-trim-tassel','/images/products/abaya-green-silver-trim-tassel.webp','Green abaya with silver braided trim, beads and tassels on the sleeves',1);
