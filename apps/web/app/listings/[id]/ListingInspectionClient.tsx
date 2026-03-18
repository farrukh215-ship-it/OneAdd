'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InspectionRequest, Listing, WorkshopPartner } from '@tgmg/types';
import { useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  BOOKED: 'Booked',
  WORKSHOP_VERIFIED: 'Workshop Verified',
  POLICE_VERIFIED: 'Police Verified',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

function isInspectionEligible(listing: Listing) {
  return listing.category?.slug === 'cars' || listing.category?.slug === 'motorcycles';
}

export function ListingInspectionClient({ listing }: { listing: Listing }) {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const [selectedWorkshop, setSelectedWorkshop] = useState('');
  const [bookedDate, setBookedDate] = useState('');
  const [avlsRef, setAvlsRef] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [reportFrontUrl, setReportFrontUrl] = useState('');
  const [reportBackUrl, setReportBackUrl] = useState('');
  const [evidence, setEvidence] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const canUse = isInspectionEligible(listing);
  const isOwner = currentUser?.id === listing.userId;

  const inspectionQuery = useQuery({
    queryKey: ['inspection-summary', listing.id],
    queryFn: async () => {
      try {
        const response = await api.get<InspectionRequest | null>(`/inspections/listing/${listing.id}/summary`);
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(canUse),
  });

  const workshopsQuery = useQuery({
    queryKey: ['inspection-workshops', listing.city],
    queryFn: async () => {
      const response = await api.get<WorkshopPartner[]>('/inspections/workshops', {
        params: { city: listing.city },
      });
      return response.data;
    },
    enabled: canUse && isOwner,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['inspection-summary', listing.id] });

  const requestMutation = useMutation({
    mutationFn: () => api.post('/inspections/request', { listingId: listing.id }),
    onSuccess: refresh,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/book`, {
        workshopPartnerId: selectedWorkshop,
        bookedDate,
        offlinePaymentAcknowledged: true,
      }),
    onSuccess: refresh,
  });

  const workshopVerifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/workshop-verify`, {
        inspectorName: currentUser?.name || 'Workshop Inspector',
      }),
    onSuccess: refresh,
  });

  const policeVerifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/police-verify`, {
        isStolen: false,
        firStatus: 'Clear',
        avlsReferenceNo: avlsRef || 'AVLS-PENDING',
        policeStation: policeStation || 'Lahore',
      }),
    onSuccess: refresh,
  });

  const submitReportMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/report`, {
        vehicleInfo: { make: listing.attributes?.make || '', model: listing.attributes?.model || '', year: listing.attributes?.year || '' },
        ownerVerification: { cnicMatch: true, registrationBookSeen: true },
        avlsVerification: { avlsReferenceNo: avlsRef || 'AVLS-PENDING', policeStation: policeStation || 'Lahore', isStolen: false },
        mechanicalChecklist: { engine: 'ok', brakes: 'ok', suspension: 'ok' },
        bodyChecklist: { paint: 'good', frame: 'ok' },
        interiorChecklist: { dashboard: 'ok', seats: 'ok' },
        tyreChecklist: { frontLeft: 'ok', frontRight: 'ok', rearLeft: 'ok', rearRight: 'ok', spare: 'ok' },
        evidencePhotos: evidence.split(',').map((item) => item.trim()).filter(Boolean),
        formPageFrontUrl: reportFrontUrl || undefined,
        formPageBackUrl: reportBackUrl || undefined,
        overallRating: 4,
        verdict: 'RECOMMENDED',
        signatures: { owner: true, inspector: true, manager: true, police: true },
        stamps: { workshop: true, police: true, avls: true, tgmg: true, digital: true },
      }),
    onSuccess: refresh,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/admin-approve`, {
        badgeLabel: 'TGMG Inspected',
      }),
    onSuccess: refresh,
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/inspections/${inspectionQuery.data?.id}/admin-reject`, {
        note: decisionNote || 'Recheck required',
      }),
    onSuccess: refresh,
  });

  const status = inspectionQuery.data?.status;
  const statusLabel = status ? STATUS_LABEL[status] ?? status : 'Not Requested';
  const canBook = status === 'REQUESTED' || status === 'REJECTED' || status === 'EXPIRED';
  const canSubmitReport = status === 'POLICE_VERIFIED' || status === 'SUBMITTED';

  const timeline = useMemo(
    () => [
      'REQUESTED',
      'BOOKED',
      'WORKSHOP_VERIFIED',
      'POLICE_VERIFIED',
      'SUBMITTED',
      'APPROVED',
    ],
    [],
  );

  if (!canUse) return null;

  return (
    <section className="surface-premium mt-5 p-5 md:p-6">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink3">Inspection</div>
      <h3 className="mt-2 text-xl font-extrabold text-ink">Workshop + AVLS + Police Verification</h3>
      <p className="mt-2 text-sm text-ink2">
        Status: <span className="font-bold text-ink">{statusLabel}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {timeline.map((item) => (
          <span
            key={item}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              status === item || (status === 'APPROVED' && item !== 'APPROVED')
                ? 'bg-[rgba(46,125,50,0.12)] text-green'
                : 'bg-[#F1F3F5] text-ink2'
            }`}
          >
            {STATUS_LABEL[item]}
          </span>
        ))}
      </div>

      {listing.isInspectionApproved ? (
        <div className="mt-4 rounded-xl border border-[rgba(46,125,50,0.35)] bg-[rgba(46,125,50,0.08)] p-3 text-sm font-semibold text-green">
          ✅ {listing.inspectionBadgeLabel || 'TGMG Inspected'}
        </div>
      ) : null}

      {isOwner && !inspectionQuery.data ? (
        <button
          onClick={() => requestMutation.mutate()}
          className="mt-4 rounded-xl bg-red px-4 py-2.5 text-sm font-bold text-white"
          disabled={requestMutation.isPending}
        >
          {requestMutation.isPending ? 'Requesting...' : 'Inspection Book Karo'}
        </button>
      ) : null}

      {isOwner && canBook ? (
        <div className="mt-4 rounded-xl border border-border bg-white p-4">
          <div className="text-sm font-bold text-ink">Step: Workshop booking + PKR 3,000 offline</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select
              className="rounded-xl border border-border px-3 py-2 text-sm"
              value={selectedWorkshop}
              onChange={(event) => setSelectedWorkshop(event.target.value)}
            >
              <option value="">Workshop select karein</option>
              {(workshopsQuery.data ?? []).map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name} - {workshop.city}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="rounded-xl border border-border px-3 py-2 text-sm"
              value={bookedDate}
              onChange={(event) => setBookedDate(event.target.value)}
            />
          </div>
          <button
            onClick={() => bookMutation.mutate()}
            disabled={!selectedWorkshop || !bookedDate || bookMutation.isPending}
            className="mt-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {bookMutation.isPending ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      ) : null}

      {currentUser?.role === 'WORKSHOP_MANAGER' && status === 'BOOKED' ? (
        <button
          onClick={() => workshopVerifyMutation.mutate()}
          className="mt-4 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-bold text-white"
          disabled={workshopVerifyMutation.isPending}
        >
          {workshopVerifyMutation.isPending ? 'Updating...' : 'Workshop Verify'}
        </button>
      ) : null}

      {currentUser?.role === 'POLICE_OFFICER' && status === 'WORKSHOP_VERIFIED' ? (
        <div className="mt-4 rounded-xl border border-border bg-white p-4">
          <div className="text-sm font-bold text-ink">AVLS + Police Verification</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              className="rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="AVLS Reference No"
              value={avlsRef}
              onChange={(event) => setAvlsRef(event.target.value)}
            />
            <input
              className="rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Police Station"
              value={policeStation}
              onChange={(event) => setPoliceStation(event.target.value)}
            />
          </div>
          <button
            onClick={() => policeVerifyMutation.mutate()}
            className="mt-3 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-bold text-white"
            disabled={policeVerifyMutation.isPending}
          >
            {policeVerifyMutation.isPending ? 'Verifying...' : 'Police Verify'}
          </button>
        </div>
      ) : null}

      {isOwner && canSubmitReport ? (
        <div className="mt-4 rounded-xl border border-border bg-white p-4">
          <div className="text-sm font-bold text-ink">Submit 2-page form + evidence</div>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Form Page 1 URL"
              value={reportFrontUrl}
              onChange={(event) => setReportFrontUrl(event.target.value)}
            />
            <input
              className="rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Form Page 2 URL"
              value={reportBackUrl}
              onChange={(event) => setReportBackUrl(event.target.value)}
            />
            <input
              className="rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Evidence URLs comma separated"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
            />
          </div>
          <button
            onClick={() => submitReportMutation.mutate()}
            className="mt-3 rounded-xl bg-red px-4 py-2.5 text-sm font-bold text-white"
            disabled={submitReportMutation.isPending}
          >
            {submitReportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      ) : null}

      {currentUser?.role === 'ADMIN' && status === 'SUBMITTED' ? (
        <div className="mt-4 rounded-xl border border-border bg-white p-4">
          <div className="text-sm font-bold text-ink">Admin Decision</div>
          <textarea
            value={decisionNote}
            onChange={(event) => setDecisionNote(event.target.value)}
            placeholder="Decision note"
            className="mt-3 min-h-[80px] w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => approveMutation.mutate()}
              className="rounded-xl bg-green px-4 py-2.5 text-sm font-bold text-white"
              disabled={approveMutation.isPending}
            >
              Approve Badge
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              className="rounded-xl bg-red px-4 py-2.5 text-sm font-bold text-white"
              disabled={rejectMutation.isPending}
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
