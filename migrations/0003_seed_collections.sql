-- The six collections and their subcategories come from the business brief (not sample data).
INSERT OR IGNORE INTO collections (id, slug, name, blurb, sort_order) VALUES
 ('col_jilbab','jilbab','Jilbab Collection','Flowing, covered and made with care, in one, two and three pieces.',1),
 ('col_kiddies_hijab','kiddies-instant-hijab','Kiddies Instant Hijab','Easy slip-on hijabs for little ones, in mini and maxi lengths.',2),
 ('col_abaya','abaya','Abaya Collection','Abayas for everyday wear, special occasions and ready-to-wear convenience.',3),
 ('col_flower_pattern','flower-and-pattern','Flower and Pattern Collection','Floral and patterned modest dresses with a distinct personality.',4),
 ('col_prayer','prayer-wear','Prayer Wear','Comfortable prayer dresses for adults and children, plus prayer essentials.',5),
 ('col_combo_gift','combo-and-gift','Combo and Gift Collection','Prayer sets and ready-to-gift combinations for the people you love.',6);

INSERT OR IGNORE INTO categories (id, collection_id, slug, name, sort_order) VALUES
 ('cat_one_piece','col_jilbab','one-piece-jilbab','One-piece jilbab',1),
 ('cat_two_piece','col_jilbab','two-piece-jilbab','Two-piece jilbab',2),
 ('cat_three_piece','col_jilbab','three-piece-jilbab','Three-piece jilbab',3),
 ('cat_mini','col_kiddies_hijab','mini','Mini',1),
 ('cat_maxi','col_kiddies_hijab','maxi','Maxi',2),
 ('cat_everyday_abaya','col_abaya','everyday-abayas','Everyday abayas',1),
 ('cat_occasion_abaya','col_abaya','occasion-abayas','Occasion abayas',2),
 ('cat_rtw_abaya','col_abaya','ready-to-wear-abayas','Ready-to-wear abayas',3),
 ('cat_floral','col_flower_pattern','floral-dresses','Floral dresses',1),
 ('cat_patterned','col_flower_pattern','patterned-dresses','Patterned dresses',2),
 ('cat_distinctive','col_flower_pattern','distinctive-modest-dresses','Distinctive modest dresses',3),
 ('cat_adult_prayer','col_prayer','adult-prayer-dresses','Adult prayer dresses',1),
 ('cat_kiddies_prayer','col_prayer','kiddies-prayer-dresses','Kiddies prayer dresses',2),
 ('cat_prayer_essentials','col_prayer','prayer-essentials','Prayer essentials',3),
 ('cat_dress_mat','col_combo_gift','prayer-dress-and-mat-sets','Prayer dress and mat sets',1),
 ('cat_adult_gift','col_combo_gift','adult-prayer-gift-sets','Adult prayer gift sets',2),
 ('cat_kiddies_gift','col_combo_gift','kiddies-prayer-gift-sets','Kiddies prayer gift sets',3),
 ('cat_rtw_gift','col_combo_gift','ready-to-wear-gift-combinations','Ready-to-wear gift combinations',4),
 ('cat_custom_bundle','col_combo_gift','custom-gift-bundles','Custom gift bundles',5);

INSERT OR IGNORE INTO booking_types (id, name, duration_minutes) VALUES
 ('bt_consult','Consultation',30),
 ('bt_measure','Measurements',30),
 ('bt_fitting','Fitting',45),
 ('bt_design','Custom design discussion',45);

INSERT OR IGNORE INTO settings (key, value) VALUES
 ('default_currency','NGN'),
 ('whatsapp_number','');
