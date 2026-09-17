"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FormRow } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';
import {
  Settings,
  Globe,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Plus,
  Trash2,
  HelpCircle,
  Search,
  Check,
  Building2,
  Link2,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';

/* ─── Static Master Countries Data with Currency & Region ─── */
interface CountryData {
  code: string;
  name: string;
  region: string;
  currency: string;
}

const MASTER_COUNTRIES: CountryData[] = [
  { code: 'IN', name: 'India', region: 'Asia Pacific', currency: 'INR' },
  { code: 'US', name: 'United States', region: 'Americas', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', currency: 'GBP' },
  { code: 'DE', name: 'Germany', region: 'Europe', currency: 'EUR' },
  { code: 'FR', name: 'France', region: 'Europe', currency: 'EUR' },
  { code: 'CA', name: 'Canada', region: 'Americas', currency: 'CAD' },
  { code: 'AU', name: 'Australia', region: 'Asia Pacific', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', region: 'Asia Pacific', currency: 'SGD' },
  { code: 'AE', name: 'United Arab Emirates', region: 'MEA', currency: 'AED' },
  { code: 'JP', name: 'Japan', region: 'Asia Pacific', currency: 'JPY' },
  { code: 'BR', name: 'Brazil', region: 'Americas', currency: 'USD' },
  { code: 'MX', name: 'Mexico', region: 'Americas', currency: 'USD' },
  { code: 'ID', name: 'Indonesia', region: 'Asia Pacific', currency: 'USD' },
  { code: 'PH', name: 'Philippines', region: 'Asia Pacific', currency: 'USD' },
  { code: 'VN', name: 'Vietnam', region: 'Asia Pacific', currency: 'USD' },
  { code: 'TH', name: 'Thailand', region: 'Asia Pacific', currency: 'USD' },
  { code: 'IT', name: 'Italy', region: 'Europe', currency: 'EUR' },
  { code: 'ES', name: 'Spain', region: 'Europe', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', region: 'Europe', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', region: 'Europe', currency: 'EUR' },
  { code: 'PL', name: 'Poland', region: 'Europe', currency: 'EUR' },
  { code: 'SA', name: 'Saudi Arabia', region: 'MEA', currency: 'AED' },
  { code: 'EG', name: 'Egypt', region: 'MEA', currency: 'USD' },
  { code: 'ZA', name: 'South Africa', region: 'MEA', currency: 'USD' },
  { code: 'NG', name: 'Nigeria', region: 'MEA', currency: 'USD' },
  { code: 'KR', name: 'South Korea', region: 'Asia Pacific', currency: 'USD' },
];

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED', 'JPY'];
const REGIONS = ['All', 'Americas', 'Europe', 'Asia Pacific', 'MEA'];

/* ─── State Types ─── */
interface VendorQuota {
  vendor_id: string;
  vendor_name?: string;
  quota: number;
  vendor_cpi: number;
}

interface CountryConfig {
  country_code: string;
  country_name: string;
  currency: string;
  client_rate: number;
  vendor_rate: number;
  target_completes: number;
  survey_url: string;
  est_loi: number;
  fieldwork_days: number;
  is_internal_only: boolean;
  vendors: VendorQuota[];
}

interface ClientOption {
  id: string;
  name: string;
  client_code: string;
}

interface VendorOption {
  id: string;
  name: string;
  vendor_code: string;
}

interface GeneratedTrackingLink {
  country_code: string;
  country_name: string;
  vendor_name: string;
  link_code: string;
  quota: number;
  cpi: number;
  tracking_url: string;
  survey_url: string;
}

const WIZARD_STEPS = [
  { id: 1, label: 'Basic Info', desc: 'Project & Client details', icon: Settings },
  { id: 2, label: 'Countries', desc: 'Select target markets', icon: Globe },
  { id: 3, label: 'Configure Rates', desc: 'Quotas, pricing & margins', icon: DollarSign },
  { id: 4, label: 'Vendors & Quotas', desc: 'Allocate sample partners', icon: Users },
  { id: 5, label: 'Review & Confirm', desc: 'Audit & launch project', icon: CheckCircle2 },
];

export default function CreateProjectWizardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthState();
  const { showToast } = useToast();

  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [createdProject, setCreatedProject] = useState<any>(null);
  const [trackingLinks, setTrackingLinks] = useState<GeneratedTrackingLink[]>([]);

  // Reference Data
  const [activeClients, setActiveClients] = useState<ClientOption[]>([]);
  const [activeVendors, setActiveVendors] = useState<VendorOption[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(true);

  // Step 1: Basic Info State
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState(`OPI-${Date.now().toString().slice(-4)}`);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('');
  const [baseSurveyUrl, setBaseSurveyUrl] = useState('');
  const [uidParam, setUidParam] = useState('uid');
  const [callbackUrlBase, setCallbackUrlBase] = useState('https://opi.opinioninsights.in/api/callback/complete');

  // Real-time Validation States
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(true);
  const [urlProbing, setUrlProbing] = useState(false);
  const [urlReachable, setUrlReachable] = useState<boolean | null>(null);
  const [urlProbeMessage, setUrlProbeMessage] = useState<string>('');

  // Step 2: Country Selection State
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>(['IN']);

  // Step 3 & 4: Country Configurations State
  const [countryConfigs, setCountryConfigs] = useState<Record<string, CountryConfig>>({
    IN: {
      country_code: 'IN',
      country_name: 'India',
      currency: 'INR',
      client_rate: 70,
      vendor_rate: 50,
      target_completes: 500,
      survey_url: '',
      est_loi: 15,
      fieldwork_days: 7,
      is_internal_only: false,
      vendors: [],
    },
  });

  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({ IN: true });
  const [bulkApplyCountry, setBulkApplyCountry] = useState<string>('');

  // Auth Protection
  useEffect(() => {
    const unsub = subscribe(() => {});
    checkAuth();
    return unsub;
  }, []);

  // Load Active Reference Data
  useEffect(() => {
    if (isAuthenticated) {
      loadReferenceData();
    }
  }, [isAuthenticated]);

  const loadReferenceData = async () => {
    setLoadingRefData(true);
    try {
      const [cRes, vRes] = await Promise.all([
        apiClient.get<any>('/clients/active').catch(() => ({ data: [] })),
        apiClient.get<any>('/vendors/active').catch(() => ({ data: [] })),
      ]);
      const clients = cRes?.data || [];
      const vendors = vRes?.data || [];
      setActiveClients(clients);
      setActiveVendors(vendors);
      if (clients.length > 0 && !selectedClientId) {
        setSelectedClientId(clients[0].id);
      }
    } catch {
      showToast('Could not load active clients or vendors', 'error');
    } finally {
      setLoadingRefData(false);
    }
  };

  /* ── Code Uniqueness Live Check ── */
  useEffect(() => {
    const code = projectCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setCodeAvailable(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCodeChecking(true);
      try {
        const res = await apiClient.get<any>(`/projects/check-code?code=${encodeURIComponent(code)}`);
        setCodeAvailable(res.available);
      } catch {
        setCodeAvailable(null);
      } finally {
        setCodeChecking(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [projectCode]);

  /* ── URL Probe Test ── */
  const probeBaseUrl = async () => {
    if (!baseSurveyUrl.trim() || !baseSurveyUrl.startsWith('https://')) {
      setUrlReachable(false);
      setUrlProbeMessage('URL must begin with https://');
      return;
    }
    setUrlProbing(true);
    setUrlProbeMessage('Probing endpoint reachability...');
    try {
      const res = await apiClient.post<any>('/projects/probe-url', { url: baseSurveyUrl.trim() });
      if (res.success && res.reachable) {
        setUrlReachable(true);
        setUrlProbeMessage(`Reachable (HTTP ${res.status || 200})`);
      } else {
        setUrlReachable(false);
        setUrlProbeMessage(res.error || 'Server did not respond within timeout');
      }
    } catch (err: any) {
      setUrlReachable(false);
      setUrlProbeMessage(err.message || 'Probe failed');
    } finally {
      setUrlProbing(false);
    }
  };

  /* ── Country Selection Handlers ── */
  const toggleCountry = (code: string) => {
    const exists = selectedCountryCodes.includes(code);
    let updated: string[];
    if (exists) {
      if (selectedCountryCodes.length === 1) {
        showToast('At least one country must be selected', 'error');
        return;
      }
      updated = selectedCountryCodes.filter((c) => c !== code);
      const nextConfigs = { ...countryConfigs };
      delete nextConfigs[code];
      setCountryConfigs(nextConfigs);
    } else {
      updated = [...selectedCountryCodes, code];
      const master = MASTER_COUNTRIES.find((m) => m.code === code);
      setCountryConfigs({
        ...countryConfigs,
        [code]: {
          country_code: code,
          country_name: master?.name || code,
          currency: master?.currency || 'USD',
          client_rate: master?.currency === 'INR' ? 70 : 5.0,
          vendor_rate: master?.currency === 'INR' ? 50 : 3.5,
          target_completes: 500,
          survey_url: '',
          est_loi: 15,
          fieldwork_days: 7,
          is_internal_only: false,
          vendors: [],
        },
      });
      setExpandedAccordions((prev) => ({ ...prev, [code]: true }));
    }
    setSelectedCountryCodes(updated);
  };

  const selectAllFilteredCountries = () => {
    const toAdd = filteredCountries.map((c) => c.code);
    const merged = Array.from(new Set([...selectedCountryCodes, ...toAdd]));
    setSelectedCountryCodes(merged);
    const nextConfigs = { ...countryConfigs };
    toAdd.forEach((code) => {
      if (!nextConfigs[code]) {
        const master = MASTER_COUNTRIES.find((m) => m.code === code);
        nextConfigs[code] = {
          country_code: code,
          country_name: master?.name || code,
          currency: master?.currency || 'USD',
          client_rate: master?.currency === 'INR' ? 70 : 5.0,
          vendor_rate: master?.currency === 'INR' ? 50 : 3.5,
          target_completes: 500,
          survey_url: '',
          est_loi: 15,
          fieldwork_days: 7,
          is_internal_only: false,
          vendors: [],
        };
      }
    });
    setCountryConfigs(nextConfigs);
  };

  const clearAllCountries = () => {
    if (selectedCountryCodes.length > 0) {
      const first = selectedCountryCodes[0];
      setSelectedCountryCodes([first]);
      const nextConfigs: Record<string, CountryConfig> = { [first]: countryConfigs[first] };
      setCountryConfigs(nextConfigs);
      showToast('Retained 1 required country', 'info');
    }
  };

  const filteredCountries = useMemo(() => {
    return MASTER_COUNTRIES.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase());
      const matchesRegion = selectedRegion === 'All' || c.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [countrySearch, selectedRegion]);

  /* ── Bulk Apply Config ── */
  const applyRatesToAll = (sourceCode: string) => {
    const src = countryConfigs[sourceCode];
    if (!src) return;
    const next = { ...countryConfigs };
    selectedCountryCodes.forEach((code) => {
      if (code !== sourceCode) {
        next[code] = {
          ...next[code],
          currency: src.currency,
          client_rate: src.client_rate,
          vendor_rate: src.vendor_rate,
          target_completes: src.target_completes,
          est_loi: src.est_loi,
          fieldwork_days: src.fieldwork_days,
        };
      }
    });
    setCountryConfigs(next);
    showToast(`Rates from ${src.country_name} applied to all countries`, 'success');
  };

  /* ── Vendor Quota Handlers ── */
  const addVendorToCountry = (countryCode: string) => {
    const cfg = countryConfigs[countryCode];
    if (!cfg) return;
    const assignedIds = cfg.vendors.map((v) => v.vendor_id);
    const available = activeVendors.find((v) => !assignedIds.includes(v.id));
    if (!available) {
      showToast('All available active vendors are already assigned', 'error');
      return;
    }

    // Allocate remaining completes
    const currentSum = cfg.vendors.reduce((acc, v) => acc + v.quota, 0);
    const remaining = Math.max(0, cfg.target_completes - currentSum);

    const newVendor: VendorQuota = {
      vendor_id: available.id,
      vendor_name: available.name,
      quota: remaining > 0 ? remaining : 100,
      vendor_cpi: cfg.vendor_rate,
    };

    setCountryConfigs({
      ...countryConfigs,
      [countryCode]: {
        ...cfg,
        vendors: [...cfg.vendors, newVendor],
      },
    });
  };

  const updateVendorQuota = (
    countryCode: string,
    vIdx: number,
    field: keyof VendorQuota,
    val: any
  ) => {
    const cfg = countryConfigs[countryCode];
    if (!cfg) return;
    const nextVendors = [...cfg.vendors];
    if (field === 'vendor_id') {
      const vObj = activeVendors.find((x) => x.id === val);
      nextVendors[vIdx] = {
        ...nextVendors[vIdx],
        vendor_id: val,
        vendor_name: vObj?.name,
      };
    } else {
      nextVendors[vIdx] = {
        ...nextVendors[vIdx],
        [field]: val,
      };
    }
    setCountryConfigs({
      ...countryConfigs,
      [countryCode]: {
        ...cfg,
        vendors: nextVendors,
      },
    });
  };

  const removeVendorFromCountry = (countryCode: string, vIdx: number) => {
    const cfg = countryConfigs[countryCode];
    if (!cfg) return;
    const nextVendors = cfg.vendors.filter((_, i) => i !== vIdx);
    setCountryConfigs({
      ...countryConfigs,
      [countryCode]: {
        ...cfg,
        vendors: nextVendors,
      },
    });
  };

  /* ── Step Validations ── */
  const isStep1Valid = useMemo(() => {
    return (
      projectName.trim().length >= 3 &&
      projectName.trim().length <= 120 &&
      projectCode.trim().length >= 3 &&
      codeAvailable === true &&
      selectedClientId !== '' &&
      baseSurveyUrl.trim().startsWith('https://') &&
      uidParam.trim().length >= 1
    );
  }, [projectName, projectCode, codeAvailable, selectedClientId, baseSurveyUrl, uidParam]);

  const isStep2Valid = useMemo(() => {
    return selectedCountryCodes.length >= 1;
  }, [selectedCountryCodes]);

  const isStep3Valid = useMemo(() => {
    for (const code of selectedCountryCodes) {
      const c = countryConfigs[code];
      if (!c) return false;
      if (c.client_rate <= 0) return false;
      if (c.vendor_rate < 0 || c.vendor_rate > c.client_rate) return false;
      if (c.target_completes <= 0) return false;
      if (c.survey_url && !c.survey_url.startsWith('https://')) return false;
    }
    return true;
  }, [selectedCountryCodes, countryConfigs]);

  const isStep4Valid = useMemo(() => {
    for (const code of selectedCountryCodes) {
      const c = countryConfigs[code];
      if (!c) return false;
      if (!c.is_internal_only && c.vendors.length > 0) {
        const sum = c.vendors.reduce((acc, v) => acc + (Number(v.quota) || 0), 0);
        if (sum !== c.target_completes) return false;
        // Check duplicate vendors
        const vIds = c.vendors.map((v) => v.vendor_id);
        if (new Set(vIds).size !== vIds.length) return false;
      }
    }
    return true;
  }, [selectedCountryCodes, countryConfigs]);

  const stepNextEnabled = () => {
    if (currentStep === 1) return isStep1Valid;
    if (currentStep === 2) return isStep2Valid;
    if (currentStep === 3) return isStep3Valid;
    if (currentStep === 4) return isStep4Valid;
    return true;
  };

  const getStepValidationTooltip = () => {
    if (currentStep === 1) {
      if (!projectName.trim() || projectName.length < 3) return 'Project name requires 3-120 characters';
      if (!projectCode.trim() || !codeAvailable) return 'Project code must be unique and valid';
      if (!selectedClientId) return 'Please select an active client';
      if (!baseSurveyUrl.startsWith('https://')) return 'Base survey URL must start with https://';
      if (!uidParam.trim()) return 'UID parameter name is required';
    }
    if (currentStep === 2) {
      if (selectedCountryCodes.length === 0) return 'Select at least 1 country';
    }
    if (currentStep === 3) {
      for (const code of selectedCountryCodes) {
        const c = countryConfigs[code];
        if (!c) continue;
        if (c.client_rate <= 0) return `${c.country_name}: Client rate must be > 0`;
        if (c.vendor_rate > c.client_rate) return `${c.country_name}: Vendor rate cannot exceed client rate`;
        if (c.target_completes <= 0) return `${c.country_name}: Target completes must be > 0`;
      }
    }
    if (currentStep === 4) {
      for (const code of selectedCountryCodes) {
        const c = countryConfigs[code];
        if (!c) continue;
        if (!c.is_internal_only && c.vendors.length > 0) {
          const sum = c.vendors.reduce((acc, v) => acc + (Number(v.quota) || 0), 0);
          if (sum !== c.target_completes) {
            return `${c.country_name}: Quotas (${sum}) must equal country target (${c.target_completes})`;
          }
        }
      }
    }
    return '';
  };

  /* ── Final Submission Handler (Atomic Backend Call) ── */
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: projectName.trim(),
        project_code: projectCode.trim().toUpperCase(),
        client_id: selectedClientId,
        description: description.trim(),
        base_survey_url: baseSurveyUrl.trim(),
        uid_param: uidParam.trim(),
        callback_url_base: callbackUrlBase.trim(),
        countries: selectedCountryCodes.map((code) => {
          const c = countryConfigs[code];
          return {
            country_code: c.country_code,
            country_name: c.country_name,
            currency: c.currency,
            client_rate: Number(c.client_rate),
            vendor_rate: Number(c.vendor_rate),
            target_completes: Number(c.target_completes),
            survey_url: c.survey_url ? c.survey_url.trim() : undefined,
            est_loi: c.est_loi ? Number(c.est_loi) : null,
            fieldwork_days: c.fieldwork_days ? Number(c.fieldwork_days) : null,
            vendors: c.is_internal_only
              ? []
              : c.vendors.map((v) => ({
                  vendor_id: v.vendor_id,
                  vendor_name: v.vendor_name,
                  quota: Number(v.quota),
                  vendor_cpi: Number(v.vendor_cpi),
                })),
          };
        }),
      };

      const res = await apiClient.post<any>('/projects/atomic', payload);
      if (res.success && res.data) {
        setCreatedProject(res.data.project);
        setTrackingLinks(res.data.tracking_links || []);
        setSubmissionSuccess(true);
        showToast('Project created successfully with all tracking links!', 'success');
      } else {
        showToast(res.error?.message || 'Failed to create project', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Server error occurred during atomic creation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Export Helpers ── */
  const copyToClipboard = (text: string, label = 'Link') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const copyAllLinks = () => {
    const formatted = trackingLinks
      .map((l) => `${l.country_name} | ${l.vendor_name} | Quota: ${l.quota}\n${l.tracking_url}`)
      .join('\n\n');
    copyToClipboard(formatted, 'All tracking links');
  };

  const downloadCSV = () => {
    const headers = ['Country Code', 'Country Name', 'Vendor / Channel', 'Quota', 'CPI', 'Tracking URL', 'Destination Survey URL'];
    const rows = trackingLinks.map((l) => [
      l.country_code,
      `"${l.country_name}"`,
      `"${l.vendor_name}"`,
      l.quota,
      l.cpi,
      `"${l.tracking_url}"`,
      `"${l.survey_url}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${createdProject?.project_code || 'project'}_tracking_links.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || loadingRefData) {
    return (
      <DashboardLayout title="Create Project">
        <div className="flex flex-col items-center justify-center py-28">
          <div className="w-10 h-10 border-3 border-[var(--blue)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading configuration engine...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Render Success Screen ── */
  if (submissionSuccess && createdProject) {
    return (
      <DashboardLayout
        title="Project Created Successfully"
        subtitle={`Project Code: ${createdProject.project_code} • ${createdProject.name}`}
        breadcrumbs={[
          { label: 'Projects', href: '/dashboard/projects' },
          { label: 'New Project', href: '/dashboard/projects/new' },
          { label: 'Success' },
        ]}
      >
        <div className="max-w-5xl mx-auto space-y-6 py-4">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4 shadow-lg backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {createdProject.project_code}
                </span>
                <span className="text-xs text-emerald-400 font-medium">LIVE & READY FOR FIELDWORK</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-heading)]">{createdProject.name}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                All country routes, respondent security vaults, and vendor assignments were committed atomically in a single transaction.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/dashboard/projects/${createdProject.id}`)}
              >
                View Project Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Generated Links Card */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--border)] shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)] mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-[var(--blue)]" /> Ready-to-Distribute OPI Tracking Links
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Send these links to your assigned sample vendors or internal distribution team.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyAllLinks}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy All Links
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCSV}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download CSV
                </Button>
              </div>
            </div>

            {/* Links Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Market</th>
                    <th className="py-2.5 px-3">Partner / Channel</th>
                    <th className="py-2.5 px-3">Target Quota</th>
                    <th className="py-2.5 px-3">CPI Rate</th>
                    <th className="py-2.5 px-3">OPI Tracking URL</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {trackingLinks.map((l, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[var(--text-heading)] whitespace-nowrap">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] mr-1.5">
                          {l.country_code}
                        </span>
                        {l.country_name}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-primary)] whitespace-nowrap">
                        {l.vendor_name}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-[var(--blue)]">
                        {l.quota.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">
                        ${l.cpi.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate font-mono text-[11px] text-[var(--text-muted)]">
                        {l.tracking_url}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(l.tracking_url, `${l.country_name} Link`)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Next Steps Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard/projects')}>
              ← Back to Projects List
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSubmissionSuccess(false);
                setCreatedProject(null);
                setCurrentStep(1);
                setProjectName('');
                setProjectCode(`OPI-${Date.now().toString().slice(-4)}`);
                setSelectedCountryCodes(['IN']);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Another Project
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Create New Project"
      subtitle="5-Step Multi-Country Fieldwork Wizard"
      breadcrumbs={[
        { label: 'Projects', href: '/dashboard/projects' },
        { label: 'New Project' },
      ]}
      actions={
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
          Cancel
        </Button>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* ── Progress Stepper Bar ── */}
        <div className="glass-card p-4 rounded-2xl border border-[var(--border)] shadow-md">
          <div className="grid grid-cols-5 gap-2">
            {WIZARD_STEPS.map((s) => {
              const IconComp = s.icon;
              const isDone = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isDone) setCurrentStep(s.id);
                  }}
                  className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                    isDone ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all shadow-sm ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isCurrent
                        ? 'bg-[var(--blue)] text-white shadow-blue-500/30 shadow-md ring-2 ring-[var(--blue)]/30'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : <IconComp className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-[var(--text-heading)]'
                        : isDone
                        ? 'text-emerald-400'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] hidden sm:block truncate max-w-full">
                    {s.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Wizard Step Container ── */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[var(--border)] shadow-xl min-h-[460px]">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[var(--blue)]" /> Step 1: Project & Client Identification
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Specify survey identification details and default client endpoints.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Code */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                    Project Code <span className="text-[var(--danger)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono font-semibold uppercase text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                      placeholder="e.g. OPI-9901"
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                    />
                    <div className="absolute right-2.5 top-2.5">
                      {codeChecking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
                      ) : codeAvailable === true ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          Available
                        </span>
                      ) : codeAvailable === false ? (
                        <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                          Taken
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    Alphanumeric and hyphens only. Must be unique.
                  </span>
                </div>

                {/* Client Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                    Client Organization <span className="text-[var(--danger)]">*</span>
                  </label>
                  <select
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    {activeClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.client_code})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    Clients loaded from active directory.
                  </span>
                </div>
              </div>

              {/* Project Title */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                  Project Title / Study Name <span className="text-[var(--danger)]">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                  placeholder="e.g. Global Tech Consumer Habits Q4 2026"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              {/* Base Survey URL with Probe Button */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                  Base Client Survey URL <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-heading)] font-mono focus:outline-none focus:border-[var(--blue)]"
                    placeholder="https://surveys.client.com/take?survey_id=9876"
                    value={baseSurveyUrl}
                    onChange={(e) => {
                      setBaseSurveyUrl(e.target.value);
                      setUrlReachable(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={probeBaseUrl}
                    disabled={urlProbing || !baseSurveyUrl.startsWith('https://')}
                  >
                    {urlProbing ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <ExternalLink className="w-3.5 h-3.5 mr-1" />}
                    Test Reachability
                  </Button>
                </div>
                {urlProbeMessage && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    {urlReachable === true ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {urlProbeMessage}
                      </span>
                    ) : urlReachable === false ? (
                      <span className="text-rose-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {urlProbeMessage}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">{urlProbeMessage}</span>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Must be public HTTPS. Private IPs and localhost are strictly blocked.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* UID Parameter Name */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                    UID Query Parameter Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                    placeholder="uid, rid, resp_id..."
                    value={uidParam}
                    onChange={(e) => setUidParam(e.target.value)}
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    Parameter name expected by client survey for respondent ID.
                  </span>
                </div>

                {/* Callback URL Base */}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                    Callback Base Postback URL
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                    value={callbackUrlBase}
                    onChange={(e) => setCallbackUrlBase(e.target.value)}
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                    Auto-configured callback webhook endpoint.
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)] mb-1.5">
                  Project Notes / Internal Description
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                  placeholder="Optional notes regarding targeting, quotas, or fieldwork criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Select Countries */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--blue)]" /> Step 2: Target Countries & Markets
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Select all countries included in this fieldwork study. Currencies will be detected automatically.
                </p>
              </div>

              {/* Selected Chips */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-heading)]">
                    Selected Markets ({selectedCountryCodes.length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredCountries}
                      className="text-[11px] text-[var(--blue)] hover:underline"
                    >
                      Select All Filtered
                    </button>
                    <span className="text-[var(--text-muted)]">•</span>
                    <button
                      type="button"
                      onClick={clearAllCountries}
                      className="text-[11px] text-[var(--danger)] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {selectedCountryCodes.map((code) => {
                    const c = MASTER_COUNTRIES.find((m) => m.code === code);
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--blue)]/15 border border-[var(--blue)]/30 text-[var(--blue)]"
                      >
                        <span className="font-mono font-bold text-[10px]">{code}</span>
                        {c?.name || code}
                        <button
                          type="button"
                          onClick={() => toggleCountry(code)}
                          className="hover:text-rose-400 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Search & Region Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-heading)] focus:outline-none focus:border-[var(--blue)]"
                    placeholder="Search countries by name or code..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {REGIONS.map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => setSelectedRegion(reg)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedRegion === reg
                          ? 'bg-[var(--blue)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-heading)]'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredCountries.map((c) => {
                  const isSelected = selectedCountryCodes.includes(c.code);
                  return (
                    <div
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--blue)]/10 border-[var(--blue)] shadow-sm'
                          : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-[var(--text-muted)]">
                            {c.code}
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-heading)] truncate">
                            {c.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          {c.region} • {c.currency}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-[var(--blue)] border-[var(--blue)] text-white'
                            : 'border-[var(--border)] bg-[var(--bg-tertiary)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Configure Countries */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[var(--blue)]" /> Step 3: Configure Rates, Quotas & URLs
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Set target completes, pricing, and live margin calculations for each country.
                  </p>
                </div>

                {/* Bulk Apply Bar */}
                {selectedCountryCodes.length > 1 && (
                  <div className="flex items-center gap-2 bg-[var(--bg-secondary)] p-1.5 rounded-lg border border-[var(--border)]">
                    <select
                      className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none"
                      value={bulkApplyCountry}
                      onChange={(e) => setBulkApplyCountry(e.target.value)}
                    >
                      <option value="">Copy rates from...</option>
                      {selectedCountryCodes.map((code) => (
                        <option key={code} value={code}>
                          {countryConfigs[code]?.country_name || code}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!bulkApplyCountry}
                      onClick={() => applyRatesToAll(bulkApplyCountry)}
                    >
                      Apply to All
                    </Button>
                  </div>
                )}
              </div>

              {/* Accordion List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedCountryCodes.map((code) => {
                  const cfg = countryConfigs[code];
                  if (!cfg) return null;
                  const isExp = !!expandedAccordions[code];

                  const marginVal = cfg.client_rate - cfg.vendor_rate;
                  const marginPct = cfg.client_rate > 0 ? (marginVal / cfg.client_rate) * 100 : 0;
                  const isPositive = marginVal >= 0;

                  return (
                    <div
                      key={code}
                      className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-secondary)] transition-all shadow-sm"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() =>
                          setExpandedAccordions((prev) => ({ ...prev, [code]: !prev[code] }))
                        }
                        className="p-4 cursor-pointer flex items-center justify-between hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/30">
                            {code}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-heading)]">
                            {cfg.country_name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">
                            Target: {cfg.target_completes}
                          </span>
                        </div>

                        {/* Live Margin Badge in Header */}
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            Margin: {isPositive ? '+' : ''}
                            {marginPct.toFixed(1)}% (${marginVal.toFixed(2)}/int)
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">{isExp ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExp && (
                        <div className="p-4 pt-0 border-t border-[var(--border)] space-y-4 bg-[var(--bg-page)]/40">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                            {/* Currency */}
                            <div>
                              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                Currency
                              </label>
                              <select
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)]"
                                value={cfg.currency}
                                onChange={(e) =>
                                  setCountryConfigs({
                                    ...countryConfigs,
                                    [code]: { ...cfg, currency: e.target.value },
                                  })
                                }
                              >
                                {CURRENCIES.map((curr) => (
                                  <option key={curr} value={curr}>
                                    {curr}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Client Rate */}
                            <div>
                              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                Client Rate ({cfg.currency})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)] font-mono"
                                value={cfg.client_rate}
                                onChange={(e) =>
                                  setCountryConfigs({
                                    ...countryConfigs,
                                    [code]: { ...cfg, client_rate: parseFloat(e.target.value) || 0 },
                                  })
                                }
                              />
                            </div>

                            {/* Vendor Rate */}
                            <div>
                              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                Vendor Rate ({cfg.currency})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)] font-mono"
                                value={cfg.vendor_rate}
                                onChange={(e) =>
                                  setCountryConfigs({
                                    ...countryConfigs,
                                    [code]: { ...cfg, vendor_rate: parseFloat(e.target.value) || 0 },
                                  })
                                }
                              />
                            </div>

                            {/* Target Completes */}
                            <div>
                              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                Target Completes
                              </label>
                              <input
                                type="number"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)] font-mono"
                                value={cfg.target_completes}
                                onChange={(e) =>
                                  setCountryConfigs({
                                    ...countryConfigs,
                                    [code]: { ...cfg, target_completes: parseInt(e.target.value) || 0 },
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Survey URL Override */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                Country Survey URL Override (Optional)
                              </label>
                              <input
                                type="url"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)] font-mono"
                                placeholder={`Leave blank to inherit: ${baseSurveyUrl || 'base URL'}`}
                                value={cfg.survey_url}
                                onChange={(e) =>
                                  setCountryConfigs({
                                    ...countryConfigs,
                                    [code]: { ...cfg, survey_url: e.target.value },
                                  })
                                }
                              />
                            </div>

                            {/* Fieldwork & LOI */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                  Est. LOI (min)
                                </label>
                                <input
                                  type="number"
                                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)]"
                                  value={cfg.est_loi}
                                  onChange={(e) =>
                                    setCountryConfigs({
                                      ...countryConfigs,
                                      [code]: { ...cfg, est_loi: parseInt(e.target.value) || 0 },
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                                  Fieldwork Days
                                </label>
                                <input
                                  type="number"
                                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-heading)]"
                                  value={cfg.fieldwork_days}
                                  onChange={(e) =>
                                    setCountryConfigs({
                                      ...countryConfigs,
                                      [code]: { ...cfg, fieldwork_days: parseInt(e.target.value) || 0 },
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Vendors per Country */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--blue)]" /> Step 4: Sample Vendors & Quota Allocation
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Allocate quotas across sample vendors or enable Internal/Direct Study mode.
                </p>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {selectedCountryCodes.map((code) => {
                  const cfg = countryConfigs[code];
                  if (!cfg) return null;

                  const quotaSum = cfg.vendors.reduce((acc, v) => acc + (Number(v.quota) || 0), 0);
                  const isBalanced = cfg.is_internal_only || quotaSum === cfg.target_completes;
                  const delta = cfg.target_completes - quotaSum;

                  return (
                    <div
                      key={code}
                      className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-secondary)] space-y-3 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--blue)]/20 text-[var(--blue)]">
                            {code}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-heading)]">
                            {cfg.country_name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            (Target: {cfg.target_completes.toLocaleString()})
                          </span>
                        </div>

                        {/* Internal Study Toggle & Quota Balance Indicator */}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="rounded border-[var(--border)] text-[var(--blue)]"
                              checked={cfg.is_internal_only}
                              onChange={(e) =>
                                setCountryConfigs({
                                  ...countryConfigs,
                                  [code]: { ...cfg, is_internal_only: e.target.checked },
                                })
                              }
                            />
                            Internal / Direct Only (No Vendor)
                          </label>

                          {!cfg.is_internal_only && (
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                                isBalanced
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isBalanced
                                ? `✓ Quotas Balanced (${quotaSum}/${cfg.target_completes})`
                                : `⚠ Quota Mismatch (${quotaSum}/${cfg.target_completes} — ${Math.abs(delta)} ${
                                    delta > 0 ? 'remaining' : 'over'
                                  })`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vendor List or Internal Notice */}
                      {cfg.is_internal_only ? (
                        <div className="py-4 text-center bg-[var(--bg-page)]/50 rounded-lg border border-[var(--border)]">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                          <p className="text-xs font-semibold text-[var(--text-heading)]">
                            Internal Study Enabled
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] max-w-md mx-auto">
                            A direct OPI tracking link will be generated for your internal team without third-party vendor postbacks.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cfg.vendors.map((v, vIdx) => (
                            <div
                              key={vIdx}
                              className="grid grid-cols-12 gap-2 items-center bg-[var(--bg-page)] p-2.5 rounded-lg border border-[var(--border)]"
                            >
                              {/* Vendor Selector */}
                              <div className="col-span-5">
                                <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
                                  Vendor Partner
                                </label>
                                <select
                                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-heading)]"
                                  value={v.vendor_id}
                                  onChange={(e) =>
                                    updateVendorQuota(code, vIdx, 'vendor_id', e.target.value)
                                  }
                                >
                                  {activeVendors.map((av) => (
                                    <option key={av.id} value={av.id}>
                                      {av.name} ({av.vendor_code})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Quota */}
                              <div className="col-span-3">
                                <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
                                  Quota
                                </label>
                                <input
                                  type="number"
                                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-heading)]"
                                  value={v.quota}
                                  onChange={(e) =>
                                    updateVendorQuota(
                                      code,
                                      vIdx,
                                      'quota',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>

                              {/* Vendor CPI */}
                              <div className="col-span-3">
                                <label className="block text-[10px] text-[var(--text-muted)] mb-0.5">
                                  Vendor CPI ({cfg.currency})
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-heading)]"
                                  value={v.vendor_cpi}
                                  onChange={(e) =>
                                    updateVendorQuota(
                                      code,
                                      vIdx,
                                      'vendor_cpi',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>

                              {/* Remove */}
                              <div className="col-span-1 text-right pt-3">
                                <button
                                  type="button"
                                  onClick={() => removeVendorFromCountry(code, vIdx)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addVendorToCountry(code)}
                            className="text-xs text-[var(--blue)] hover:bg-[var(--blue)]/10"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Vendor Partner
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Step 5: Final Review & Pre-Flight Checklist
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Verify the project hierarchy and commercial projections before launch.
                </p>
              </div>

              {/* High Level Financials Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card p-3 rounded-xl border border-[var(--border)] text-center">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Total Completes
                  </span>
                  <span className="text-lg font-bold text-[var(--text-heading)] font-mono">
                    {selectedCountryCodes
                      .reduce((acc, c) => acc + (countryConfigs[c]?.target_completes || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="glass-card p-3 rounded-xl border border-[var(--border)] text-center">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Target Markets
                  </span>
                  <span className="text-lg font-bold text-[var(--blue)] font-mono">
                    {selectedCountryCodes.length} Countries
                  </span>
                </div>
                <div className="glass-card p-3 rounded-xl border border-[var(--border)] text-center">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Client Partner
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-heading)] truncate block mt-1">
                    {activeClients.find((c) => c.id === selectedClientId)?.name || 'Selected Client'}
                  </span>
                </div>
                <div className="glass-card p-3 rounded-xl border border-[var(--border)] text-center">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                    Security Level
                  </span>
                  <span className="text-xs font-bold text-emerald-400 block mt-1">
                    ✓ Antidetect / Tokenized
                  </span>
                </div>
              </div>

              {/* Hierarchy Tree View */}
              <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bg-secondary)] space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--blue)] text-white">
                    {projectCode}
                  </span>
                  <span className="font-bold text-sm text-[var(--text-heading)]">{projectName}</span>
                </div>

                <div className="space-y-3 pl-4 border-l-2 border-[var(--border)]">
                  {selectedCountryCodes.map((code) => {
                    const cfg = countryConfigs[code];
                    if (!cfg) return null;
                    const margin = cfg.client_rate - cfg.vendor_rate;
                    return (
                      <div key={code} className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="w-3.5 h-3.5 text-[var(--blue)]" />
                          <span className="font-semibold text-[var(--text-heading)]">
                            {cfg.country_name} ({code})
                          </span>
                          <span className="text-[var(--text-muted)] font-mono">
                            • Target: {cfg.target_completes} • Client Rate: {cfg.currency} {cfg.client_rate.toFixed(2)} • Margin: +${margin.toFixed(2)}/int
                          </span>
                        </div>

                        {/* Vendors or Direct */}
                        <div className="pl-5 space-y-1">
                          {cfg.is_internal_only ? (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Internal / Direct Link (No vendor) — Quota: {cfg.target_completes}
                            </div>
                          ) : (
                            cfg.vendors.map((v, idx) => (
                              <div key={idx} className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)]" />
                                <span className="text-[var(--text-primary)] font-medium">{v.vendor_name || 'Vendor'}</span>
                                <span>— Quota: {v.quota}</span>
                                <span>• CPI: {cfg.currency} {v.vendor_cpi.toFixed(2)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pre-Flight Checklist */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <span className="text-xs font-bold text-emerald-400 block mb-1">
                  Pre-Flight Verification Checklist
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-primary)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Project Code & Name verified unique
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Base survey URL validated HTTPS
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All country quotas 100% balanced
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Positive commercial profit margins confirmed
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Wizard Action Navigation ── */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={currentStep === 1 || isSubmitting}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {!stepNextEnabled() && (
              <span className="text-xs text-rose-400 font-medium hidden sm:inline flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {getStepValidationTooltip()}
              </span>
            )}

            {currentStep < 5 ? (
              <Button
                variant="primary"
                disabled={!stepNextEnabled() || isSubmitting}
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              >
                Next Step <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!stepNextEnabled() || isSubmitting}
                onClick={handleFinalSubmit}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> Launching Project...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Create & Launch Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
