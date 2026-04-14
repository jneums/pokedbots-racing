# Custom Events with Bot Whitelist

**Goal:** Allow players to create custom racing events and whitelist specific bots to join.

**Date:** 2026-04-09

---

## Current State

### Already Designed (docs exist)
- `docs/USER_EVENTS_AND_SPONSORSHIP.md` — full spec for user-created events, sponsorship, and private/invite-only events
- `docs/EVENT_CATALOG.md` — catalog of event types
- `docs/EVENT_REGISTRATION_DESIGN_SUMMARY.md` — registration system design

### Already Implemented (data structures)
- `RaceCalendar.mo` has ALL the types needed:
  - `ScheduledEvent.creator: ?Principal` — null for platform events
  - `ScheduledEvent.creatorName: ?Text`
  - `ScheduledEvent.creationFee: Nat`
  - `ScheduledEvent.visibility: EventVisibility` — `#Public`, `#Private`, `#Restricted`
  - `ScheduledEvent.invitedParticipants: ?[Principal]`
  - `ScheduledEvent.sponsorships: [Sponsorship]`
  - `EventVisibility.#Restricted` includes `allowedBots: ?[Nat]` (token indices)
  - `EventVisibility.#Restricted` includes `allowedPlayers: ?[Principal]`
- `register_for_event` in `main.mo` already checks visibility/ELO/faction/class restrictions
- `RaceCalendar.registerForEvent` already checks `allowedBots` and `allowedPlayers`
- `scheduleRestrictedEvent()` exists but is only used internally (no user-facing API)

### NOT Implemented Yet
- No `createUserEvent` public endpoint in main.mo
- No `cancelUserEvent` public endpoint
- No `sponsorEvent` public endpoint
- No frontend UI for creating custom events
- No "Create Event" button or form in the website
- No user event limits tracking (max active events per user)

---

## Proposed Approach

### Phase 1: Backend — `createUserEvent` endpoint

Add a new public shared function in `main.mo` that:

1. Validates caller isn't over max active events (3)
2. Validates timing (24h-30d in advance)
3. Validates event config (name, description, entry fee, divisions, etc.)
4. Accepts visibility config:
   - `#Public` — anyone can join
   - `#Private` — only invited principals
   - `#Restricted` — with `allowedBots` (the whitelist feature) and other filters
5. Charges creation fee via ICRC-2 (non-refundable, e.g. 0.5 ICP)
6. Escrows prize contribution (refundable if cancelled)
7. Creates event via a new `RaceCalendar.scheduleUserEvent()` function
8. Returns event ID

**Key types to add to RaceCalendar.mo:**
```motoko
type UserEventConfig = {
  name: Text;
  description: Text;
  scheduledTime: Int;
  registrationWindowHours: Nat;  // how many hours before start to open registration
  entryFee: Nat;                 // ICP e8s per bot (base)
  maxRegistrationsPerClass: Nat;
  minEntries: Nat;
  prizeContribution: Nat;        // ICP e8s from creator
  divisions: [RaceClass];
  visibility: EventVisibility;   // #Public, #Private, or #Restricted with allowedBots
  invitedParticipants: ?[Principal];
  raceCreationMode: RaceCreationMode;
  creatorName: ?Text;
};
```

### Phase 2: Backend — `cancelUserEvent` endpoint

- Only creator can cancel
- Only before registration closes
- Refunds all registrants' entry fees
- Refunds creator's prize contribution (not creation fee)
- Marks event #Cancelled

### Phase 3: Backend — User event limits tracking

Add to RaceCalendar:
- Track active events per principal
- `getUserActiveEventCount(principal): Nat`
- Constants: MAX_USER_EVENTS = 3, CREATION_FEE = 50_000_000 (0.5 ICP), MIN_PRIZE_POOL = 100_000_000 (1 ICP)

### Phase 4: Frontend — Create Event UI

Add a "Create Event" page/dialog accessible from the schedule page:

