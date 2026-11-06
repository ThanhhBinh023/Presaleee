import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useClientDirectory } from '../hooks/useClientDirectory';
import { useClientLeads } from '../hooks/useClientLeads';
import { clientService } from '../services/clientService';
import type { UpdateClientInput } from '../services/clientService';
import { navigateTo } from '../navigation';
import { formatDateTime } from '../utils/format';
import { CLIENT_INDUSTRIES, LEAD_STATUSES } from '../types/client';
import type { ClientRecord } from '../types/client';

const PAGE_SIZE = 20;
const LEAD_PAGE_SIZE = 10;

const EMPTY_FORM = {
  companyName: '',
  industry: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  country: 'Vietnam'
};

type FormState = typeof EMPTY_FORM;

function toForm(client: ClientRecord): FormState {
  return {
    companyName: client.companyName,
    industry: client.industry ?? '',
    contactPerson: client.contactPerson ?? '',
    contactEmail: client.contactEmail ?? '',
    contactPhone: client.contactPhone ?? '',
    country: client.country
  };
}

/** Only send fields the operator actually changed so CLIENT_UPDATED records a truthful changedFields list. */
function buildPatch(original: ClientRecord, form: FormState): UpdateClientInput {
  const patch: UpdateClientInput = {};
  const companyName = form.companyName.trim();
  if (companyName && companyName !== original.companyName) patch.companyName = companyName;

  const industry = form.industry || null;
  if (industry !== (original.industry ?? null)) patch.industry = industry;

  const contactPerson = form.contactPerson.trim() || null;
  if (contactPerson !== (original.contactPerson ?? null)) patch.contactPerson = contactPerson;

  const contactEmail = form.contactEmail.trim() || null;
  if (contactEmail !== (original.contactEmail ?? null)) patch.contactEmail = contactEmail;

  const contactPhone = form.contactPhone.trim() || null;
  if (contactPhone !== (original.contactPhone ?? null)) patch.contactPhone = contactPhone;

  const country = form.country.trim();
  if (country !== original.country) patch.country = country;

  return patch;
}

interface ClientsDirectoryProps {
  onBackToOverview: () => void;
}

