// api/lib/validate.js
// Zod schema definitions for all API input validation

import { z } from 'zod';

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'cashier', 'stock_manager', 'technician']),
  phone: z.string().optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────
export const CreateProductSchema = z.preprocess((val) => {
  if (val && typeof val === 'object') {
    const copy = { ...val };
    if (copy.selling_price !== undefined && copy.retail_price === undefined) {
      copy.retail_price = copy.selling_price;
    }
    if (copy.is_serialized !== undefined) {
      copy.is_serialized = copy.is_serialized === true || copy.is_serialized === 'true';
    }
    if (copy.is_active !== undefined) {
      copy.is_active = copy.is_active !== false && copy.is_active !== 'false';
    }
    if (copy.purchase_cost !== undefined && copy.purchase_cost !== '') copy.purchase_cost = Number(copy.purchase_cost);
    if (copy.retail_price !== undefined && copy.retail_price !== '') copy.retail_price = Number(copy.retail_price);
    if (copy.wholesale_price !== undefined && copy.wholesale_price !== '') copy.wholesale_price = Number(copy.wholesale_price);
    if (copy.stock_quantity !== undefined && copy.stock_quantity !== '') copy.stock_quantity = Number(copy.stock_quantity);
    if (copy.min_stock_level !== undefined && copy.min_stock_level !== '') copy.min_stock_level = Number(copy.min_stock_level);
    if (copy.warranty_months !== undefined && !copy.warranty_duration) copy.warranty_duration = String(copy.warranty_months);
    return copy;
  }
  return val;
}, z.object({
  name: z.string().min(1, 'Product name is required'),
  brand_id: z.string().min(1, 'Brand is required'),
  category_id: z.string().min(1, 'Category is required'),
  subcategory_id: z.string().optional().default(''),
  model: z.string().optional().default(''),
  sku: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  description: z.string().optional().default(''),
  supplier_id: z.string().optional().default(''),
  purchase_cost: z.number().min(0, 'Cost cannot be negative'),
  retail_price: z.number().min(0, 'Price cannot be negative'),
  wholesale_price: z.number().min(0).optional().default(0),
  stock_quantity: z.number().min(0).default(0),
  min_stock_level: z.number().min(0).default(0),
  storage_location: z.string().optional().default(''),
  is_serialized: z.boolean().default(false),
  is_active: z.boolean().default(true),
  product_type: z.enum(['phone', 'accessory', 'other']).optional().default('accessory'),
  // Phone-specific
  ram: z.string().optional().default(''),
  internal_storage: z.string().optional().default(''),
  color: z.string().optional().default(''),
  condition: z.enum(['new', 'used', 'refurbished']).optional().default('new'),
  warranty_duration: z.string().optional().default(''),
  network_config: z.string().optional().default(''),
}));

export const UpdateProductSchema = z.preprocess((val) => {
  if (val && typeof val === 'object') {
    const copy = { ...val };
    if (copy.selling_price !== undefined && copy.retail_price === undefined) {
      copy.retail_price = copy.selling_price;
    }
    if (copy.is_serialized !== undefined) {
      copy.is_serialized = copy.is_serialized === true || copy.is_serialized === 'true';
    }
    if (copy.is_active !== undefined) {
      copy.is_active = copy.is_active !== false && copy.is_active !== 'false';
    }
    if (copy.purchase_cost !== undefined && copy.purchase_cost !== '') copy.purchase_cost = Number(copy.purchase_cost);
    if (copy.retail_price !== undefined && copy.retail_price !== '') copy.retail_price = Number(copy.retail_price);
    if (copy.wholesale_price !== undefined && copy.wholesale_price !== '') copy.wholesale_price = Number(copy.wholesale_price);
    if (copy.stock_quantity !== undefined && copy.stock_quantity !== '') copy.stock_quantity = Number(copy.stock_quantity);
    if (copy.min_stock_level !== undefined && copy.min_stock_level !== '') copy.min_stock_level = Number(copy.min_stock_level);
    return copy;
  }
  return val;
}, z.object({
  name: z.string().min(1, 'Product name is required').optional(),
  brand_id: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  model: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  supplier_id: z.string().optional(),
  purchase_cost: z.number().min(0).optional(),
  retail_price: z.number().min(0).optional(),
  wholesale_price: z.number().min(0).optional(),
  stock_quantity: z.number().min(0).optional(),
  min_stock_level: z.number().min(0).optional(),
  storage_location: z.string().optional(),
  is_serialized: z.boolean().optional(),
  is_active: z.boolean().optional(),
  product_type: z.enum(['phone', 'accessory', 'other']).optional(),
  ram: z.string().optional(),
  internal_storage: z.string().optional(),
  color: z.string().optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  warranty_duration: z.string().optional(),
  network_config: z.string().optional(),
}));

// ─────────────────────────────────────────────
// CATEGORIES / BRANDS
// ─────────────────────────────────────────────
export const CategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  is_active: z.boolean().default(true),
});

export const SubcategorySchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  is_active: z.boolean().default(true),
});

export const BrandSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().default(''),
  is_active: z.boolean().default(true),
});

