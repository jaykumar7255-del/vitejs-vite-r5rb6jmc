import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, CSSProperties } from 'react';
import { supabase } from './supabase';

type Business = {
  id: string;
  owner_id?: string;
  company_name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  logo_url?: string | null;
  letterhead_url?: string | null;
};

type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  created_at: string;
};

type Product = {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  gst_rate: number;
  stock: number;
  created_at: string;
};

type InvoiceItem = {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  rate: number;
  gst_rate: number;
  gst_amount: number;
  amount: number;
};

type Invoice = {
  id: string;
  business_id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  sale_time: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_status: string;
  created_at: string;
  customers?: { name: string; phone: string | null } | null;
};

type CartLine = {
  product_id: string;
  quantity: string;
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
  color: '#111827',
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
};

const buttonStyle: CSSProperties = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const panelStyle: CSSProperties = {
  background: '#fff',
  padding: 22,
  borderRadius: 14,
  border: '1px solid #e5e7eb',
  marginBottom: 20,
};

const cellStyle: CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'left',
};

const emptyProduct = {
  name: '',
  sku: '',
  unit: 'PCS',
  purchase_price: '0',
  selling_price: '0',
  gst_rate: '18',
  stock: '0',
};

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')}`;
};

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const safeNumber = (value: unknown) => Number(value || 0);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [business, setBusiness] = useState<Business | null>(null);
  const [profile, setProfile] = useState({
    company_name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    logo_url: '',
    letterhead_url: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null
  );
  const [customerSearch, setCustomerSearch] = useState('');

  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'products' | 'profile' | 'customers' | 'invoice' | 'history'
  >('dashboard');

  const [invoiceCustomer, setInvoiceCustomer] = useState('');
  const [cart, setCart] = useState<CartLine[]>([
    { product_id: '', quantity: '1' },
  ]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<
    'classic' | 'modern' | 'minimal' | 'corporate'
  >('classic');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      void loadBusiness(user.id);
    } else {
      setBusiness(null);
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setInvoiceItems([]);
    }
  }, [user]);

  async function loadBusiness(userId: string) {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      setError('Failed to load company profile: ' + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      const company = data as Business;
      setBusiness(company);
      setProfile({
        company_name: company.company_name ?? '',
        address: company.address ?? '',
        gstin: company.gstin ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        logo_url: company.logo_url ?? '',
        letterhead_url: company.letterhead_url ?? '',
      });

      await Promise.all([
        loadProducts(company.id),
        loadCustomers(company.id),
        loadInvoices(company.id),
      ]);
    } else {
      setBusiness(null);
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setProfile({
        company_name: '',
        address: '',
        gstin: '',
        phone: '',
        email: user?.email ?? '',
        logo_url: '',
        letterhead_url: '',
      });
    }

    setLoading(false);
  }

  async function loadProducts(businessId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load products: ' + error.message);
      return;
    }

    setProducts((data ?? []) as Product[]);
  }

  async function loadCustomers(businessId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Failed to load customers: ' + error.message);
      return;
    }

    setCustomers((data ?? []) as Customer[]);
  }

  async function loadInvoices(businessId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers(name, phone)')
      .eq('business_id', businessId)
      .order('sale_time', { ascending: false });

    if (error) {
      setError('Failed to load sales history: ' + error.message);
      return;
    }

    setInvoices((data ?? []) as Invoice[]);
  }

  async function loadInvoiceItems(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId);

    if (error) {
      setError('Failed to load invoice details: ' + error.message);
      return [];
    }

    return (data ?? []) as InvoiceItem[];
  }

  function resetCustomerForm() {
    setCustomerForm(emptyCustomer);
    setEditingCustomerId(null);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!business) {
      setError('Please save your company profile first.');
      setActiveTab('profile');
      return;
    }

    if (!customerForm.name.trim()) {
      setError('Please enter the customer name.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const customerData = {
      business_id: business.id,
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || null,
      email: customerForm.email.trim() || null,
      address: customerForm.address.trim() || null,
      gstin: customerForm.gstin.trim() || null,
    };

    const result = editingCustomerId
      ? await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomerId)
          .eq('business_id', business.id)
          .select()
          .single()
      : await supabase.from('customers').insert(customerData).select().single();

    if (result.error) {
      setError('Failed to save customer: ' + result.error.message);
    } else {
      setMessage(
        editingCustomerId
          ? 'Customer updated successfully. ✅'
          : 'Customer added successfully. ✅'
      );
      resetCustomerForm();
      await loadCustomers(business.id);
    }

    setLoading(false);
  }

  function editCustomer(customer: Customer) {
    setCustomerForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      gstin: customer.gstin ?? '',
    });
    setEditingCustomerId(customer.id);
    setActiveTab('customers');
  }

  async function deleteCustomer(customer: Customer) {
    if (!business) return;
    if (!window.confirm(`Are you sure you want to delete "${customer.name}"?`))
      return;

    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id)
      .eq('business_id', business.id);

    if (error) {
      setError('Failed to delete customer: ' + error.message);
    } else {
      setMessage('Customer deleted successfully. ✅');
      await loadCustomers(business.id);
      if (editingCustomerId === customer.id) resetCustomerForm();
    }

    setLoading(false);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });

      if (error) {
        setError('Sign-up failed: ' + error.message);
      } else {
        setMessage(
          'Sign-up request submitted. If email confirmation is enabled, check your inbox. ✅'
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) setError('Login failed: ' + error.message);
    }

    setLoading(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setMessage('');

    const profileData = {
      owner_id: user.id,
      company_name: profile.company_name.trim(),
      address: profile.address.trim(),
      gstin: profile.gstin.trim(),
      phone: profile.phone.trim(),
      email: profile.email.trim(),
      logo_url: profile.logo_url.trim(),
      letterhead_url: profile.letterhead_url.trim(),
    };

    const result = business
      ? await supabase
          .from('businesses')
          .update(profileData)
          .eq('id', business.id)
          .select()
          .single()
      : await supabase.from('businesses').insert(profileData).select().single();

    if (result.error) {
      setError('Failed to save company profile: ' + result.error.message);
    } else {
      const saved = result.data as Business;
      setBusiness(saved);
      setMessage('Company profile saved successfully. ✅');
      await Promise.all([
        loadProducts(saved.id),
        loadCustomers(saved.id),
        loadInvoices(saved.id),
      ]);
    }

    setLoading(false);
  }

  function resetProductForm() {
    setProductForm(emptyProduct);
    setEditingId(null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!business) {
      setError('Please save your company profile first.');
      setActiveTab('profile');
      return;
    }

    if (!productForm.name.trim()) {
      setError('Please enter the product name.');
      return;
    }

    const purchasePrice = Number(productForm.purchase_price);
    const sellingPrice = Number(productForm.selling_price);
    const gstRate = Number(productForm.gst_rate);
    const stock = Number(productForm.stock);

    if (
      ![purchasePrice, sellingPrice, gstRate, stock].every(Number.isFinite) ||
      purchasePrice < 0 ||
      sellingPrice < 0 ||
      gstRate < 0 ||
      gstRate > 100 ||
      stock < 0
    ) {
      setError('Please check the price, GST rate, and stock values.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const productData = {
      business_id: business.id,
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || null,
      unit: productForm.unit.trim() || 'PCS',
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      gst_rate: gstRate,
      stock,
    };

    const result = editingId
      ? await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId)
          .eq('business_id', business.id)
          .select()
          .single()
      : await supabase.from('products').insert(productData).select().single();

    if (result.error) {
      setError('Failed to save product: ' + result.error.message);
    } else {
      setMessage(
        editingId
          ? 'Product updated successfully. ✅'
          : 'Product added successfully. ✅'
      );
      resetProductForm();
      await loadProducts(business.id);
    }

    setLoading(false);
  }

  function editProduct(product: Product) {
    setProductForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      unit: product.unit ?? 'PCS',
      purchase_price: String(product.purchase_price ?? 0),
      selling_price: String(product.selling_price ?? 0),
      gst_rate: String(product.gst_rate ?? 0),
      stock: String(product.stock ?? 0),
    });
    setEditingId(product.id);
    setActiveTab('products');
  }

  async function deleteProduct(product: Product) {
    if (!business) return;
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`))
      return;

    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .eq('business_id', business.id);

    if (error) {
      setError('Failed to delete product: ' + error.message);
    } else {
      setMessage('Product deleted successfully. ✅');
      await loadProducts(business.id);
      if (editingId === product.id) resetProductForm();
    }

    setLoading(false);
  }

  function updateCart(index: number, field: keyof CartLine, value: string) {
    setCart((old) =>
      old.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  function addCartLine() {
    setCart((old) => [...old, { product_id: '', quantity: '1' }]);
  }

  function removeCartLine(index: number) {
    setCart((old) =>
      old.length <= 1
        ? [{ product_id: '', quantity: '1' }]
        : old.filter((_, i) => i !== index)
    );
  }

  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;

    const lines = cart.map((line) => {
      const product = products.find((p) => p.id === line.product_id);
      const quantity = Number(line.quantity);
      const rate = Number(product?.selling_price ?? 0);
      const gstRate = Number(product?.gst_rate ?? 0);
      const base =
        product && quantity > 0 ? Math.round(quantity * rate * 100) / 100 : 0;
      const gst = Math.round(base * gstRate) / 100;

      subtotal += base;
      tax += gst;

      return {
        ...line,
        product,
        quantity,
        rate,
        gstRate,
        base,
        gst,
        total: base + gst,
      };
    });

    return {
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100,
    };
  }, [cart, products]);

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!business) {
      setError('Please save your company profile first.');
      setActiveTab('profile');
      return;
    }

    if (!invoiceCustomer) {
      setError('Please select a customer.');
      return;
    }

    if (
      cart.some(
        (line) =>
          !line.product_id ||
          !Number.isFinite(Number(line.quantity)) ||
          Number(line.quantity) <= 0
      )
    ) {
      setError(
        'Please select a product and enter a valid quantity for every row.'
      );
      return;
    }

    const quantities = new Map<string, number>();
    for (const line of cart) {
      quantities.set(
        line.product_id,
        (quantities.get(line.product_id) ?? 0) + Number(line.quantity)
      );
    }

    for (const [productId, quantity] of quantities) {
      const product = products.find((p) => p.id === productId);
      if (!product || quantity > Number(product.stock)) {
        setError(
          `Insufficient stock for ${
            product?.name ?? 'a selected product'
          }. Available stock: ${product?.stock ?? 0}.`
        );
        return;
      }
    }

    const invoiceNumber = `INV-${Date.now()}`;

    setLoading(true);
    setError('');
    setMessage('');

    const { data, error } = await supabase.rpc('create_sales_invoice', {
      p_business_id: business.id,
      p_customer_id: invoiceCustomer,
      p_invoice_number: invoiceNumber,
      p_items: cart.map((line) => ({
        product_id: line.product_id,
        quantity: Number(line.quantity),
      })),
    });

    if (error) {
      setError('Invoice could not be saved: ' + error.message);
    } else {
      setMessage(
        `Invoice ${invoiceNumber} saved successfully. Stock updated. ✅`
      );
      setInvoiceCustomer('');
      setCart([{ product_id: '', quantity: '1' }]);
      await Promise.all([loadProducts(business.id), loadInvoices(business.id)]);
      setActiveTab('history');

      const { data: savedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*, customers(name, phone)')
        .eq('id', data)
        .eq('business_id', business.id)
        .single();

      if (!invoiceError && savedInvoice) {
        setSelectedInvoice(savedInvoice as Invoice);
        const items = await loadInvoiceItems(data as string);
        setInvoiceItems(items);
      }
    }

    setLoading(false);
  }

  async function viewInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setInvoiceItems(await loadInvoiceItems(invoice.id));
  }

  function printInvoice(
    invoice: Invoice,
    items: InvoiceItem[],
    existingWindow?: Window | null
  ) {
    if (!business) return;

    const printWindow =
      existingWindow ?? window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      setError('Please allow pop-ups to print or save your invoice as PDF.');
      return;
    }

    const customer = customers.find((c) => c.id === invoice.customer_id);

    const itemRows = items
      .map(
        (item, index) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${
              index + 1
            }</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              item.description
            )}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${safeNumber(
              item.quantity
            )}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${money(
              safeNumber(item.rate)
            )}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${safeNumber(
              item.gst_rate
            )}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${money(
              safeNumber(item.amount)
            )}</td>
          </tr>`
      )
      .join('');

    // Theme based styles & layout definition
    let themeStyles = '';
    let headerLayout = '';

    if (selectedTheme === 'classic') {
      themeStyles = `
        body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 25px; background: #fff; }
        .invoice-box { border: 2px solid #333; padding: 20px; }
        th { background: #333; color: #fff; border: 1px solid #333; padding: 8px; }
        td { border: 1px solid #ccc; }
      `;
      headerLayout = `
        <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
          ${
            business.logo_url
              ? `<img src="${business.logo_url}" style="max-height: 60px; margin-bottom: 5px;" /><br/>`
              : ''
          }
          <h1 style="margin: 0; font-size: 24px; text-transform: uppercase;">${escapeHtml(
            business.company_name
          )}</h1>
          <p style="margin: 4px 0; font-size: 13px;">${escapeHtml(
            business.address
          )} | Phone: ${escapeHtml(business.phone)}</p>
          ${
            business.gstin
              ? `<p style="margin: 0; font-size: 13px;"><strong>GSTIN:</strong> ${escapeHtml(
                  business.gstin
                )}</p>`
              : ''
          }
        </div>
      `;
    } else if (selectedTheme === 'modern') {
      themeStyles = `
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; padding: 30px; background: #f8fafc; }
        .invoice-box { background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        th { background: #2563eb; color: #fff; padding: 12px; }
        td { border-bottom: 1px solid #e2e8f0; }
      `;
      headerLayout = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px;">
          <div>
            ${
              business.logo_url
                ? `<img src="${business.logo_url}" style="max-height: 65px; margin-bottom: 8px;" /><br/>`
                : ''
            }
            <h2 style="margin: 0; color: #2563eb; font-size: 26px;">${escapeHtml(
              business.company_name
            )}</h2>
            <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">${escapeHtml(
              business.address
            )}<br/>Phone: ${escapeHtml(business.phone)} | Email: ${escapeHtml(
        business.email
      )}</p>
            ${
              business.gstin
                ? `<p style="margin: 4px 0; font-size: 13px; color: #4b5563;"><strong>GSTIN:</strong> ${escapeHtml(
                    business.gstin
                  )}</p>`
                : ''
            }
          </div>
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #1e293b; font-size: 28px;">TAX INVOICE</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #64748b;"><strong>#</strong> ${escapeHtml(
              invoice.invoice_number
            )}<br/><strong>Date:</strong> ${invoice.invoice_date}</p>
          </div>
        </div>
      `;
    } else if (selectedTheme === 'minimal') {
      themeStyles = `
        body { font-family: Arial, sans-serif; color: #111; padding: 30px; background: #fff; }
        .invoice-box { padding: 10px; }
        th { background: #f3f4f6; color: #111; border-bottom: 2px solid #111; padding: 10px; }
        td { border-bottom: 1px solid #e5e7eb; }
      `;
      headerLayout = `
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">${escapeHtml(
            business.company_name
          )}</h2>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${escapeHtml(
            business.address
          )} | GSTIN: ${escapeHtml(business.gstin || 'N/A')}</p>
          <hr style="border: none; border-top: 1px solid #111; margin: 15px 0;" />
          <div style="display: flex; justify-content: space-between;">
            <div><strong>Invoice:</strong> ${escapeHtml(
              invoice.invoice_number
            )}</div>
            <div><strong>Date:</strong> ${invoice.invoice_date}</div>
          </div>
        </div>
      `;
    } else {
      // Corporate Theme
      themeStyles = `
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 30px; background: #fff; }
        .invoice-box { background: #fff; border-top: 6px solid #0f172a; padding: 25px; }
        th { background: #0f172a; color: #fff; padding: 10px; }
        td { border-bottom: 1px solid #cbd5e1; }
      `;
      headerLayout = `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div>
            ${
              business.logo_url
                ? `<img src="${business.logo_url}" style="max-height: 55px; margin-bottom: 5px;" /><br/>`
                : ''
            }
            <h2 style="margin: 0; color: #0f172a;">${escapeHtml(
              business.company_name
            )}</h2>
            <p style="margin: 2px 0; font-size: 12px; color: #475569;">${escapeHtml(
              business.address
            )}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: #0f172a; color: #fff; padding: 6px 12px; font-weight: bold; font-size: 12px; border-radius: 4px;">INVOICE</span>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>No:</strong> ${escapeHtml(
              invoice.invoice_number
            )}<br/><strong>Date:</strong> ${invoice.invoice_date}</p>
          </div>
        </div>
      `;
    }

    // Letterhead background wrapper styling if uploaded
    const letterheadBg = business.letterhead_url
      ? `background-image: url('${business.letterhead_url}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
      : '';

    const invoiceHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${escapeHtml(invoice.invoice_number)}</title>
          <style>
            ${themeStyles}
            body { ${letterheadBg} }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { text-align: left; }
            .totals { margin-top: 20px; float: right; width: 300px; font-size: 14px; }
            .totals div { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            ${headerLayout}

            <div style="margin-bottom: 20px; background: rgba(255,255,255,0.85); padding: 10px; border-radius: 6px;">
              <h4 style="margin: 0 0 5px 0; color: #1e293b;">Billed To:</h4>
              <p style="margin: 0; font-size: 14px;">
                <strong>${escapeHtml(
                  customer?.name ||
                    invoice.customers?.name ||
                    'Walk-in Customer'
                )}</strong><br/>
                ${
                  customer?.address
                    ? `${escapeHtml(customer.address)}<br/>`
                    : ''
                }
                ${
                  customer?.phone
                    ? `Phone: ${escapeHtml(customer.phone)}<br/>`
                    : ''
                }
                ${customer?.gstin ? `GSTIN: ${escapeHtml(customer.gstin)}` : ''}
              </p>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Item Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">GST</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="totals">
              <div><span>Subtotal:</span> <strong>${money(
                safeNumber(invoice.subtotal)
              )}</strong></div>
              <div><span>Tax (GST):</span> <strong>${money(
                safeNumber(invoice.tax_amount)
              )}</strong></div>
              <div class="grand-total"><span>Grand Total:</span> <span>${money(
                safeNumber(invoice.total)
              )}</span></div>
            </div>
            <div style="clear: both;"></div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    });
  }

  async function uploadCompanyFile(file: File, type: 'logo' | 'letterhead') {
    if (!business) {
      setError('Please save your company profile first.');
      return;
    }

    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'Please upload an image file (PNG, JPG, WEBP, or SVG) from your gallery.'
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError('File size must be 5 MB or less.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'file';
    const filePath = `${business.id}/${type}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError('Upload failed: ' + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath);

    const url = data.publicUrl;

    const { error: updateError } = await supabase
      .from('businesses')
      .update(type === 'logo' ? { logo_url: url } : { letterhead_url: url })
      .eq('id', business.id);

    if (updateError) {
      setError(
        'File uploaded, but profile update failed: ' + updateError.message
      );
      return;
    }

    setBusiness({
      ...business,
      ...(type === 'logo' ? { logo_url: url } : { letterhead_url: url }),
    });

    setMessage(
      type === 'logo'
        ? 'Company logo uploaded successfully from gallery! ✅'
        : 'Letterhead image uploaded successfully from gallery! ✅'
    );
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError('Logout failed: ' + error.message);
    } else {
      setBusiness(null);
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setInvoiceItems([]);
      setMessage('');
      setError('');
    }
  }

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(term) ||
      (product.sku ?? '').toLowerCase().includes(term)
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    const term = customerSearch.toLowerCase().trim();
    return (
      customer.name.toLowerCase().includes(term) ||
      (customer.phone ?? '').toLowerCase().includes(term) ||
      (customer.email ?? '').toLowerCase().includes(term)
    );
  });

  const filteredInvoices = invoices.filter((invoice) => {
    const term = invoiceSearch.toLowerCase().trim();
    const customerName = invoice.customers?.name ?? '';
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(term) ||
      customerName.toLowerCase().includes(term);
    const matchesFrom = !historyFrom || invoice.invoice_date >= historyFrom;
    const matchesTo = !historyTo || invoice.invoice_date <= historyTo;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalStock = products.reduce(
    (total, product) => total + safeNumber(product.stock),
    0
  );

  const stockValue = products.reduce(
    (total, product) =>
      total + safeNumber(product.stock) * safeNumber(product.purchase_price),
    0
  );

  if (authLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>Loading Invoxa...</div>
    );
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          background: '#f3f6fb',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <form
          onSubmit={handleAuth}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: 28,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 30px #00000010',
            boxSizing: 'border-box',
          }}
        >
          <h1 style={{ marginTop: 0, color: '#1d4ed8' }}>Invoxa</h1>
          <p style={{ color: '#6b7280' }}>Billing & Inventory Management</p>
          <h2>{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
          <label style={labelStyle}>Email Address</label>
          <input
            style={{ ...inputStyle, marginBottom: 16 }}
            type="email"
            required
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label style={labelStyle}>Password</label>
          <input
            style={{ ...inputStyle, marginBottom: 18 }}
            type="password"
            required
            minLength={6}
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
          {error && <p style={{ color: '#dc2626' }}>{error}</p>}
          {message && <p style={{ color: '#15803d' }}>{message}</p>}
          <button style={{ ...buttonStyle, width: '100%' }} disabled={loading}>
            {loading
              ? 'Please wait...'
              : authMode === 'login'
              ? 'Login'
              : 'Sign Up'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 14 }}>
            {authMode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setError('');
                setMessage('');
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </form>
      </main>
    );
  }

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['products', 'Products & Inventory'],
    ['profile', 'Company Profile'],
    ['customers', 'Customers'],
    ['invoice', 'Sales Invoice'],
    ['history', 'Sales History'],
  ] as const;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        fontFamily: 'Arial, sans-serif',
        color: '#111827',
      }}
    >
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 4%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#1d4ed8' }}>Invoxa</h1>
          <span style={{ color: '#6b7280', fontSize: 13 }}>
            {business?.company_name || 'Set Up Your Company Profile'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map(([key, label]) => (
            <button
              key={key}
              style={{
                ...buttonStyle,
                background: activeTab === key ? '#2563eb' : '#e5e7eb',
                color: activeTab === key ? '#fff' : '#111827',
              }}
              onClick={() => {
                setActiveTab(key);
                setError('');
                setMessage('');
              }}
            >
              {label}
            </button>
          ))}
          <button
            style={{ ...buttonStyle, background: '#374151' }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4%' }}>
        {activeTab === 'dashboard' && (
          <section>
            <h2>Dashboard</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              {[
                {
                  title: 'Total Products',
                  value: String(products.length),
                },
                {
                  title: 'Total Customers',
                  value: String(customers.length),
                },
                {
                  title: 'Total Invoices',
                  value: String(invoices.length),
                },
                {
                  title: 'Total Sales',
                  value: money(
                    invoices.reduce(
                      (sum, invoice) => sum + safeNumber(invoice.total),
                      0
                    )
                  ),
                },
                {
                  title: 'Stock Units',
                  value: String(totalStock),
                },
                {
                  title: 'Low Stock Products',
                  value: String(
                    products.filter((product) => product.stock <= 5).length
                  ),
                },
              ].map((item) => (
                <div key={item.title} style={panelStyle}>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <section style={panelStyle}>
              <h3>Recent Sales</h3>

              {invoices.length === 0 ? (
                <p>No sales recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={cellStyle}>Invoice No.</th>
                        <th style={cellStyle}>Date</th>
                        <th style={cellStyle}>Customer</th>
                        <th style={cellStyle}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.slice(0, 5).map((invoice) => (
                        <tr key={invoice.id}>
                          <td style={cellStyle}>{invoice.invoice_number}</td>
                          <td style={cellStyle}>{invoice.invoice_date}</td>
                          <td style={cellStyle}>
                            {invoice.customers?.name || 'Customer'}
                          </td>
                          <td style={cellStyle}>
                            {money(safeNumber(invoice.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                style={{ ...buttonStyle, marginTop: 15 }}
                onClick={() => setActiveTab('history')}
              >
                View All Sales
              </button>
            </section>
          </section>
        )}

        {activeTab === 'profile' && (
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Company Profile & Gallery Assets</h2>
            {error && <p style={{ color: '#dc2626' }}>{error}</p>}
            {message && <p style={{ color: '#15803d' }}>{message}</p>}

            <form onSubmit={saveProfile}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Company Name *</label>
                  <input
                    style={inputStyle}
                    required
                    value={profile.company_name}
                    onChange={(e) =>
                      setProfile({ ...profile, company_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>GSTIN</label>
                  <input
                    style={inputStyle}
                    value={profile.gstin}
                    onChange={(e) =>
                      setProfile({ ...profile, gstin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    style={inputStyle}
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company Email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80 }}
                    value={profile.address}
                    onChange={(e) =>
                      setProfile({ ...profile, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <button
                style={{ ...buttonStyle, marginTop: 20 }}
                disabled={loading}
              >
                Save Company Profile
              </button>
            </form>

            {business && (
              <div
                style={{
                  marginTop: 30,
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: 20,
                }}
              >
                <h3>Upload Logo & Letterhead from Gallery</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 20,
                    marginTop: 15,
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: 15,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <label style={labelStyle}>Company Logo</label>
                    {business.logo_url && (
                      <img
                        src={business.logo_url}
                        alt="Logo"
                        style={{
                          maxHeight: 50,
                          marginBottom: 10,
                          display: 'block',
                        }}
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCompanyFile(file, 'logo');
                      }}
                      style={{ fontSize: 13 }}
                    />
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: 15,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <label style={labelStyle}>
                      Letterhead Background (From Gallery)
                    </label>
                    {business.letterhead_url && (
                      <p
                        style={{
                          color: '#059669',
                          fontSize: 12,
                          marginBottom: 5,
                        }}
                      >
                        Letterhead uploaded successfully! ✅
                      </p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadCompanyFile(file, 'letterhead');
                      }}
                      style={{ fontSize: 13 }}
                    />
                    <small
                      style={{
                        display: 'block',
                        color: '#6b7280',
                        marginTop: 5,
                      }}
                    >
                      Upload custom pre-printed letterhead design image from
                      your phone/PC gallery.
                    </small>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'customers' && (
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>
              {editingCustomerId ? 'Edit Customer' : 'Customers'}
            </h2>
            {!business ? (
              <p>Please save your company profile first.</p>
            ) : (
              <>
                <form onSubmit={saveCustomer}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {(
                      [
                        ['name', 'Customer Name *'],
                        ['phone', 'Mobile Number'],
                        ['email', 'Email Address'],
                        ['gstin', 'GSTIN'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        <input
                          style={inputStyle}
                          type={key === 'email' ? 'email' : 'text'}
                          required={key === 'name'}
                          value={customerForm[key]}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              [key]: e.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Address</label>
                      <textarea
                        style={inputStyle}
                        value={customerForm.address}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginTop: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button style={buttonStyle} disabled={loading}>
                      {editingCustomerId ? 'Update Customer' : 'Add Customer'}
                    </button>
                    {editingCustomerId && (
                      <button
                        type="button"
                        style={{ ...buttonStyle, background: '#6b7280' }}
                        onClick={resetCustomerForm}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
                <h3 style={{ marginTop: 28 }}>
                  Customer List ({customers.length})
                </h3>
                <input
                  style={{ ...inputStyle, maxWidth: 420, marginBottom: 16 }}
                  placeholder="Search by name, mobile, or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        {[
                          'Name',
                          'Mobile',
                          'Email',
                          'GSTIN',
                          'Address',
                          'Actions',
                        ].map((h) => (
                          <th key={h} style={cellStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c) => (
                        <tr key={c.id}>
                          <td style={cellStyle}>{c.name}</td>
                          <td style={cellStyle}>{c.phone || '-'}</td>
                          <td style={cellStyle}>{c.email || '-'}</td>
                          <td style={cellStyle}>{c.gstin || '-'}</td>
                          <td style={cellStyle}>{c.address || '-'}</td>
                          <td style={cellStyle}>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                padding: '7px 9px',
                                marginRight: 5,
                              }}
                              onClick={() => editCustomer(c)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                padding: '7px 9px',
                                background: '#dc2626',
                              }}
                              onClick={() => deleteCustomer(c)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredCustomers.length === 0 && <p>No customers found.</p>}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'products' && (
          <>
            {!business ? (
              <section style={panelStyle}>
                <h2>Company Profile Required</h2>
                <button
                  style={buttonStyle}
                  onClick={() => setActiveTab('profile')}
                >
                  Open Company Profile
                </button>
              </section>
            ) : (
              <>
                <h2>Products & Inventory</h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {[
                    { title: 'Total Products', value: String(products.length) },
                    { title: 'Total Stock Units', value: String(totalStock) },
                    { title: 'Stock Purchase Value', value: money(stockValue) },
                  ].map((item) => (
                    <div key={item.title} style={panelStyle}>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>
                        {item.title}
                      </div>
                      <div
                        style={{ fontSize: 23, fontWeight: 700, marginTop: 8 }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <section style={panelStyle}>
                  <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                  <form onSubmit={saveProduct}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(190px, 1fr))',
                        gap: 16,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Product Name *</label>
                        <input
                          style={inputStyle}
                          required
                          value={productForm.name}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>SKU / Product Code</label>
                        <input
                          style={inputStyle}
                          value={productForm.sku}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              sku: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Unit</label>
                        <select
                          style={inputStyle}
                          value={productForm.unit}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              unit: e.target.value,
                            })
                          }
                        >
                          {[
                            'PCS',
                            'KG',
                            'G',
                            'Litre',
                            'ML',
                            'Box',
                            'Pack',
                            'Meter',
                            'Dozen',
                            'Other',
                          ].map((unit) => (
                            <option key={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Purchase Price (₹)</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={productForm.purchase_price}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              purchase_price: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Selling Price (₹)</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={productForm.selling_price}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              selling_price: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>GST Rate (%)</label>
                        <select
                          style={inputStyle}
                          value={productForm.gst_rate}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              gst_rate: e.target.value,
                            })
                          }
                        >
                          {['0', '0.1', '0.25', '3', '5', '12', '18', '28'].map(
                            (r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Current Stock</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={productForm.stock}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              stock: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                      <button style={buttonStyle} disabled={loading}>
                        {editingId ? 'Update Product' : 'Save Product'}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          style={{ ...buttonStyle, background: '#6b7280' }}
                          onClick={resetProductForm}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                </section>
                <section style={panelStyle}>
                  <h3>Product List</h3>
                  <input
                    style={{ ...inputStyle, maxWidth: 320, marginBottom: 16 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or SKU..."
                  />
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 13,
                        minWidth: 800,
                      }}
                    >
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          {[
                            'Product',
                            'SKU',
                            'Unit',
                            'Purchase',
                            'Selling',
                            'GST',
                            'Stock',
                            'Actions',
                          ].map((h) => (
                            <th key={h} style={cellStyle}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => (
                          <tr key={p.id}>
                            <td style={cellStyle}>{p.name}</td>
                            <td style={cellStyle}>{p.sku || '-'}</td>
                            <td style={cellStyle}>{p.unit}</td>
                            <td style={cellStyle}>{money(p.purchase_price)}</td>
                            <td style={cellStyle}>{money(p.selling_price)}</td>
                            <td style={cellStyle}>{p.gst_rate}%</td>
                            <td style={cellStyle}>
                              {p.stock} {p.unit}
                            </td>
                            <td style={cellStyle}>
                              <button
                                type="button"
                                style={{
                                  ...buttonStyle,
                                  padding: '7px 9px',
                                  marginRight: 5,
                                }}
                                onClick={() => editProduct(p)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                style={{
                                  ...buttonStyle,
                                  padding: '7px 9px',
                                  background: '#dc2626',
                                }}
                                onClick={() => deleteProduct(p)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredProducts.length === 0 && <p>No products found.</p>}
                </section>
              </>
            )}
          </>
        )}

        {activeTab === 'invoice' && (
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Create Sales Invoice</h2>
            {!business ? (
              <p>Please save your company profile first.</p>
            ) : products.length === 0 || customers.length === 0 ? (
              <p>
                Please add at least one product and one customer before creating
                an invoice.
              </p>
            ) : (
              <form onSubmit={createInvoice}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                  }}
                >
                  <div>
                    <label style={labelStyle}>Customer *</label>
                    <select
                      style={inputStyle}
                      required
                      value={invoiceCustomer}
                      onChange={(e) => setInvoiceCustomer(e.target.value)}
                    >
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` — ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Invoice Date</label>
                    <input
                      style={inputStyle}
                      type="date"
                      value={today()}
                      readOnly
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Invoice Number</label>
                    <input
                      style={inputStyle}
                      value="Auto-generated when saved"
                      readOnly
                    />
                  </div>
                </div>

                <div style={{ marginTop: 20, maxWidth: 300 }}>
                  <label style={labelStyle}>Billing Theme / Template</label>
                  <select
                    style={inputStyle}
                    value={selectedTheme}
                    onChange={(e: any) => setSelectedTheme(e.target.value)}
                  >
                    <option value="classic">
                      Classic (Traditional Border)
                    </option>
                    <option value="modern">Modern (Clean Blue Theme)</option>
                    <option value="minimal">Minimal (Simple & Clean)</option>
                    <option value="corporate">
                      Corporate (Professional Dark)
                    </option>
                  </select>
                </div>

                <h3 style={{ marginTop: 28 }}>Products</h3>
                {cart.map((line, index) => {
                  const p = products.find(
                    (product) => product.id === line.product_id
                  );
                  const totalQty = cart
                    .filter((x) => x.product_id === line.product_id)
                    .reduce((sum, x) => sum + Number(x.quantity || 0), 0);
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(180px, 2fr) minmax(90px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) auto',
                        gap: 10,
                        alignItems: 'end',
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>Product</label>
                        <select
                          style={inputStyle}
                          required
                          value={line.product_id}
                          onChange={(e) =>
                            updateCart(index, 'product_id', e.target.value)
                          }
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock}{' '}
                              {product.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Quantity</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={line.quantity}
                          onChange={(e) =>
                            updateCart(index, 'quantity', e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Rate</label>
                        <input
                          style={inputStyle}
                          readOnly
                          value={p ? money(p.selling_price) : '-'}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Line Total</label>
                        <input
                          style={inputStyle}
                          readOnly
                          value={
                            p ? money(cartTotals.lines[index]?.total ?? 0) : '-'
                          }
                        />
                      </div>
                      <button
                        type="button"
                        style={{
                          ...buttonStyle,
                          background: '#dc2626',
                          padding: '10px',
                        }}
                        onClick={() => removeCartLine(index)}
                      >
                        Remove
                      </button>
                      {p && (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            color:
                              totalQty > Number(p.stock)
                                ? '#b91c1c'
                                : '#6b7280',
                            fontSize: 12,
                          }}
                        >
                          Available stock: {p.stock} {p.unit}. GST: {p.gst_rate}
                          %
                          {totalQty > Number(p.stock)
                            ? ' — quantity exceeds available stock'
                            : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#475569' }}
                  onClick={addCartLine}
                >
                  + Add Another Product
                </button>
                <div
                  style={{
                    maxWidth: 360,
                    marginLeft: 'auto',
                    marginTop: 24,
                    background: '#f9fafb',
                    padding: 18,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span>Subtotal</span>
                    <strong>{money(cartTotals.subtotal)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span>Total GST</span>
                    <strong>{money(cartTotals.tax)}</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 20,
                      borderTop: '1px solid #d1d5db',
                      paddingTop: 12,
                    }}
                  >
                    <strong>Grand Total</strong>
                    <strong>{money(cartTotals.total)}</strong>
                  </div>
                </div>
                <button
                  type="submit"
                  style={{
                    ...buttonStyle,
                    marginTop: 22,
                    padding: '12px 20px',
                  }}
                  disabled={loading || cartTotals.total <= 0}
                >
                  {loading
                    ? 'Saving Invoice...'
                    : 'Save Invoice & Deduct Stock'}
                </button>
              </form>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>Sales History</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
                marginBottom: 18,
              }}
            >
              <div>
                <label style={labelStyle}>Search Invoice / Customer</label>
                <input
                  style={inputStyle}
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="INV-... or customer name"
                />
              </div>
              <div>
                <label style={labelStyle}>From Date</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18, maxWidth: 300 }}>
              <label style={labelStyle}>Select Print Theme</label>
              <select
                style={inputStyle}
                value={selectedTheme}
                onChange={(e: any) => setSelectedTheme(e.target.value)}
              >
                <option value="classic">Classic (Traditional Border)</option>
                <option value="modern">Modern (Clean Blue Theme)</option>
                <option value="minimal">Minimal (Simple & Clean)</option>
                <option value="corporate">Corporate (Professional Dark)</option>
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              <button
                style={buttonStyle}
                onClick={() => business && loadInvoices(business.id)}
              >
                Refresh History
              </button>
              <button
                style={{ ...buttonStyle, background: '#475569' }}
                onClick={() => {
                  setInvoiceSearch('');
                  setHistoryFrom('');
                  setHistoryTo('');
                }}
              >
                Clear Filters
              </button>
              <button
                style={{ ...buttonStyle, background: '#059669' }}
                onClick={() => setActiveTab('invoice')}
              >
                + New Invoice
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  minWidth: 750,
                }}
              >
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    {[
                      'Invoice No.',
                      'Date',
                      'Time',
                      'Customer',
                      'Subtotal',
                      'GST',
                      'Total',
                      'Actions',
                    ].map((h) => (
                      <th key={h} style={cellStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={cellStyle}>{inv.invoice_number}</td>
                      <td style={cellStyle}>{inv.invoice_date}</td>
                      <td style={cellStyle}>
                        {inv.sale_time
                          ? new Date(inv.sale_time).toLocaleTimeString('en-IN')
                          : '-'}
                      </td>
                      <td style={cellStyle}>
                        {inv.customers?.name || 'Customer'}
                      </td>
                      <td style={cellStyle}>
                        {money(safeNumber(inv.subtotal))}
                      </td>
                      <td style={cellStyle}>
                        {money(safeNumber(inv.tax_amount))}
                      </td>
                      <td style={cellStyle}>
                        <strong>{money(safeNumber(inv.total))}</strong>
                      </td>
                      <td style={cellStyle}>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            padding: '7px 9px',
                            marginRight: 5,
                          }}
                          onClick={() => viewInvoice(inv)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            padding: '7px 9px',
                            background: '#059669',
                          }}
                          onClick={async () => {
                            const printWindow = window.open(
                              '',
                              '_blank',
                              'width=900,height=700'
                            );
                            if (!printWindow) {
                              setError('Please allow pop-ups in your browser.');
                              return;
                            }
                            const items = await loadInvoiceItems(inv.id);
                            printInvoice(inv, items, printWindow);
                          }}
                        >
                          Print / PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <p style={{ color: '#6b7280' }}>
                  No invoices found for these filters.
                </p>
              )}
            </div>
            {selectedInvoice && (
              <section
                style={{
                  marginTop: 24,
                  border: '1px solid #d1d5db',
                  padding: 18,
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>
                    Invoice Details: {selectedInvoice.invoice_number}
                  </h3>
                  <button
                    style={{ ...buttonStyle, background: '#6b7280' }}
                    onClick={() => setSelectedInvoice(null)}
                  >
                    Close
                  </button>
                </div>
                <p>
                  <strong>Customer:</strong>{' '}
                  {selectedInvoice.customers?.name ||
                    customers.find((c) => c.id === selectedInvoice.customer_id)
                      ?.name ||
                    'Customer'}
                </p>
                <p>
                  <strong>Date:</strong> {selectedInvoice.invoice_date} |{' '}
                  <strong>Time:</strong>{' '}
                  {new Date(selectedInvoice.sale_time).toLocaleTimeString(
                    'en-IN'
                  )}
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        {[
                          'Product',
                          'Qty',
                          'Rate',
                          'GST %',
                          'GST Amount',
                          'Total',
                        ].map((h) => (
                          <th key={h} style={cellStyle}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item) => (
                        <tr key={item.id}>
                          <td style={cellStyle}>{item.description}</td>
                          <td style={cellStyle}>{item.quantity}</td>
                          <td style={cellStyle}>{money(item.rate)}</td>
                          <td style={cellStyle}>{item.gst_rate}%</td>
                          <td style={cellStyle}>{money(item.gst_amount)}</td>
                          <td style={cellStyle}>{money(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 style={{ textAlign: 'right' }}>
                  Total: {money(safeNumber(selectedInvoice.total))}
                </h3>
                <button
                  style={buttonStyle}
                  onClick={() => printInvoice(selectedInvoice, invoiceItems)}
                >
                  Print / Save as PDF
                </button>
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