export const ClientsDirectory: React.FC<ClientsDirectoryProps> = ({ onBackToOverview }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'PRESALE_LEAD';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [page, setPage] = useState(1);

  const [mode, setMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [detail, setDetail] = useState<ClientRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [leadStatus, setLeadStatus] = useState('');
  const [leadPage, setLeadPage] = useState(1);

  const { clients, meta, isLoading, error, reload } = useClientDirectory({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    industry: industry || undefined
  });
  const leads = useClientLeads(detail?.id ?? null, {
    page: leadPage,
    limit: LEAD_PAGE_SIZE,
    status: leadStatus || undefined
  });

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, industry]);

  useEffect(() => {
    setLeadPage(1);
  }, [leadStatus, detail?.id]);

  const totalPages = meta?.totalPages ?? 1;
  const leadTotalPages = leads.meta?.totalPages ?? 1;

  /** Legacy rows may hold an industry outside the taxonomy; keep it selectable so an edit cannot wipe it. */
  const industryOptions: string[] = (CLIENT_INDUSTRIES as readonly string[]).includes(form.industry)
    ? [...CLIENT_INDUSTRIES]
    : form.industry
      ? [form.industry, ...CLIENT_INDUSTRIES]
      : [...CLIENT_INDUSTRIES];

  const pendingPatch = mode === 'edit' && editing ? buildPatch(editing, form) : null;

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setLeadStatus('');
    try {
      setDetail(await clientService.getClient(id));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load the client.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailError(null);
  };

  const openCreate = () => {
    setMode('create');
    setEditing(null);
    setForm(EMPTY_FORM);
    setActionError(null);
    setNotice(null);
  };

  const openEdit = (client: ClientRecord) => {
    setMode('edit');
    setEditing(client);
    setForm(toForm(client));
    setActionError(null);
    setNotice(null);
  };

  const closeForm = () => {
    setMode('none');
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      if (mode === 'edit' && editing) {
        const patch = buildPatch(editing, form);
        if (Object.keys(patch).length === 0) {
          setActionError('Nothing to save — change at least one field.');
          return;
        }
        const updated = await clientService.updateClient(editing.id, patch);
        setNotice(`Saved ${updated.companyName}.`);
        if (detail?.id === updated.id) setDetail(updated);
      } else {
        const created = await clientService.createClient({
          companyName: form.companyName.trim(),
          industry: form.industry || null,
          contactPerson: form.contactPerson.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          country: form.country.trim()
        });
        setNotice(`Created ${created.companyName}.`);
      }
      closeForm();
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeClient = async (client: ClientRecord) => {
    setActionError(null);
    setNotice(null);
    try {
      await clientService.deleteClient(client.id);
      setNotice(`Deleted ${client.companyName}.`);
      if (detail?.id === client.id) closeDetail();
      setConfirmDeleteId(null);
      reload();
    } catch (err) {
      setConfirmDeleteId(null);
      setActionError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const fieldClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 font-sans text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={onBackToOverview} className="text-xs font-mono font-bold text-brand-700 hover:underline">
              &larr; OVERVIEW
            </button>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Clients</h1>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <button
                onClick={mode === 'none' ? openCreate : closeForm}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
              >
                {mode === 'none' ? 'Add client' : 'Close form'}
              </button>
            )}
            <button
              onClick={() => navigateTo('audit')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Audit trail
            </button>
          </div>
        </div>

        {!user?.organizationId && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Your account is not attached to an organization yet, so the client API rejects every request. Join or create
            an organization first.
          </p>
        )}

        {actionError && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>
        )}
        {notice && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
        )}

        {mode !== 'none' && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              {mode === 'create' ? 'New client' : `Editing ${editing?.companyName ?? ''}`}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Company name"
                maxLength={255}
                className={fieldClass}
              />
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className={fieldClass}
              >
                <option value="">— No industry —</option>
                {industryOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Contact person"
                maxLength={255}
                className={fieldClass}
              />
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                placeholder="contact@company.com"
                maxLength={255}
                className={fieldClass}
              />
              <input
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+84 90 000 0000"
                maxLength={50}
                className={fieldClass}
              />
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Country"
                maxLength={100}
                className={fieldClass}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={submitForm}
                disabled={isSubmitting || form.companyName.trim().length === 0}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
              >
                {mode === 'create' ? 'Create client' : 'Save changes'}
              </button>
              <button
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              {mode === 'edit' && pendingPatch && Object.keys(pendingPatch).length === 0 && (
                <span className="text-xs text-slate-400">Edit a field to enable saving.</span>
              )}
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500">
            SEARCH
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="company name"
              className="w-44 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-[10px] font-mono font-bold text-slate-500">
            INDUSTRY
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-sans font-normal"
            >
              <option value="">All</option>
              {CLIENT_INDUSTRIES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            onClick={reload}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Reload
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">CLIENT</th>
                <th className="px-4 py-3">INDUSTRY</th>
                <th className="px-4 py-3">CONTACT</th>
                <th className="px-4 py-3">COUNTRY</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No clients match these filters.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-bold">{client.companyName}</div>
                      <div className="truncate text-xs text-slate-400">{client.id}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{client.industry ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{client.contactPerson ?? '—'}</div>
                      <div className="text-slate-400">{client.contactEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{client.country}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => void openDetail(client.id)}
                        disabled={detailLoading}
                        className="mr-2 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Details
                      </button>
                      {canManage && (
                        <>
                          <button
                            onClick={() => openEdit(client)}
                            className="mr-2 rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {confirmDeleteId === client.id ? (
                            <>
                              <button
                                onClick={() => void removeClient(client)}
                                disabled={isSubmitting}
                                className="mr-2 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(client.id)}
                              className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:border-rose-300 hover:text-rose-600"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">
            {meta ? `${meta.total} clients • page ${meta.page}/${totalPages}` : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded border border-slate-300 px-3 py-1 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded border border-slate-300 px-3 py-1 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {(detail !== null || detailLoading || detailError !== null) && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Client details</h2>
              <button onClick={closeDetail} className="text-xs font-bold text-slate-500 hover:underline">
                Close
              </button>
            </div>
            {detailLoading && <p className="text-sm text-slate-400">Loading…</p>}
            {detailError !== null && <p className="text-sm text-rose-600">{detailError}</p>}
            {detail !== null && (
              <>
                <dl className="grid gap-x-6 text-sm md:grid-cols-2">
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Company</dt>
                    <dd className="font-bold">{detail.companyName}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Industry</dt>
                    <dd className="font-mono">{detail.industry ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Contact person</dt>
                    <dd>{detail.contactPerson ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Contact email</dt>
                    <dd className="truncate font-mono text-xs">{detail.contactEmail ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Contact phone</dt>
                    <dd className="font-mono text-xs">{detail.contactPhone ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Country</dt>
                    <dd>{detail.country}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Created</dt>
                    <dd className="font-mono text-xs">{formatDateTime(detail.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1">
                    <dt className="text-slate-500">Last updated</dt>
                    <dd className="font-mono text-xs">{formatDateTime(detail.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Leads for this client
                    </h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={leadStatus}
                        onChange={(e) => setLeadStatus(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">All statuses</option>
                        {LEAD_STATUSES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      <button
                        onClick={leads.reload}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Reload
                      </button>
                    </div>
                  </div>

                  {leads.error && <p className="mb-2 text-sm text-rose-600">{leads.error}</p>}
                  {leads.isLoading ? (
                    <p className="text-sm text-slate-400">Loading…</p>
                  ) : leads.leads.length === 0 ? (
                    <p className="text-sm text-slate-400">No leads linked to this client{leadStatus ? ' with this status' : ''}.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-mono font-bold text-slate-500">
                          <tr>
                            <th className="px-3 py-2">TITLE</th>
                            <th className="px-3 py-2">SOURCE</th>
                            <th className="px-3 py-2">STATUS</th>
                            <th className="px-3 py-2">BANT</th>
                            <th className="px-3 py-2">UPDATED</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leads.leads.map((lead) => (
                            <tr key={lead.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">
                                <div className="text-xs font-bold text-slate-800">{lead.title}</div>
                                <div className="truncate text-[10px] text-slate-400">{lead.id}</div>
                              </td>
                              <td className="px-3 py-2 text-[10px] font-mono text-slate-500">{lead.source}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                    lead.status === 'WON'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : lead.status === 'LOST' || lead.status === 'REJECTED'
                                        ? 'bg-rose-50 text-rose-700'
                                        : 'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  {lead.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-600">{lead.bantScore ?? '—'}</td>
                              <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{formatDateTime(lead.updatedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-end gap-2 text-xs text-slate-500">
                    <span className="mr-auto font-mono">
                      {leads.meta ? `${leads.meta.total} leads • page ${leads.meta.page}/${leadTotalPages}` : ''}
                    </span>
                    <button
                      onClick={() => setLeadPage((p) => Math.max(1, p - 1))}
                      disabled={leadPage <= 1 || leads.isLoading}
                      className="rounded border border-slate-300 px-2 py-1 font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setLeadPage((p) => Math.min(leadTotalPages, p + 1))}
                      disabled={leadPage >= leadTotalPages || leads.isLoading}
                      className="rounded border border-slate-300 px-2 py-1 font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsDirectory;
