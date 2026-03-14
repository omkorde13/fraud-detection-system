import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transactionService, alertService } from '../services/fraudService';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  ShieldAlert, CreditCard, Bell, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

const COLORS = { FRAUDULENT: '#ef4444', REVIEW: '#f59e0b', LEGITIMATE: '#22c55e', PENDING: '#94a3b8' };

function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    red:    'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        {loading
          ? <div className="h-7 w-20 bg-gray-100 animate-pulse rounded mt-1" />
          : <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>}
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats,  setStats]  = useState(null);
  const [txns,   setTxns]   = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      transactionService.getStats(),
      transactionService.getMy(),
      alertService.getMy(),
    ]).then(([s, t, a]) => {
      setStats(s.data);
      setTxns(t.data);
      setAlerts(a.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build pie chart data from transactions
  const pieData = React.useMemo(() => {
    const counts = txns.reduce((acc, t) => {
      acc[t.fraudStatus] = (acc[t.fraudStatus] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [txns]);

  // Last 7 days activity chart
  const activityData = React.useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: format(d, 'MMM d'), total: 0, fraud: 0, legit: 0 };
    });
    txns.forEach(t => {
      const day = format(new Date(t.timestamp), 'MMM d');
      const entry = days.find(d => d.date === day);
      if (entry) {
        entry.total++;
        if (t.fraudStatus === 'FRAUDULENT') entry.fraud++;
        else if (t.fraudStatus === 'LEGITIMATE') entry.legit++;
      }
    });
    return days;
  }, [txns]);

  const recent = txns.slice(0, 5);
  const openAlerts = alerts.filter(a => a.status === 'OPEN').slice(0, 4);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, <span className="font-medium text-gray-700">{user?.username}</span></p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CreditCard}    label="Total Transactions" value={stats?.totalTransactions ?? 0}      color="blue"   loading={loading} />
        <StatCard icon={ShieldAlert}   label="Fraudulent"         value={stats?.fraudulentTransactions ?? 0} color="red"    loading={loading} sub={`${stats?.fraudRate ?? 0}% fraud rate`} />
        <StatCard icon={Clock}         label="Pending Review"     value={stats?.pendingReview ?? 0}          color="yellow" loading={loading} />
        <StatCard icon={Bell}          label="Open Alerts"        value={stats?.openAlerts ?? 0}             color="red"    loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity chart */}
        <div className="card xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Transaction Activity (7 days)</h2>
          {loading
            ? <div className="h-48 bg-gray-50 animate-pulse rounded-lg" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gFraud" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#gTotal)" strokeWidth={2} name="Total" />
                  <Area type="monotone" dataKey="fraud" stroke="#ef4444" fill="url(#gFraud)" strokeWidth={2} name="Fraud" />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Pie chart */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Status Breakdown</h2>
          {loading || pieData.length === 0
            ? <div className="h-48 bg-gray-50 animate-pulse rounded-lg flex items-center justify-center text-sm text-gray-400">No data yet</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* Recent transactions + open alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
            <Link to="/transactions" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 animate-pulse rounded" />))}</div>
            : recent.length === 0
              ? <p className="text-sm text-gray-400 py-6 text-center">No transactions yet</p>
              : (
                <div className="space-y-2">
                  {recent.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.merchantName || t.transactionId}</p>
                        <p className="text-xs text-gray-400">{t.timestamp ? format(new Date(t.timestamp), 'MMM d, HH:mm') : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <span className="text-sm font-semibold text-gray-800">${t.amount?.toFixed(2)}</span>
                        <span className={`badge-${t.fraudStatus?.toLowerCase()}`}>{t.fraudStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>

        {/* Open alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Open Alerts</h2>
            <Link to="/alerts" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {loading
            ? <div className="space-y-3">{[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 animate-pulse rounded" />))}</div>
            : openAlerts.length === 0
              ? <p className="text-sm text-gray-400 py-6 text-center">No open alerts</p>
              : (
                <div className="space-y-2">
                  {openAlerts.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <AlertTriangle size={15} className={a.severity === 'HIGH' ? 'text-red-500 mt-0.5' : 'text-yellow-500 mt-0.5'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.alertType?.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-400 truncate">{a.description}</p>
                      </div>
                      <span className={`badge-${a.severity?.toLowerCase()} shrink-0`}>{a.severity}</span>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
