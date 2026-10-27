// scripts/seedGoogleSheets.js
import { readSheet, appendRow, batchAppend } from '../api/lib/sheets.js';
import { hashPassword } from '../api/lib/auth.js';

async function seed() {
  console.log('\n🌱 Seeding initial data into live Google Sheets...');
  const now = new Date().toISOString();

  // 1. Users
  const users = await readSheet('Users');
  if (users.length === 0) {
    console.log('  Adding initial staff accounts...');
    await appendRow('Users', {
      user_id: 'USR-000001',
      name: '4N Planet Admin',
      email: 'admin@4nplanet.lk',
      password_hash: hashPassword('admin123456'),
      role: 'admin',
      is_active: 'true',
      phone: '0770000001',
      created_at: now,
      updated_at: now,
      last_login: '',
    });
    await appendRow('Users', {
      user_id: 'USR-000002',
      name: 'Cashier Staff',
      email: 'cashier@4nplanet.lk',
      password_hash: hashPassword('admin123456'),
      role: 'cashier',
      is_active: 'true',
      phone: '0770000002',
      created_at: now,
      updated_at: now,
      last_login: '',
    });
    console.log('  ✅ Users added');
  }

  // 2. Categories
  const cats = await readSheet('Categories');
  if (cats.length === 0) {
    console.log('  Adding product categories...');
    await batchAppend('Categories', [
      { category_id: 'CAT-000001', name: 'Smartphones', description: 'Flagship & budget mobile phones', is_active: 'true', created_at: now, updated_at: now },
      { category_id: 'CAT-000002', name: 'Chargers & Cables', description: 'Fast chargers and USB cables', is_active: 'true', created_at: now, updated_at: now },
      { category_id: 'CAT-000003', name: 'Audio & Acoustics', description: 'Earbuds, headphones & Bluetooth speakers', is_active: 'true', created_at: now, updated_at: now },
      { category_id: 'CAT-000004', name: 'Cases & Protectors', description: 'Tempered glass and shockproof covers', is_active: 'true', created_at: now, updated_at: now },
      { category_id: 'CAT-000005', name: 'Repair Spare Parts', description: 'Displays, batteries and IC components', is_active: 'true', created_at: now, updated_at: now },
    ]);
    console.log('  ✅ Categories added');
  }

  // 3. Brands
  const brands = await readSheet('Brands');
  if (brands.length === 0) {
    console.log('  Adding device brands...');
    await batchAppend('Brands', [
      { brand_id: 'BRD-000001', name: 'Apple', description: 'Apple Inc.', is_active: 'true', created_at: now, updated_at: now },
      { brand_id: 'BRD-000002', name: 'Samsung', description: 'Samsung Electronics', is_active: 'true', created_at: now, updated_at: now },
      { brand_id: 'BRD-000003', name: 'Xiaomi', description: 'Xiaomi Mobile', is_active: 'true', created_at: now, updated_at: now },
      { brand_id: 'BRD-000004', name: 'Anker', description: 'Charging & audio peripherals', is_active: 'true', created_at: now, updated_at: now },
    ]);
    console.log('  ✅ Brands added');
  }

  // 4. Suppliers
  const suppliers = await readSheet('Suppliers');
  if (suppliers.length === 0) {
    console.log('  Adding initial suppliers...');
    await appendRow('Suppliers', {
      supplier_id: 'SUP-000001',
      name: 'Lanka Mobile Wholesalers Ltd',
      contact_person: 'Nimal Fernando',
      phone: '0112345678',
      email: 'sales@lankamobile.lk',
      address: 'No. 45, First Cross Street, Pettah, Colombo 11',
      outstanding_balance: 0,
      is_active: 'true',
      created_at: now,
      updated_at: now,
    });
    console.log('  ✅ Suppliers added');
  }

  // 5. Customers
  const customers = await readSheet('Customers');
  if (customers.length === 0) {
    console.log('  Adding initial customers...');
    await appendRow('Customers', {
      customer_id: 'WALK_IN',
      name: 'Walk-in Customer',
      phone: '',
      email: '',
      address: '',
      customer_type: 'walk_in',
      total_purchases: 0,
      total_payments: 0,
      outstanding_balance: 0,
      is_active: 'true',
      created_at: now,
      updated_at: now,
    });
    await appendRow('Customers', {
      customer_id: 'CUST-000001',
      name: 'Kasun Perera',
      phone: '0771234567',
      email: 'kasun@example.com',
      address: 'Dehiwala, Colombo',
      customer_type: 'registered',
      total_purchases: 0,
      total_payments: 0,
      outstanding_balance: 0,
      is_active: 'true',
      created_at: now,
      updated_at: now,
    });
    console.log('  ✅ Customers added');
  }

  // 6. Products
  const products = await readSheet('Products');
  if (products.length === 0) {
    console.log('  Adding mobile phone and accessory stock...');
    await batchAppend('Products', [
      {
        product_id: 'PROD-000001',
        name: 'Apple iPhone 15 Pro 128GB',
        brand_id: 'BRD-000001',
        brand_name: 'Apple',
        category_id: 'CAT-000001',
        category_name: 'Smartphones',
        model: 'A3101 / Natural Titanium',
        sku: 'IPH-15P-128',
        barcode: '4N1500000001',
        description: 'Super Retina XDR, Titanium body, A17 Pro chip',
        supplier_id: 'SUP-000001',
        supplier_name: 'Lanka Mobile Wholesalers Ltd',
        purchase_cost: 310000,
        selling_price: 355000,
        retail_price: 355000,
        wholesale_price: 345000,
        min_price: 340000,
        stock_quantity: 2,
        min_stock_level: 2,
        is_serialized: 'true',
        is_active: 'true',
        warranty_months: 12,
        warranty_duration: '12',
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'PROD-000002',
        name: 'Samsung Galaxy S24 Ultra 256GB',
        brand_id: 'BRD-000002',
        brand_name: 'Samsung',
        category_id: 'CAT-000001',
        category_name: 'Smartphones',
        model: 'SM-S928B / Titanium Black',
        sku: 'SAM-S24U-256',
        barcode: '4N2400000002',
        description: 'Snapdragon 8 Gen 3, S-Pen included, 200MP camera',
        supplier_id: 'SUP-000001',
        supplier_name: 'Lanka Mobile Wholesalers Ltd',
        purchase_cost: 360000,
        selling_price: 410000,
        retail_price: 410000,
        wholesale_price: 395000,
        min_price: 390000,
        stock_quantity: 1,
        min_stock_level: 1,
        is_serialized: 'true',
        is_active: 'true',
        warranty_months: 12,
        warranty_duration: '12',
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'PROD-000003',
        name: 'Anker 30W USB-C GaN Fast Charger',
        brand_id: 'BRD-000004',
        brand_name: 'Anker',
        category_id: 'CAT-000002',
        category_name: 'Chargers & Cables',
        model: 'A2147 / White',
        sku: 'ANK-GAN-30W',
        barcode: '4N3000000003',
        description: 'Fast GaN charging adapter for iPhone & Android',
        supplier_id: 'SUP-000001',
        supplier_name: 'Lanka Mobile Wholesalers Ltd',
        purchase_cost: 4200,
        selling_price: 6500,
        retail_price: 6500,
        wholesale_price: 5500,
        min_price: 5000,
        stock_quantity: 25,
        min_stock_level: 5,
        is_serialized: 'false',
        is_active: 'true',
        warranty_months: 6,
        warranty_duration: '6',
        created_at: now,
        updated_at: now,
      },
    ]);
    console.log('  ✅ Products added');
  }

  // 7. Serials (for serialized phones)
  const serials = await readSheet('Serials');
  if (serials.length === 0) {
    console.log('  Adding device IMEIs...');
    await batchAppend('Serials', [
      {
        serial_id: 'SER-000001',
        product_id: 'PROD-000001',
        imei1: '354892109823412',
        imei2: '354892109823413',
        serial_number: 'FX48921',
        condition: 'new',
        color: 'Natural Titanium',
        status: 'available',
        purchase_id: 'PUR-000001',
        sale_id: '',
        battery_health: 100,
        created_at: now,
        updated_at: now,
      },
      {
        serial_id: 'SER-000002',
        product_id: 'PROD-000001',
        imei1: '354892109823414',
        imei2: '',
        serial_number: 'FX48922',
        condition: 'new',
        color: 'Black Titanium',
        status: 'available',
        purchase_id: 'PUR-000001',
        sale_id: '',
        battery_health: 100,
        created_at: now,
        updated_at: now,
      },
      {
        serial_id: 'SER-000003',
        product_id: 'PROD-000002',
        imei1: '357182901239845',
        imei2: '',
        serial_number: 'R582910',
        condition: 'new',
        color: 'Titanium Black',
        status: 'available',
        purchase_id: 'PUR-000001',
        sale_id: '',
        battery_health: 100,
        created_at: now,
        updated_at: now,
      },
    ]);
    console.log('  ✅ Serials added');
  }

  // 8. Settings
  const settings = await readSheet('Settings');
  if (settings.length === 0) {
    console.log('  Adding shop settings...');
    await batchAppend('Settings', [
      { key: 'shop_name', value: '4N Planet', description: '', updated_at: now, updated_by: 'system' },
      { key: 'currency', value: 'LKR', description: '', updated_at: now, updated_by: 'system' },
      { key: 'currency_symbol', value: 'Rs.', description: '', updated_at: now, updated_by: 'system' },
      { key: 'timezone', value: 'Asia/Colombo', description: '', updated_at: now, updated_by: 'system' },
      { key: 'receipt_footer', value: 'Thank you for shopping at 4N Planet! Please retain receipt for warranty.', description: '', updated_at: now, updated_by: 'system' },
      { key: 'warranty_disclaimer', value: 'Warranty covers manufacturing defects only. Physical and water damage void warranty.', description: '', updated_at: now, updated_by: 'system' },
    ]);
    console.log('  ✅ Settings added');
  }

  console.log('\n🎉 Live Google Sheets Database is fully seeded and ready for 4N Planet!\n');
}

seed().catch((err) => {
  console.error('\n❌ Seeding error:', err.message);
  process.exit(1);
});
