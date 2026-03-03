import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  HandCoins, 
  Users, 
  Settings, 
  Plus, 
  Search,
  Languages,
  Bell,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Menu,
  X,
  Lock,
  Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { 
  DashboardStats, 
  InventoryItem, 
  Transaction, 
  Loan, 
  Customer,
  User,
  Language, 
  translations,
  Role
} from './types';

// --- Components ---

const Modal = ({ title, children, onClose, onSave }: { title: string, children: React.ReactNode, onClose: () => void, onSave: () => void }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
          <LogOut size={20} className="rotate-180" />
        </button>
      </div>
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {children}
      </div>
      <div className="p-6 bg-gray-50 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black transition-colors">Cancel</button>
        <button onClick={onSave} className="px-6 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors">Save</button>
      </div>
    </motion.div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active ? 'sidebar-item-active' : 'text-gray-500 hover:bg-gray-100'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string, icon: any, trend?: string, color: string }) => (
  <div className="card-brutalist p-6 flex flex-col gap-2">
    <div className="flex justify-between items-start">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        <Icon size={20} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
    <div className="text-2xl font-bold data-value-mono">{value}</div>
    {trend && (
      <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingUp size={12} />
        <span>{trend}</span>
      </div>
    )}
  </div>
);

const Auth = ({ lang, toggleLang, onAuth }: { lang: Language, toggleLang: () => void, onAuth: (mode: 'login' | 'signup', data: any) => void }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '' });
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-white font-black italic text-xl">A</div>
            <h1 className="font-black text-3xl tracking-tighter uppercase">Adera ERP</h1>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Premium Business Suite</p>
        </div>

        <div className="card-brutalist p-8 space-y-6 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{mode === 'login' ? t.login : t.signup}</h2>
            <button onClick={toggleLang} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest">
              {lang === 'en' ? 'Amharic' : 'English'}
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400">{t.full_name}</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.username}</label>
              <input 
                type="text" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.password}</label>
              <input 
                type="password" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button 
            onClick={() => onAuth(mode, formData)}
            className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            {mode === 'login' ? t.login : t.signup}
          </button>

          <div className="text-center">
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest"
            >
              {mode === 'login' ? t.dont_have_account : t.already_have_account}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Pricing = ({ lang, toggleLang, onSelect }: { lang: Language, toggleLang: () => void, onSelect: (plan: string) => void }) => {
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-black rounded flex items-center justify-center text-white font-black italic text-xl">A</div>
            <h1 className="font-black text-3xl tracking-tighter uppercase">Adera ERP</h1>
          </div>
          <h2 className="text-4xl font-black">{t.choose_plan}</h2>
          <button onClick={toggleLang} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest">
            {lang === 'en' ? 'Amharic' : 'English'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PricingCard 
            title={t.trial_plan} 
            price="0" 
            features={[t.all_features, `15 ${t.days}`]} 
            onSelect={() => onSelect('Trial')} 
            t={t}
          />
          <PricingCard 
            title="Basic" 
            price="500" 
            features={[t.inventory, t.sales, t.expenses, t.customers, '1 Shop', '2 Users']} 
            onSelect={() => onSelect('Basic')} 
            recommended
            t={t}
          />
          <PricingCard 
            title="Pro" 
            price="1000" 
            features={[t.all_features, t.priority_support, t.advanced_reports, t.audit_logs, t.api_access, 'Unlimited Shops', 'Unlimited Users']} 
            onSelect={() => onSelect('Pro')} 
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

const PricingCard = ({ title, price, features, onSelect, recommended, t }: { title: string, price: string, features: string[], onSelect: () => void, recommended?: boolean, t: any }) => (
  <div className={`card-brutalist p-8 flex flex-col gap-6 bg-white relative ${recommended ? 'border-2 border-black' : ''}`}>
    {recommended && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
        {t.recommended}
      </div>
    )}
    <div className="space-y-1">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black">{price}</span>
        <span className="text-xs font-bold text-gray-400 uppercase">{t.currency}/mo</span>
      </div>
    </div>
    <ul className="space-y-3 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
          {f}
        </li>
      ))}
    </ul>
    <button 
      onClick={onSelect}
      className={`w-full py-4 rounded-xl font-bold transition-colors ${recommended ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
    >
      {t.select}
    </button>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const [role, setRole] = useState<Role>('Owner');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Form States
  const [showModal, setShowModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const t = translations[lang];

  useEffect(() => {
    const savedUser = localStorage.getItem('adera_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setRole(u.role);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [reportPeriod, role, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = { 
        'x-user-role': role,
        'x-user-id': user.id.toString()
      };
      const [sRes, iRes, tRes, lRes, cRes, stRes, rRes, uRes] = await Promise.all([
        fetch('/api/stats', { headers }),
        fetch('/api/inventory', { headers }),
        fetch('/api/transactions', { headers }),
        fetch('/api/loans', { headers }),
        fetch('/api/customers', { headers }),
        fetch('/api/staff', { headers }),
        fetch(`/api/reports?period=${reportPeriod}`, { headers }),
        fetch('/api/me', { headers })
      ]);

      if (uRes.ok) {
        const updatedUser = await uRes.json();
        setUser(updatedUser);
        localStorage.setItem('adera_user', JSON.stringify(updatedUser));
      }

      const checkResponse = async (res: Response) => {
        if (res.status === 403) {
          const data = await res.json();
          if (data.error === 'Trial expired' || data.error === 'Subscription required') {
            // Handle trial expiry globally if needed
          }
        }
        return res.ok ? res.json() : null;
      };

      setStats(await checkResponse(sRes));
      setInventory(await checkResponse(iRes) || []);
      setTransactions(await checkResponse(tRes) || []);
      setLoans(await checkResponse(lRes) || []);
      setCustomers(await checkResponse(cRes) || []);
      if (stRes.ok) setStaff(await stRes.json());
      if (rRes.ok) setReportData(await rRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    let endpoint = `/api/${showModal}`;
    if (showModal === 'expenses') endpoint = '/api/transactions';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': role,
          'x-user-id': user?.id.toString() || ''
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(null);
        setFormData({});
        fetchData();
        if (showModal === 'change-password') alert('Password changed successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Save failed');
      }
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const handleDelete = async (type: string, id: number) => {
    if (role !== 'Owner') return;
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const res = await fetch(`/api/${type}/${id}`, {
        method: 'DELETE',
        headers: { 
          'x-user-role': role,
          'x-user-id': user?.id.toString() || ''
        }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const toggleLang = () => setLang(l => l === 'en' ? 'am' : 'en');

  const handleLogout = () => {
    localStorage.removeItem('adera_user');
    setUser(null);
  };

  const handleAuth = async (mode: 'login' | 'signup', data: any) => {
    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('adera_user', JSON.stringify(result));
        setUser(result);
        setRole(result.role);
      } else {
        alert(result.error);
      }
    } catch (e) {
      alert("Authentication failed");
    }
  };

  const handleSubscribe = async (plan: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ plan })
      });
      const result = await res.json();
      if (res.ok) {
        localStorage.setItem('adera_user', JSON.stringify(result));
        setUser(result);
        alert(`Successfully subscribed to ${plan} plan!`);
      } else {
        alert(result.error || "Subscription failed");
      }
    } catch (e) {
      alert("Subscription failed");
    }
  };

  if (!user) {
    return <Auth lang={lang} toggleLang={toggleLang} onAuth={handleAuth} />;
  }

  if (user.role === 'Owner' && !user.plan) {
    return <Pricing lang={lang} toggleLang={toggleLang} onSelect={handleSubscribe} />;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Overview</h2>
        <button 
          onClick={() => setShowModal('transactions')}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          {t.add_sale}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label={t.total_sales} 
          value={`${stats?.totalSales.toLocaleString()} ${t.currency}`} 
          icon={ArrowUpRight} 
          trend="+12.5%" 
          color="bg-emerald-500" 
        />
        <StatCard 
          label={t.total_expenses} 
          value={`${stats?.totalExpenses.toLocaleString()} ${t.currency}`} 
          icon={ArrowDownRight} 
          color="bg-rose-500" 
        />
        <StatCard 
          label={t.stock_items} 
          value={stats?.inventoryItems.toString() || '0'} 
          icon={Package} 
          color="bg-blue-500" 
        />
        <StatCard 
          label={t.outstanding_loans} 
          value={`${stats?.outstandingLoans.toLocaleString()} ${t.currency}`} 
          icon={HandCoins} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card-brutalist p-6">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={16} />
            {t.sales} vs {t.expenses}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transactions.slice(0, 10).reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-brutalist p-6">
          <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            {t.low_stock_alerts}
          </h3>
          <div className="space-y-4">
            {inventory.filter(i => i.quantity <= i.min_stock_level).map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <div>
                  <div className="text-sm font-bold">{item.name}</div>
                  <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-700">{item.quantity} left</div>
                  <div className="text-xs text-amber-600">Min: {item.min_stock_level}</div>
                </div>
              </div>
            ))}
            {inventory.filter(i => i.quantity <= i.min_stock_level).length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No low stock alerts</div>
            )}
          </div>
        </div>
      </div>

      <div className="card-brutalist overflow-x-auto">
        <div className="p-4 border-bottom border-gray-100 flex justify-between items-center min-w-[600px]">
          <h3 className="text-sm font-bold">{t.recent_activity}</h3>
          <button className="text-xs font-medium text-blue-600 hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="px-6 py-3 data-grid-header">Date</th>
                <th className="px-6 py-3 data-grid-header">Type</th>
                <th className="px-6 py-3 data-grid-header">Customer</th>
                <th className="px-6 py-3 data-grid-header">Description</th>
                <th className="px-6 py-3 data-grid-header">Payment</th>
                <th className="px-6 py-3 data-grid-header text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.slice(0, 5).map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      tx.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{tx.customer_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {tx.cash_amount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Cash"></span>}
                      {tx.credit_amount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" title="Credit"></span>}
                      {tx.online_amount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title="Online"></span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold data-value-mono">
                    {tx.type === 'Sale' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.inventory}</h2>
        <button 
          onClick={() => setShowModal('inventory')}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          {t.add_item}
        </button>
      </div>

      <div className="card-brutalist overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search items, SKU, categories..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 data-grid-header">{t.name}</th>
                <th className="px-6 py-3 data-grid-header">{t.sku}</th>
                <th className="px-6 py-3 data-grid-header text-right">{t.quantity}</th>
                <th className="px-6 py-3 data-grid-header text-right">{t.price}</th>
                {role === 'Owner' && <th className="px-6 py-3 data-grid-header text-right">{t.cost_price}</th>}
                <th className="px-6 py-3 data-grid-header text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-sm">{item.name}</td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500">{item.sku}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold data-value-mono ${item.quantity <= item.min_stock_level ? 'text-rose-600' : ''}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold data-value-mono">
                    {item.unit_price.toLocaleString()} {t.currency}
                  </td>
                  {role === 'Owner' && (
                    <td className="px-6 py-4 text-right font-medium text-gray-400 data-value-mono">
                      {item.cost_price.toLocaleString()}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-blue-600 text-xs font-bold hover:underline">{t.edit}</button>
                      {role === 'Owner' && (
                        <button 
                          onClick={() => handleDelete('inventory', item.id)}
                          className="text-rose-600 text-xs font-bold hover:underline"
                        >
                          {t.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLoans = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.loans}</h2>
        <button 
          onClick={() => setShowModal('loans')}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          {t.add_loan}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loans.map(loan => (
          <div key={loan.id} className="card-brutalist p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Borrower</div>
                <div className="text-lg font-bold">{loan.borrower_name}</div>
                <div className="text-xs text-gray-500">{loan.borrower_phone}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  loan.status === 'Active' ? 'bg-blue-100 text-blue-700' : 
                  loan.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {loan.status}
                </span>
                {role === 'Owner' && (
                  <button 
                    onClick={() => handleDelete('loans', loan.id)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <AlertTriangle size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Remaining</span>
                <span className="font-bold data-value-mono">{loan.remaining_amount.toLocaleString()} {t.currency}</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full" 
                  style={{ width: `${(1 - loan.remaining_amount / loan.amount) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Total: {loan.amount.toLocaleString()}</span>
                <span>Due: {new Date(loan.due_date).toLocaleDateString()}</span>
              </div>
            </div>
            <button className="w-full py-2 border border-gray-200 rounded text-xs font-bold hover:bg-gray-50 transition-colors">
              Record Payment
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.customers}</h2>
        <button 
          onClick={() => setShowModal('customers')}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          {t.add_customer}
        </button>
      </div>

      <div className="card-brutalist overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-3 data-grid-header">{t.name}</th>
              <th className="px-6 py-3 data-grid-header">{t.phone}</th>
              <th className="px-6 py-3 data-grid-header">Joined</th>
              <th className="px-6 py-3 data-grid-header text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">{c.name}</td>
                <td className="px-6 py-4 text-sm font-mono">{c.phone}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-blue-600 text-xs font-bold hover:underline">{t.edit}</button>
                    {role === 'Owner' && (
                      <button 
                        onClick={() => handleDelete('customers', c.id)}
                        className="text-rose-600 text-xs font-bold hover:underline"
                      >
                        {t.delete}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStaff = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.staff}</h2>
        {role === 'Owner' && (
          <button 
            onClick={() => setShowModal('staff')}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            {t.add_staff}
          </button>
        )}
      </div>

      <div className="card-brutalist overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-3 data-grid-header">{t.full_name}</th>
              <th className="px-6 py-3 data-grid-header">{t.username}</th>
              <th className="px-6 py-3 data-grid-header">{t.role}</th>
              <th className="px-6 py-3 data-grid-header text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold text-sm">{s.full_name}</td>
                <td className="px-6 py-4 text-sm font-mono">{s.username}</td>
                <td className="px-6 py-4 text-xs">
                  <span className={`px-2 py-1 rounded-full font-bold uppercase ${
                    s.role === 'Manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {role === 'Owner' && (
                    <button 
                      onClick={() => handleDelete('staff', s.id)}
                      className="text-rose-600 text-xs font-bold hover:underline"
                    >
                      {t.delete}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.reports}</h2>
        <div className="flex gap-2">
          <select 
            value={reportPeriod} 
            onChange={e => setReportPeriod(e.target.value)}
            className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-bold outline-none"
          >
            <option value="daily">{t.daily}</option>
            <option value="weekly">{t.weekly}</option>
            <option value="monthly">{t.monthly}</option>
          </select>
          <button 
            onClick={downloadCSV}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            {t.download}
          </button>
        </div>
      </div>

      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label={t.total_sales} value={`${reportData.summary.totalSales.toLocaleString()} ${t.currency}`} icon={ArrowUpRight} color="bg-emerald-500" />
            <StatCard label={t.total_expenses} value={`${reportData.summary.totalExpenses.toLocaleString()} ${t.currency}`} icon={ArrowDownRight} color="bg-rose-500" />
            <StatCard label={t.net_profit} value={`${reportData.summary.netProfit.toLocaleString()} ${t.currency}`} icon={TrendingUp} color="bg-blue-500" />
          </div>

          <div className="card-brutalist overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 data-grid-header">Date</th>
                  <th className="px-6 py-3 data-grid-header">Type</th>
                  <th className="px-6 py-3 data-grid-header">Customer</th>
                  <th className="px-6 py-3 data-grid-header">Description</th>
                  <th className="px-6 py-3 data-grid-header">Payment</th>
                  <th className="px-6 py-3 data-grid-header text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        tx.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{tx.customer_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {tx.cash_amount > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Cash"></span>}
                        {tx.credit_amount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" title="Credit"></span>}
                        {tx.online_amount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title="Online"></span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold data-value-mono">
                      {tx.type === 'Sale' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderTransactions = () => {
    const filtered = transactions.filter(tx => {
      if (tx.type !== 'Sale') return false;
      const matchesSearch = (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (tx.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !dateFilter || (tx.date && tx.date.startsWith(dateFilter));
      const matchesPayment = !paymentFilter || 
                            (paymentFilter === 'cash' && tx.cash_amount && tx.cash_amount > 0) ||
                            (paymentFilter === 'credit' && tx.credit_amount && tx.credit_amount > 0) ||
                            (paymentFilter === 'online' && tx.online_amount && tx.online_amount > 0);
      return matchesSearch && matchesDate && matchesPayment;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold">{t.transactions}</h2>
          <button 
            onClick={() => setShowModal('transactions')}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            {t.add_sale}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t.search} 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          <select 
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
          >
            <option value="">{t.payment_method}</option>
            <option value="cash">{t.cash}</option>
            <option value="credit">{t.credit}</option>
            <option value="online">{t.online_transfer}</option>
          </select>
        </div>

        <div className="card-brutalist overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 data-grid-header">Date</th>
                <th className="px-6 py-3 data-grid-header">Product Type</th>
                <th className="px-6 py-3 data-grid-header">Customer</th>
                <th className="px-6 py-3 data-grid-header">Description</th>
                <th className="px-6 py-3 data-grid-header">Payment Breakdown</th>
                <th className="px-6 py-3 data-grid-header text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{tx.product_type || '-'}</td>
                  <td className="px-6 py-4 text-sm font-medium">{tx.customer_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tx.cash_amount > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">Cash: {tx.cash_amount}</span>}
                      {tx.credit_amount > 0 && <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded">Credit: {tx.credit_amount}</span>}
                      {tx.online_amount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">Online: {tx.online_amount}</span>
                          {tx.transfer_image && (
                            <button onClick={() => window.open(tx.transfer_image)} className="text-blue-500 hover:text-blue-700">
                              <Image size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold data-value-mono">
                    +{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderExpenses = () => {
    const filtered = transactions.filter(tx => {
      if (tx.type !== 'Expense') return false;
      const matchesSearch = (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !dateFilter || (tx.date && tx.date.startsWith(dateFilter));
      return matchesSearch && matchesDate;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{t.expenses}</h2>
          <button 
            onClick={() => setShowModal('expenses')}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t.search} 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <input 
            type="date" 
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
        </div>

        <div className="card-brutalist overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 data-grid-header">Date</th>
                <th className="px-6 py-3 data-grid-header">Category</th>
                <th className="px-6 py-3 data-grid-header">Description</th>
                <th className="px-6 py-3 data-grid-header text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{tx.category || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tx.description}</td>
                  <td className="px-6 py-4 text-right font-bold data-value-mono text-rose-600">
                    -{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSubscription = () => (
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t.subscription}</h2>
        {user?.subscription_status === 'trial' && (
          <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <AlertTriangle size={16} />
            {t.trial_ends}: {user.trial_end_date ? new Date(user.trial_end_date).toLocaleDateString() : 'N/A'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-brutalist p-6 space-y-6 bg-white">
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.plan}</div>
            <div className="text-2xl font-black">{user?.plan || 'None'}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.status_label}</div>
            <div className={`text-lg font-bold ${
              user?.subscription_status === 'active' ? 'text-emerald-600' : 
              user?.subscription_status === 'trial' ? 'text-blue-600' : 'text-rose-600'
            }`}>
              {t[user?.subscription_status as keyof typeof t] || user?.subscription_status}
            </div>
          </div>
          {user?.subscription_status !== 'active' && (
            <button 
              onClick={() => setActiveTab('pricing')}
              className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              {t.upgrade}
            </button>
          )}
        </div>

        <div className="card-brutalist p-6 space-y-4 bg-white">
          <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400">Plan Limits</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.shops_limit}</span>
              <span className="font-bold">{user?.plan === 'Pro' ? t.unlimited : '1'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.users_limit}</span>
              <span className="font-bold">{user?.plan === 'Pro' ? t.unlimited : '2'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.audit_logs}</span>
              <span className={user?.plan === 'Pro' ? 'text-emerald-600' : 'text-gray-300'}>
                {user?.plan === 'Pro' ? '✓' : '✕'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t.api_access}</span>
              <span className={user?.plan === 'Pro' ? 'text-emerald-600' : 'text-gray-300'}>
                {user?.plan === 'Pro' ? '✓' : '✕'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {user?.role === 'Owner' && (
        <div className="card-brutalist p-8 bg-black text-white space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-black italic">Need more power?</h3>
            <p className="text-gray-400 text-sm">Upgrade to Pro to unlock multi-branch reporting, advanced analytics, and unlimited staff members.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white/10 rounded-xl border border-white/10">
              <TrendingUp className="text-blue-400 mb-2" size={20} />
              <div className="text-xs font-bold uppercase tracking-widest">{t.advanced_analytics}</div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl border border-white/10">
              <Users className="text-emerald-400 mb-2" size={20} />
              <div className="text-xs font-bold uppercase tracking-widest">Unlimited Staff</div>
            </div>
            <div className="p-4 bg-white/10 rounded-xl border border-white/10">
              <Package className="text-amber-400 mb-2" size={20} />
              <div className="text-xs font-bold uppercase tracking-widest">Multi-Shop</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-xl font-bold">{t.settings}</h2>
      
      <div className="card-brutalist p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">{t.theme}</div>
            <div className="text-xs text-gray-400">Change the look of Adera ERP</div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              {t.light}
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            >
              {t.dark}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Language</div>
            <div className="text-xs text-gray-400">Select your preferred language</div>
          </div>
          <button onClick={toggleLang} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors">
            {lang === 'en' ? 'Amharic' : 'English'}
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <button 
            onClick={() => setShowModal('change-password')}
            className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <Lock size={16} />
            {t.change_password}
          </button>
        </div>
      </div>
    </div>
  );

  const downloadCSV = () => {
    if (!reportData) return;
    const headers = ["Date", "Type", "Customer", "Description", "Amount"];
    const rows = reportData.transactions.map((tx: any) => [
      new Date(tx.date).toLocaleDateString(),
      tx.type,
      tx.customer_name || '-',
      tx.description,
      tx.amount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `adera_erp_report_${reportPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark-theme' : 'bg-gray-50'}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-black italic">A</div>
              <h1 className="font-black text-xl tracking-tighter uppercase">Adera ERP</h1>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Premium Business Suite</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-black">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Package} label={t.inventory} active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={Users} label={t.customers} active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={ArrowUpRight} label={t.transactions} active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={ArrowDownRight} label={t.expenses} active={activeTab === 'expenses'} onClick={() => { setActiveTab('expenses'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={HandCoins} label={t.loans} active={activeTab === 'loans'} onClick={() => { setActiveTab('loans'); setIsSidebarOpen(false); }} />
          {role === 'Owner' && <SidebarItem icon={TrendingUp} label={t.reports} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} />}
          <SidebarItem icon={Users} label={t.staff} active={activeTab === 'staff'} onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }} />
          {role === 'Owner' && <SidebarItem icon={HandCoins} label={t.subscription} active={activeTab === 'subscription'} onClick={() => { setActiveTab('subscription'); setIsSidebarOpen(false); }} />}
          <SidebarItem icon={Settings} label={t.settings} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
              {user?.full_name?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{user?.full_name}</div>
              <div className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                <span>{role}</span>
                {user?.plan && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-blue-500">{user.plan}</span>
                  </>
                )}
              </div>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-rose-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-[10px] lg:text-xs font-bold hover:bg-gray-50 transition-colors">
              <Languages size={14} />
              <span className="hidden sm:inline">{lang === 'en' ? 'Amharic' : 'English'}</span>
              <span className="sm:hidden">{lang === 'en' ? 'AM' : 'EN'}</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-black transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          {user?.subscription_status === 'cancelled' && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-6">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <Lock size={40} />
                </div>
                <h2 className="text-3xl font-black">{t.upgrade_required}</h2>
                <p className="text-gray-500">{t.trial_expired_msg}</p>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="px-8 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                  {t.upgrade}
                </button>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab} 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 1.02 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : (
                <>
                  {activeTab === 'dashboard' && renderDashboard()}
                  {activeTab === 'inventory' && renderInventory()}
                  {activeTab === 'customers' && renderCustomers()}
                  {activeTab === 'loans' && renderLoans()}
                  {activeTab === 'staff' && renderStaff()}
                  {activeTab === 'reports' && renderReports()}
                  {activeTab === 'transactions' && renderTransactions()}
                  {activeTab === 'expenses' && renderExpenses()}
                  {activeTab === 'subscription' && renderSubscription()}
                  {activeTab === 'settings' && renderSettings()}
                  {activeTab === 'pricing' && (
                    <div className="max-w-4xl mx-auto py-8">
                      <Pricing lang={lang} toggleLang={toggleLang} onSelect={handleSubscribe} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {showModal === 'customers' && (
        <Modal title={t.add_customer} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.name}</label>
            <input 
              type="text" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.phone}</label>
            <input 
              type="text" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
        </Modal>
      )}

      {showModal === 'inventory' && (
        <Modal title={t.add_item} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.name}</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.sku}</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, sku: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.quantity}</label>
              <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.price}</label>
              <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.cost_price}</label>
              <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})} />
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'transactions' && (
        <Modal title={t.add_sale} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.customer}</label>
              <select 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                onChange={e => setFormData({...formData, customer_id: parseInt(e.target.value), type: 'Sale'})}
              >
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.product_type}</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="e.g. Electronics, Food, Service" onChange={e => setFormData({...formData, product_type: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Description</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">{t.split_payment}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">{t.cash}</label>
                  <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({...formData, cash_amount: val, amount: (val + (formData.credit_amount || 0) + (formData.online_amount || 0))});
                  }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">{t.credit}</label>
                  <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({...formData, credit_amount: val, amount: ((formData.cash_amount || 0) + val + (formData.online_amount || 0))});
                  }} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">{t.online_transfer}</label>
                  <input type="number" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({...formData, online_amount: val, amount: ((formData.cash_amount || 0) + (formData.credit_amount || 0) + val)});
                  }} />
                </div>
              </div>
              
              {(formData.online_amount > 0) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">{t.upload_receipt}</label>
                  <input type="file" accept="image/*" className="w-full text-xs" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setFormData({...formData, transfer_image: reader.result});
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
              )}
              
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase">Total Amount</span>
                <span className="text-lg font-black">{((formData.cash_amount || 0) + (formData.credit_amount || 0) + (formData.online_amount || 0)).toLocaleString()} {t.currency}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'change-password' && (
        <Modal title={t.change_password} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.username}</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, username: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.old_password}</label>
              <input type="password" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, oldPassword: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.new_password}</label>
              <input type="password" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, newPassword: e.target.value})} />
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'expenses' && (
        <Modal title="Add Expense" onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">{t.category}</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="e.g. Rent, Utilities, Salary" onChange={e => setFormData({...formData, category: e.target.value, type: 'Expense'})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Amount</label>
              <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400">Description</label>
              <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'loans' && (
        <Modal title={t.add_loan} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.customer}</label>
            <select 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              onChange={e => setFormData({...formData, customer_id: parseInt(e.target.value)})}
            >
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Amount</label>
            <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Due Date</label>
            <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, due_date: e.target.value})} />
          </div>
        </Modal>
      )}

      {showModal === 'staff' && (
        <Modal title={t.add_staff} onClose={() => setShowModal(null)} onSave={handleSave}>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.full_name}</label>
            <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.username}</label>
            <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.password}</label>
            <input type="password" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">{t.role}</label>
            <select 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="Staff">Staff</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
