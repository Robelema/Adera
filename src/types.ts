export type Role = 'Owner' | 'Manager' | 'Staff';

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  plan?: string;
  trial_end_date?: string;
  subscription_status?: string;
  owner_id?: number;
  current_shop_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  min_stock_level: number;
}

export interface Transaction {
  id: number;
  type: 'Sale' | 'Expense';
  amount: number;
  description: string;
  date: string;
  category: string;
  staff_id: number;
  customer_id?: number;
  customer_name?: string;
  product_type?: string;
  cash_amount?: number;
  credit_amount?: number;
  online_amount?: number;
  transfer_image?: string;
}

export interface Loan {
  id: number;
  customer_id: number;
  borrower_name: string;
  borrower_phone: string;
  amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'Active' | 'Paid' | 'Overdue';
  created_at: string;
}

export interface DashboardStats {
  totalSales: number;
  totalExpenses: number;
  inventoryItems: number;
  outstandingLoans: number;
}

export type Language = 'en' | 'am';

export const translations = {
  en: {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    transactions: 'Transactions',
    loans: 'Loans',
    customers: 'Customers',
    staff: 'Staff',
    settings: 'Settings',
    sales: 'Sales',
    expenses: 'Expenses',
    total_sales: 'Total Sales',
    total_expenses: 'Total Expenses',
    stock_items: 'Stock Items',
    outstanding_loans: 'Outstanding Loans',
    add_item: 'Add Item',
    add_sale: 'Add Sale',
    add_loan: 'Add Loan',
    add_customer: 'Add Customer',
    name: 'Name',
    sku: 'SKU',
    category: 'Category',
    quantity: 'Quantity',
    price: 'Selling Price',
    cost_price: 'Cost Price',
    min_stock: 'Min Stock',
    status: 'Status',
    actions: 'Actions',
    recent_activity: 'Recent Activity',
    low_stock_alerts: 'Low Stock Alerts',
    currency: 'ETB',
    phone: 'Phone',
    customer: 'Customer',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    reports: 'Reports',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    download: 'Download CSV',
    net_profit: 'Net Profit',
    add_staff: 'Add Staff',
    username: 'Username',
    password: 'Password',
    role: 'Role',
    full_name: 'Full Name',
    product_type: 'Product Type',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    payment_method: 'Payment Method',
    cash: 'Cash',
    credit: 'Credit',
    online_transfer: 'Online Transfer',
    split_payment: 'Split Payment',
    upload_receipt: 'Upload Receipt',
    search: 'Search',
    filter_by_date: 'Filter by Date',
    filter_by_name: 'Filter by Name',
    change_password: 'Change Password',
    old_password: 'Old Password',
    new_password: 'New Password',
    signup: 'Sign Up',
    login: 'Login',
    logout: 'Logout',
    choose_plan: 'Choose Your Plan',
    trial_plan: '15-Day Free Trial',
    basic_plan: 'Basic Plan (500 ETB/mo)',
    pro_plan: 'Pro Plan (1000 ETB/mo)',
    select: 'Select',
    recommended: 'Recommended',
    all_features: 'All Features',
    priority_support: 'Priority Support',
    advanced_reports: 'Advanced Reports',
    days: 'Days',
    already_have_account: 'Already have an account?',
    dont_have_account: 'Don\'t have an account?',
    subscription: 'Subscription',
    plan: 'Plan',
    status_label: 'Status',
    shops: 'Shops',
    add_shop: 'Add Shop',
    shop_name: 'Shop Name',
    address: 'Address',
    switch_shop: 'Switch Shop',
    cloud_storage: 'Cloud Storage',
    link_google_drive: 'Link Google Drive',
    link_onedrive: 'Link OneDrive',
    e2ee: 'End-to-End Encryption (E2EE)',
    encryption_key: 'Encryption Key',
    storage_status: 'Storage Status',
    linked: 'Linked',
    not_linked: 'Not Linked',
    shops_limit: 'Shops Limit',
    users_limit: 'Users Limit',
    audit_logs: 'Audit Logs',
    api_access: 'API Access',
    unlimited: 'Unlimited',
    advanced_analytics: 'Advanced Analytics',
    upgrade: 'Upgrade',
    upgrade_required: 'Upgrade Required',
    trial_expired_msg: 'Your trial has expired. Please upgrade to a paid plan to continue using Adera ERP.',
    active: 'Active',
    trial: 'Trial',
    cancelled: 'Cancelled',
    trial_ends: 'Trial Ends',
    past_due: 'Past Due',
    multi_branch: 'Multi-branch Reporting',
  },
  am: {
    dashboard: 'ዳሽቦርድ',
    inventory: 'ዕቃዎች ዝርዝር',
    transactions: 'እንቅስቃሴዎች',
    loans: 'ብድሮች',
    customers: 'ደንበኞች',
    staff: 'ሰራተኞች',
    settings: 'ቅንብሮች',
    sales: 'ሽያጭ',
    expenses: 'ወጪ',
    total_sales: 'ጠቅላላ ሽያጭ',
    total_expenses: 'ጠቅላላ ወጪ',
    stock_items: 'የዕቃዎች ብዛት',
    outstanding_loans: 'ያልተከፈለ ብድር',
    add_item: 'ዕቃ ጨምር',
    add_sale: 'ሽያጭ መዝግብ',
    add_loan: 'ብድር መዝግብ',
    add_customer: 'ደንበኛ ጨምር',
    name: 'ስም',
    sku: 'መለያ ቁጥር',
    category: 'ምድብ',
    quantity: 'ብዛት',
    price: 'የመሸጫ ዋጋ',
    cost_price: 'የግዢ ዋጋ',
    min_stock: 'ዝቅተኛ መጠን',
    status: 'ሁኔታ',
    actions: 'ድርጊቶች',
    recent_activity: 'የቅርብ ጊዜ እንቅስቃሴዎች',
    low_stock_alerts: 'ያለቁ ዕቃዎች',
    currency: 'ብር',
    phone: 'ስልክ',
    customer: 'ደንበኛ',
    edit: 'አስተካክል',
    delete: 'ሰርዝ',
    save: 'አስቀምጥ',
    cancel: 'ተው',
    reports: 'ሪፖርቶች',
    daily: 'ዕለታዊ',
    weekly: 'ሳምንታዊ',
    monthly: 'ወርሃዊ',
    download: 'CSV አውርድ',
    net_profit: 'የተጣራ ትርፍ',
    add_staff: 'ሰራተኛ ጨምር',
    username: 'የተጠቃሚ ስም',
    password: 'የይለፍ ቃል',
    role: 'ተግባር',
    full_name: 'ሙሉ ስም',
    product_type: 'የምርት ዓይነት',
    theme: 'ገጽታ',
    light: 'ብርሃን',
    dark: 'ጨለማ',
    payment_method: 'የክፍያ ዘዴ',
    cash: 'ጥሬ ገንዘብ',
    credit: 'ብድር',
    online_transfer: 'የባንክ ዝውውር',
    split_payment: 'የተከፋፈለ ክፍያ',
    upload_receipt: 'ደረሰኝ ይጫኑ',
    search: 'ፈልግ',
    filter_by_date: 'በቀን ፈልግ',
    filter_by_name: 'በስም ፈልግ',
    change_password: 'የይለፍ ቃል ቀይር',
    old_password: 'የድሮ የይለፍ ቃል',
    new_password: 'አዲስ የይለፍ ቃል',
    signup: 'ይመዝገቡ',
    login: 'ይግቡ',
    logout: 'ይውጡ',
    choose_plan: 'እቅድዎን ይምረጡ',
    trial_plan: 'የ15 ቀን ነፃ ሙከራ',
    basic_plan: 'መሰረታዊ እቅድ (500 ብር/በወር)',
    pro_plan: 'ፕሮ እቅድ (1000 ብር/በወር)',
    select: 'ይምረጡ',
    recommended: 'የሚመከር',
    all_features: 'ሁሉንም አገልግሎቶች',
    priority_support: 'ቅድሚያ የሚሰጠው ድጋፍ',
    advanced_reports: 'ጥልቅ ሪፖርቶች',
    days: 'ቀናት',
    already_have_account: 'አካውንት አለዎት?',
    dont_have_account: 'አካውንት የለዎትም?',
    subscription: 'ምዝገባ',
    plan: 'እቅድ',
    status_label: 'ሁኔታ',
    shops: 'ሱቆች',
    add_shop: 'ሱቅ ጨምር',
    shop_name: 'የሱቅ ስም',
    address: 'አድራሻ',
    switch_shop: 'ሱቅ ቀይር',
    cloud_storage: 'ክላውድ ማከማቻ',
    link_google_drive: 'Google Drive አገናኝ',
    link_onedrive: 'OneDrive አገናኝ',
    e2ee: 'ከጫፍ እስከ ጫፍ ምስጠራ (E2EE)',
    encryption_key: 'የምስጠራ ቁልፍ',
    storage_status: 'የማከማቻ ሁኔታ',
    linked: 'ተገናኝቷል',
    not_linked: 'አልተገናኘም',
    shops_limit: 'የሱቆች ገደብ',
    users_limit: 'የተጠቃሚዎች ገደብ',
    audit_logs: 'የኦዲት መዝገቦች',
    api_access: 'የAPI መዳረሻ',
    unlimited: 'ያልተገደበ',
    advanced_analytics: 'የላቀ ትንታኔ',
    upgrade: 'አሻሽል',
    upgrade_required: 'ማሻሻያ ያስፈልጋል',
    trial_expired_msg: 'የሙከራ ጊዜዎ አልቋል። እባክዎ አደራ ERPን መጠቀም ለመቀጠል ወደሚከፈልበት እቅድ ያሻሽሉ።',
    active: 'ንቁ',
    trial: 'ሙከራ',
    cancelled: 'ተሰርዟል',
    trial_ends: 'ሙከራው ያበቃል',
    past_due: 'ክፍያ ያለፈበት',
    multi_branch: 'የብዙ ቅርንጫፎች ሪፖርት',
  }
};
