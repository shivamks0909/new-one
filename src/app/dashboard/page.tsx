"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';
import {
  FileText, Users, Activity, CheckCircle, ArrowUpRight, ArrowDownRight,
  Globe, TrendingUp, BarChart3, Eye, EyeOff, Link as LinkIcon, Target, Clock
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Study {
  id: string;
  study_code: string;
  title: string;
  status: string;
  country: string;
  target_completes: number;
  loi_minutes: number;
  client_cpi: number;
  created_at: string;
  start_at: string;
}

interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_email: string;
  status: string;
}

interface TrackingLink {
  id: string;
  study_id: string;
  vendor_id: string;
  link_code: string;
  status: string;
}

interface Session {
  id: string;
  study_id: string;
  vendor_id: string;
  current_status: string;
  country_detected: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ResponseRecord {
  id: string;
  session_id: string;
  study_id: string;
  vendor_id: string;
  final_status: string;
  is_counted: boolean;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toString();
}

function pct(part: number, total: number): string {
  if (!total) return '0.0';
  return ((part / total) * 100).toFixed(1);
}

function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function safeStr(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return fallback;
  return String(v);
}

/* ─── Chart Components ────────────────────────────────────────────────────── */

/** Simple horizontal bar chart */
function BarChartSimple({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-[#64748B] w-[90px] truncate text-right">{d.label}</span>
          <div className="flex-1 h-[10px] rounded-full bg-[var(--bg-input)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${maxVal ? (d.value / maxVal) * 100 : 0}%`, background: d.color }}
            />
          </div>
          <span className="text-[12px] font-semibold text-[var(--text-heading)] w-[36px] tabular-nums">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut chart (pure CSS) */
function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 8;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const rings = segments.filter(s => s.value > 0).map(s => {
    const pctVal = total ? s.value / total : 0;
    const dash = pctVal * circumference;
    const gap = circumference - dash;
    const ring = (
      <circle
        key={s.label}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="16"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
    );
    offset += dash;
    return ring;
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
        )}
        {rings}
      </svg>
      <div className="donut-center">
        <div className="text-[22px] font-bold text-[var(--text-heading)] leading-none">{fmt(total)}</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Total</div>
      </div>
    </div>
  );
}

/** Funnel chart */
function FunnelChart({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const maxVal = steps[0]?.value || 1;
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const width = maxVal ? (s.value / maxVal) * 100 : 0;
        const drop = i > 0 && steps[i - 1].value ? ((1 - s.value / steps[i - 1].value) * 100).toFixed(1) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-[#64748B]">{s.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--text-heading)] tabular-nums">{fmt(s.value)}</span>
                {drop && parseFloat(drop) > 0 && (
                  <span className="text-[10px] font-medium text-[var(--danger)]">-{drop}%</span>
                )}
              </div>
            </div>
            <div className="h-[10px] rounded-full bg-[var(--bg-input)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${width}%`, background: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Filter Bar ──────────────────────────────────────────────────────────── */
interface Filters {
  dateRange: string;
  studyId: string;
  country: string;
  vendorId: string;
}

function FilterBar({
  filters, setFilters, studies, vendors, countries, onReset,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  studies: { id: string; title: string }[];
  vendors: { id: string; name: string }[];
  countries: string[];
  onReset: () => void;
}) {
  const selectClass = "h-[36px] px-3 pr-8 text-[12px] font-medium text-[var(--text-body)] bg-white border border-[var(--border-input)] rounded-[var(--radius-input)] focus:outline-none focus:border-[var(--blue)] appearance-none cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <select
        value={filters.dateRange}
        onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
        className={selectClass}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238A94A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>

      <select
        value={filters.studyId}
        onChange={(e) => setFilters({ ...filters, studyId: e.target.value })}
        className={selectClass}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238A94A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="">All Projects</option>
        {studies.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
      </select>

      <select
        value={filters.country}
        onChange={(e) => setFilters({ ...filters, country: e.target.value })}
        className={selectClass}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238A94A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="">All Countries</option>
        {countries.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        value={filters.vendorId}
        onChange={(e) => setFilters({ ...filters, vendorId: e.target.value })}
        className={selectClass}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238A94A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <option value="">All Vendors</option>
        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>

      {(filters.dateRange !== '7d' || filters.studyId || filters.country || filters.vendorId) && (
        <button
          onClick={onReset}
          className="h-[36px] px-3 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-[var(--radius-input)] transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading, role, vendor_id } = useAuthState();
  const [studies, setStudies] = useState<Study[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    dateRange: '7d',
    studyId: '',
    country: '',
    vendorId: '',
  });
  const [trafficFilter, setTrafficFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, vRes, sessRes, respRes, linkRes] = await Promise.all([
        apiClient.get<{ studies: Study[] }>('/studies'),
        apiClient.get<{ vendors: Vendor[] }>('/vendors'),
        apiClient.get<{ sessions: Session[] }>('/sessions?limit=5000'),
        apiClient.get<{ responses: ResponseRecord[] }>('/responses?limit=5000'),
        apiClient.get<{ tracking_links: TrackingLink[] }>('/tracking-links'),
      ]);
      setStudies(sRes.studies || []);
      setVendors(vRes.vendors || []);
      setSessions(sessRes.sessions || []);
      setResponses(respRes.responses || []);
      setLinks(linkRes.tracking_links || linkRes.links || []);
    } catch {
      // silent — data stays empty
    } finally {
      setLoading(false);
    }
  };

  /* ── Filter logic ──────────────────────────────────────────────────────── */
  // A session is "verified" if it has a matching response record
  const sessionVerifiedSet = useMemo(() => {
    const set = new Set<string>();
    responses.forEach(r => { if (r.session_id) set.add(r.session_id); });
    return set;
  }, [responses]);

  const filteredSessions = useMemo(() => {
    let s = sessions;
    if (filters.studyId) s = s.filter(x => x.study_id === filters.studyId);
    if (filters.vendorId) s = s.filter(x => x.vendor_id === filters.vendorId);
    if (filters.country) s = s.filter(x => x.country_detected === filters.country);
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange) || 7;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString();
      s = s.filter(x => x.started_at >= cutoff);
    }
    // Traffic filter: verified = has response, unverified = no response
    if (trafficFilter === 'verified') {
      s = s.filter(x => sessionVerifiedSet.has(x.id));
    } else if (trafficFilter === 'unverified') {
      s = s.filter(x => !sessionVerifiedSet.has(x.id));
    }
    return s;
  }, [sessions, filters, trafficFilter, sessionVerifiedSet]);

  const filteredResponses = useMemo(() => {
    let r = responses;
    if (filters.studyId) r = r.filter(x => x.study_id === filters.studyId);
    if (filters.vendorId) r = r.filter(x => x.vendor_id === filters.vendorId);
    return r;
  }, [responses, filters]);

  const countries = useMemo(() => {
    const set = new Set(sessions.map(s => s.country_detected).filter(Boolean));
    return Array.from(set).sort();
  }, [sessions]);

  /* ── KPI Calculations ──────────────────────────────────────────────────── */
  const activeProjects = studies.filter(s => s.status === 'LIVE' || s.status === 'READY' || s.status === 'ACTIVE').length;
  const totalClicks = filteredSessions.length;
  const verifiedClicks = filteredSessions.filter(x => sessionVerifiedSet.has(x.id)).length;
  const unverifiedClicks = filteredSessions.filter(x => !sessionVerifiedSet.has(x.id)).length;
  const starts = filteredSessions.filter(s => ['STARTED', 'IN_PROGRESS', 'COMPLETE', 'TERMINATE'].includes(s.current_status)).length;
  const completes = filteredSessions.filter(s => s.current_status === 'COMPLETE').length;
  const conversionRate = totalClicks ? ((completes / totalClicks) * 100).toFixed(1) : '0.0';
  const avgLoi = studies.length ? (studies.reduce((s, x) => s + (x.loi_minutes || 0), 0) / studies.length).toFixed(0) : '0';

  /* ── Funnel data ───────────────────────────────────────────────────────── */
  const funnelSteps = [
    { label: 'Clicks', value: totalClicks, color: 'var(--chart-blue)' },
    { label: 'Starts', value: starts, color: 'var(--chart-sky)' },
    { label: 'In Progress', value: filteredSessions.filter(s => ['IN_PROGRESS', 'STARTED'].includes(s.current_status)).length, color: 'var(--chart-purple)' },
    { label: 'Completes', value: completes, color: 'var(--chart-green)' },
  ];

  /* ── Outcome distribution ──────────────────────────────────────────────── */
  const outcomeSegments = [
    { label: 'Complete', value: filteredSessions.filter(s => s.current_status === 'COMPLETE').length, color: 'var(--success)' },
    { label: 'Terminate', value: filteredSessions.filter(s => s.current_status === 'TERMINATE').length, color: 'var(--danger)' },
    { label: 'Quota Full', value: filteredSessions.filter(s => s.current_status === 'QUOTA_FULL').length, color: 'var(--warning)' },
    { label: 'Expired', value: filteredSessions.filter(s => s.current_status === 'EXPIRED').length, color: 'var(--chart-purple)' },
    { label: 'Started', value: filteredSessions.filter(s => s.current_status === 'STARTED').length, color: 'var(--info)' },
  ];

  /* ── Country breakdown ─────────────────────────────────────────────────── */
  const countryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const c = s.country_detected || 'Unknown';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, color: 'var(--chart-blue)' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredSessions]);

  /* ── Status breakdown ──────────────────────────────────────────────────── */
  const statusBreakdown = useMemo(() => {
    const statuses = ['COMPLETE', 'STARTED', 'TERMINATE', 'QUOTA_FULL', 'EXPIRED'];
    return statuses.map(s => ({
      status: s.replace(/_/g, ' '),
      count: filteredSessions.filter(x => x.current_status === s).length,
    }));
  }, [filteredSessions]);

  /* ── Live projects ─────────────────────────────────────────────────────── */
  const liveProjects = useMemo(() => {
    return studies
      .filter(s => s.status === 'LIVE' || s.status === 'READY' || s.status === 'ACTIVE')
      .map(s => {
        const sSessions = sessions.filter(x => x.study_id === s.id);
        const sCompletes = sSessions.filter(x => x.current_status === 'COMPLETE').length;
        const sClicks = sSessions.length;
        const sLinks = links.filter(l => l.study_id === s.id).length;
        return {
          ...s,
          clicks: sClicks,
          completes: sCompletes,
          links: sLinks,
          conv: sClicks ? ((sCompletes / sClicks) * 100).toFixed(1) : '0.0',
        };
      })
      .sort((a, b) => b.clicks - a.clicks);
  }, [studies, sessions, links]);

  /* ── Vendor performance ────────────────────────────────────────────────── */
  const vendorPerformance = useMemo(() => {
    return vendors.map(v => {
      const vSessions = sessions.filter(x => x.vendor_id === v.id);
      const vVerified = vSessions.filter(x => sessionVerifiedSet.has(x.id)).length;
      const vUnverified = vSessions.filter(x => !sessionVerifiedSet.has(x.id)).length;
      const vCompletes = vSessions.filter(x => x.current_status === 'COMPLETE').length;
      const vClicks = vSessions.length;
      return {
        ...v,
        projects: new Set(vSessions.map(x => x.study_id)).size,
        clicks: vClicks,
        completes: vCompletes,
        verified: vVerified,
        unverified: vUnverified,
        conv: vClicks ? ((vCompletes / vClicks) * 100).toFixed(1) : '0.0',
      };
    }).sort((a, b) => b.clicks - a.clicks);
  }, [vendors, sessions, sessionVerifiedSet]);

  /* ── Recent activity (last 10 sessions) ────────────────────────────────── */
  const recentActivity = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10);
  }, [sessions]);

  const resetFilters = () => setFilters({ dateRange: '7d', studyId: '', country: '', vendorId: '' });

  const handleLogout = () => logout();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border)] border-t-[var(--blue)] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <DashboardLayout
      user={user ? { email: user.email, name: user.name, role: user.role, vendor_id: user.vendor_id } : undefined}
      onLogout={handleLogout}
      title="Dashboard"
      subtitle="Fieldwork overview and platform performance"
    >
      {loading ? (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-[100px] bg-white border border-[var(--border)] rounded-[var(--radius-card)] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-[240px] bg-white border border-[var(--border)] rounded-[var(--radius-card)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ── Filters ─────────────────────────────────────────────────── */}
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            studies={studies}
            vendors={vendors}
            countries={countries}
            onReset={resetFilters}
          />

          {/* ── Traffic Toggle ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Traffic:</span>
            <div className="flex bg-[var(--bg-input)] rounded-[var(--radius-input)] p-0.5">
              {(['all', 'verified', 'unverified'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setTrafficFilter(opt)}
                  className={`px-3 py-1.5 text-[12px] font-semibold rounded-[7px] transition-all ${
                    trafficFilter === opt
                      ? 'bg-white text-[var(--text-heading)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt === 'verified' ? '✓ Verified' : '✗ Unverified'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] ml-2">
              {trafficFilter === 'verified' && 'Sessions with valid tracking origin'}
              {trafficFilter === 'unverified' && 'Direct/invalid callbacks (no session)'}
              {trafficFilter === 'all' && 'All traffic combined'}
            </span>
          </div>

          {/* ── KPI Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Projects" value={activeProjects} icon={FileText} iconBg="var(--icon-blue-bg)" iconColor="var(--chart-blue)" />
            <StatCard label="Total Clicks" value={fmt(totalClicks)} icon={Activity} iconBg="var(--icon-cyan-bg)" iconColor="var(--chart-sky)" />
            <StatCard label="Verified Clicks" value={fmt(verifiedClicks)} icon={Eye} iconBg="var(--icon-green-bg)" iconColor="var(--success)" />
            <StatCard label="Unverified Clicks" value={fmt(unverifiedClicks)} icon={EyeOff} iconBg="var(--icon-amber-bg)" iconColor="var(--warning)" />
            <StatCard label="Starts" value={fmt(starts)} icon={Target} iconBg="var(--icon-purple-bg)" iconColor="var(--chart-purple)" />
            <StatCard
              label="Completes"
              value={fmt(completes)}
              change={`${conversionRate}% conversion`}
              trendType={completes > 0 ? 'up' : 'neutral'}
              icon={CheckCircle}
              iconBg="var(--icon-green-bg)"
              iconColor="var(--success)"
            />
            <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} iconBg="var(--icon-blue-bg)" iconColor="var(--chart-blue)" />
            <StatCard label="Avg. LOI" value={`${avgLoi} min`} icon={Clock} iconBg="var(--icon-purple-bg)" iconColor="var(--chart-purple)" />
          </div>

          {/* ── Charts Row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Funnel */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 animate-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Fieldwork Funnel</h3>
              </div>
              <FunnelChart steps={funnelSteps} />
              {trafficFilter === 'all' && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    <span className="text-[11px] text-[#64748B]">Verified</span>
                    <span className="text-[12px] font-semibold text-[var(--text-heading)] tabular-nums">{verifiedClicks}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <span className="text-[11px] text-[#64748B]">Unverified</span>
                    <span className="text-[12px] font-semibold text-[var(--text-heading)] tabular-nums">{unverifiedClicks}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Outcome Distribution */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 animate-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Outcome Distribution</h3>
              </div>
              <div className="flex items-center gap-5">
                <DonutChart segments={outcomeSegments} size={120} />
                <div className="space-y-1.5 flex-1">
                  {outcomeSegments.map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[11px] text-[#64748B] flex-1 truncate">{s.label}</span>
                      <span className="text-[12px] font-semibold text-[var(--text-heading)] tabular-nums">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Country Performance */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 animate-chart">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Country Performance</h3>
                <Globe className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              {countryData.length === 0 ? (
                <div className="flex items-center justify-center h-[120px] text-[13px] text-[var(--text-muted)]">No country data</div>
              ) : (
                <BarChartSimple data={countryData} maxVal={Math.max(...countryData.map(d => d.value))} />
              )}
            </div>
          </div>

          {/* ── Live Projects + Status Breakdown ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Live Projects Table */}
            <div className="lg:col-span-2 bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden animate-slide-up">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Live Projects</h3>
                <Link href="/dashboard/projects" className="text-[12px] font-semibold text-[var(--blue)] hover:underline flex items-center gap-1">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {liveProjects.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--blue-soft)] flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-5 h-5 text-[var(--blue)]" />
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)]">No active projects</p>
                </div>
              ) : (
                <DataTable
                  bare
                  columns={[
                    { key: 'title', header: 'Project', render: (row) => (
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text-heading)]">{safeStr(row.title)}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{safeStr(row.study_code)}</p>
                      </div>
                    )},
                    { key: 'country', header: 'Country', render: (row) => (
                      <span className="text-[12px] font-medium text-[#475569]">{safeStr(row.country, 'Global')}</span>
                    )},
                    { key: 'links', header: 'Links', className: 'text-center tabular-nums' },
                    { key: 'clicks', header: 'Clicks', className: 'text-center tabular-nums' },
                    { key: 'completes', header: 'Completes', className: 'text-center tabular-nums' },
                    { key: 'conv', header: 'Conv.', render: (row) => (
                      <span className="text-[12px] font-semibold tabular-nums text-[var(--success)]">{row.conv}%</span>
                    )},
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                  ]}
                  data={liveProjects}
                  keyField="id"
                  onRowClick={(row) => window.location.href = `/dashboard/projects?highlight=${row.id}`}
                />
              )}
            </div>

            {/* Status Breakdown */}
            <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Session Status</h3>
              </div>
              <DataTable
                bare
                columns={[
                  { key: 'status', header: 'Status', render: (row) => (
                    <span className="text-[12px] font-medium text-[#475569]">{row.status}</span>
                  )},
                  { key: 'count', header: 'Count', className: 'text-right tabular-nums font-semibold' },
                ]}
                data={statusBreakdown}
                keyField="status"
              />
            </div>
          </div>

          {/* ── Vendor Performance ──────────────────────────────────────── */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Vendor Performance</h3>
              <Link href="/dashboard/vendors" className="text-[12px] font-semibold text-[var(--blue)] hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {vendorPerformance.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--icon-purple-bg)] flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-[var(--chart-purple)]" />
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">No vendors configured</p>
              </div>
            ) : (
              <DataTable
                bare
                columns={[
                  { key: 'name', header: 'Vendor', render: (row) => (
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-heading)]">{safeStr(row.name)}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{safeStr(row.vendor_code)}</p>
                    </div>
                  )},
                  { key: 'projects', header: 'Projects', className: 'text-center tabular-nums' },
                  { key: 'clicks', header: 'Clicks', className: 'text-center tabular-nums' },
                  { key: 'verified', header: 'Verified', render: (row) => (
                    <span className="text-[12px] font-semibold tabular-nums text-[var(--success)]">{row.verified ?? 0}</span>
                  )},
                  { key: 'unverified', header: 'Unverified', render: (row) => (
                    <span className="text-[12px] font-semibold tabular-nums text-[var(--warning)]">{row.unverified ?? 0}</span>
                  )},
                  { key: 'completes', header: 'Completes', className: 'text-center tabular-nums' },
                  { key: 'conv', header: 'Conversion', render: (row) => (
                    <span className="text-[12px] font-semibold tabular-nums text-[var(--success)]">{row.conv}%</span>
                  )},
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                ]}
                data={vendorPerformance}
                keyField="id"
                onRowClick={(row) => window.location.href = `/dashboard/vendors?highlight=${row.id}`}
              />
            )}
          </div>

          {/* ── Recent Activity ─────────────────────────────────────────── */}
          <div className="bg-white border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--text-heading)]">Recent Activity</h3>
              <Link href="/dashboard/responses" className="text-[12px] font-semibold text-[var(--blue)] hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-5 h-5 text-[var(--chart-sky)]" />
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">No activity yet</p>
              </div>
            ) : (
              <DataTable
                bare
                columns={[
                  { key: 'verified', header: '', className: 'w-[28px]', render: (row) => {
                    const isVerified = sessionVerifiedSet.has(row.id);
                    return (
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${isVerified ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}
                        title={isVerified ? 'Verified traffic' : 'Unverified traffic'}
                      />
                    );
                  }},
                  { key: 'uid', header: 'Respondent', render: (row) => (
                    <span className="text-[12px] font-mono font-medium text-[#475569]">{safeStr(row.uid, '—').slice(0, 12)}</span>
                  )},
                  { key: 'current_status', header: 'Status', render: (row) => <StatusBadge status={row.current_status} /> },
                  { key: 'country_detected', header: 'Country', render: (row) => (
                    <span className="text-[12px] font-medium text-[#475569]">{safeStr(row.country_detected, 'Unknown')}</span>
                  )},
                  { key: 'started_at', header: 'Time', render: (row) => (
                    <span className="text-[12px] text-[var(--text-muted)] tabular-nums">{fmtDate(row.started_at)}</span>
                  )},
                ]}
                data={recentActivity}
                keyField="id"
              />
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}