**Form fields:**
- Event name (text, max 50 chars)
- Description (textarea, max 200 chars)
- Scheduled time (datetime picker)
- Visibility mode (select: Public / Private / Restricted)
- If Restricted → Bot whitelist (multi-select of token indices)
- If Restricted → ELO range (min/max sliders)
- If Restricted → Faction filter
- If Private → Invited players list (principal input)
- Entry fee (ICP amount input)
- Prize contribution (ICP amount input, min 1 ICP)
- Divisions (checkbox group: Scrap, Junker, Raider, Elite, SilentKlan)
- Max registrations per class (number input)
- Race mode: Automatic (terrain selection, distance range) or Manual (not for v1)

**Frontend files to create/modify:**
- NEW: `src/app/schedule/create/page.tsx` — Create Event page
- NEW: `src/components/event/CreateEventForm.tsx` — The form component
- MOD: `src/hooks/useRacing.ts` — Add `useCreateUserEvent` mutation hook
- MOD: `src/app/schedule/page.tsx` — Add "Create Event" button
- MOD: `packages/libs/ic-js/src/api/racing.api.ts` — Add API function
- MOD: `packages/libs/declarations/...` — Regenerate after backend changes

### Phase 5: Frontend — Event visibility display

On event detail pages, show:
- Creator name (if user event)
- "Created by [name]" badge
- Visibility indicator (Public / Private / Invite Only / Restricted)
- For restricted: show requirements (ELO range, faction, bot whitelist count)
- For private: show "You are invited" / "Invite only" status

---

## Files to Change

### Backend (Motoko)
1. `packages/canisters/pokedbots_racing/src/RaceCalendar.mo`
   - Add `UserEventConfig` type
   - Add `scheduleUserEvent()` function (similar to scheduleRestrictedEvent but with creator fields)
   - Add `getUserActiveEventCount()` function
   - Add `cancelUserEvent()` function
   - Add constants for limits

2. `packages/canisters/pokedbots_racing/src/main.mo`
   - Add `create_user_event(config: UserEventConfig): async Result<Nat, Text>` public endpoint
   - Add `cancel_user_event(eventId: Nat): async Result<(), Text>` public endpoint
   - Wire up ICRC-2 payment for creation fee + prize escrow

### Frontend (TypeScript/React)
3. `packages/libs/ic-js/src/api/racing.api.ts` — New API functions
4. `packages/libs/declarations/...` — Regenerated from .did
5. `packages/apps/website/src/hooks/useRacing.ts` — New hooks
6. `packages/apps/website/src/app/schedule/create/page.tsx` — NEW page
7. `packages/apps/website/src/components/event/CreateEventForm.tsx` — NEW form
8. `packages/apps/website/src/app/schedule/page.tsx` — Add create button
9. `packages/apps/website/src/app/schedule/[eventId]/EventDetailsClient.tsx` — Show creator/visibility info
10. `packages/apps/website/src/App.tsx` — Add route for /schedule/create

---

## Validation / Testing

1. **Backend unit test:** Create user event with allowedBots whitelist, verify registration rejects non-whitelisted bots
2. **Backend unit test:** Verify event creation limits (max 3 per user)
3. **Backend unit test:** Cancel user event, verify refunds
4. **Frontend smoke test:** Create event form renders, submit creates event
5. **E2E:** Create restricted event with bot whitelist → register whitelisted bot (success) → register non-whitelisted bot (fail)

---

## Risks & Tradeoffs

1. **Spam:** Mitigated by creation fee (0.5 ICP) and max 3 active events per user
2. **Prize pool manipulation:** Creator must escrow prize contribution up front, refundable only on cancellation before reg close
3. **Complexity creep:** Start with Automatic race creation mode only for v1 user events. Manual mode (multi-stage tournaments) can come later.
4. **Bot whitelist UX:** Players need a way to look up bot token indices. Consider adding a bot search/picker component.
5. **Candid changes:** Adding a new public endpoint requires regenerating declarations and updating ic-js. Build step must be run.

---

## Open Questions

1. Should user events appear on the same schedule page as platform events, or a separate tab?
   → Recommendation: Same page with a "User Event" / "Community" badge to distinguish
2. Should there be a minimum time before event for race creation (e.g., races generated 1h before start)?
   → The existing automatic race creation timer should handle this
3. Should creators be able to modify events after creation (e.g., extend registration, add more bots to whitelist)?
   → Defer to v2, keep v1 simple: create or cancel only