// ─────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────
export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contact_person: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ─────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────
export const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  address: z.string().optional().default(''),
  customer_type: z.enum(['walk_in', 'registered', 'wholesale']).default('registered'),
  notes: z.string().optional().default(''),
});

// ─────────────────────────────────────────────
// PURCHASES
// ─────────────────────────────────────────────
const PurchaseItemSchema = z.object({
  product_id: z.string().min(1),

  serial_id: z.string().optional().default(''),
  imei1: z.string().optional().default(''),
  imei2: z.string().optional().default(''),
  serial_number: z.string().optional().default(''),
  quantity: z.number().int().min(1),
  unit_cost: z.number().min(0),
  discount: z.number().min(0).default(0),
});

export const CreatePurchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  purchase_date: z.string().min(1, 'Date is required'),
  items: z.array(PurchaseItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).default(0),
  additional_costs: z.number().min(0).default(0),
  amount_paid: z.number().min(0).default(0),
  payment_method: z.string().optional().default('cash'),
  reference_number: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ─────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────
const SaleItemSchema = z.object({
  product_name: z.string().optional().default(''),
  model: z.string().optional().default(''),
  brand: z.string().optional().default(''),
  is_custom: z.boolean().optional().default(false),
  product_id: z.string().min(1),

  serial_id: z.string().optional().default(''),
  imei1: z.string().optional().default(''),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0),
  discount: z.number().min(0).default(0),
});

export const CreateSaleSchema = z.object({
  customer_id: z.string().optional().default('WALK_IN'),
  sale_date: z.string().min(1),
  items: z.array(SaleItemSchema).min(1, 'Cart cannot be empty'),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  amount_paid: z.number().min(0),
  payment_methods: z.array(z.object({
    method: z.string(),
    amount: z.number().min(0),
    reference: z.string().optional().default(''),
  })).min(1),
  notes: z.string().optional().default(''),
  idempotency_key: z.string().min(1, 'Idempotency key is required'),
});

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────
export const CreatePaymentSchema = z.object({
  payment_type: z.enum(['customer_receipt', 'supplier_payment']),
  related_id: z.string().min(1),
  party_id: z.string().min(1),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'mobile_payment']),
  reference_number: z.string().optional().default(''),
  payment_date: z.string().min(1),
  notes: z.string().optional().default(''),
  idempotency_key: z.string().min(1),
});

// ─────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────
export const ExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  expense_date: z.string().min(1, 'Date is required'),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'mobile_payment']).default('cash'),
  reference_number: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ─────────────────────────────────────────────
// REPAIRS
// ─────────────────────────────────────────────
export const CreateRepairSchema = z.object({
  customer_id: z.string().optional().default(''),
  customer_name: z.string().min(1, 'Customer name required'),
  customer_phone: z.string().optional().default(''),
  brand: z.string().min(1, 'Brand required'),
  model: z.string().min(1, 'Model required'),
  imei: z.string().optional().default(''),
  reported_problem: z.string().min(1, 'Problem description required'),
  device_condition: z.string().optional().default(''),
  accessories_received: z.string().optional().default(''),
  assigned_technician_id: z.string().optional().default(''),
  estimated_cost: z.number().min(0).default(0),
  expected_completion: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

export const UpdateRepairSchema = z.object({
  status: z.enum(['received', 'diagnosing', 'waiting_parts', 'in_progress', 'ready', 'collected', 'cancelled']).optional(),
  diagnosis: z.string().optional(),
  final_cost: z.number().min(0).optional(),
  labor_charges: z.number().min(0).optional(),
  assigned_technician_id: z.string().optional(),
  notes: z.string().optional(),
  completed_date: z.string().optional(),
});

// ─────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────
export const ProcessReturnSchema = z.object({
  sale_id: z.string().min(1, 'Original sale ID is required'),
  return_type: z.enum(['exchange_same', 'exchange_diff', 'cash_refund']),
  returned_item: z.object({
    item_id: z.string().optional().default(''),
    product_id: z.string().min(1, 'Product ID is required'),
    product_name: z.string().optional().default(''),
    quantity: z.number().int().min(1, 'Return quantity must be at least 1'),
    condition: z.enum(['restock', 'damaged']).default('restock'),
    serial_id: z.string().optional().default(''),
    imei1: z.string().optional().default(''),
  }),
  exchange_item: z.object({
    product_id: z.string().min(1, 'Exchange product ID is required'),
    quantity: z.number().int().min(1, 'Exchange quantity must be at least 1').default(1),
  }).optional().nullable(),
  reason: z.string().min(1, 'Return reason is required'),
  refund_amount: z.number().min(0).optional().default(0),
  difference_amount: z.number().optional().default(0),
  payment_method: z.string().optional().default('cash'),
  reference_number: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  idempotency_key: z.string().optional().default(''),
});

export const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional().default(''),
});

// Helper to validate and return parsed data or throw formatted error
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    const err = new Error('Validation failed');
    err.statusCode = 422;
    err.validationErrors = errors;
    throw err;
  }
  return result.data;
}
