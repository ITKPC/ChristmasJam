import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

type Rsvp = 'coming' | 'maybe' | 'declined'
type Page = 'jam' | 'rsvp' | 'coming' | 'feast' | 'ideas'
type Guest = {
  id: string
  guest_name: string
  plus_one_name: string | null
  party_size: number
  is_host: boolean
  rsvp_status: Rsvp
  food_category: string | null
  bringing_item: string | null
  frosting_description: string | null
}
type Contribution = {
  id: string
  guest_entry_id: string
  category: string
  item_name: string
  frosting_description: string | null
}
type SavedSummary = {
  guestName: string
  plusOneName: string
  partySize: number
  rsvpStatus: Rsvp
  category: string
  itemName: string
  frostedName: string
}

const PARTY_CODE = 'Frosty26'
const RSVP_ID_KEY = 'frosted-jam-rsvp-id'
const RSVP_TOKEN_KEY = 'frosted-jam-rsvp-edit-token'
const FOOD_GROUPS = ['Appetizer', 'Main', 'Side', 'Dessert', 'Other'] as const
const FOOD_LABELS: Record<(typeof FOOD_GROUPS)[number], string> = {
  Appetizer: 'Appetizers',
  Main: 'Mains',
  Side: 'Sides',
  Dessert: 'Desserts',
  Other: 'Other',
}
const navItems: { id: Page; label: string }[] = [
  { id: 'jam', label: 'The Jam' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'coming', label: "Who's Coming" },
  { id: 'feast', label: 'The Frosted Feast' },
  { id: 'ideas', label: 'Frosty Ideas' },
]

function isFoodGroup(value: string): value is (typeof FOOD_GROUPS)[number] {
  return FOOD_GROUPS.includes(value as (typeof FOOD_GROUPS)[number])
}

function createEditToken() {
  return crypto.randomUUID()
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('frosted-jam-unlocked') === 'yes')
  const [page, setPage] = useState<Page>('jam')
  const [code, setCode] = useState('')
  const [gateError, setGateError] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [partyLoading, setPartyLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState('')
  const [rsvp, setRsvp] = useState<Rsvp>('coming')
  const [category, setCategory] = useState('')
  const [bringing, setBringing] = useState('')
  const [frostedName, setFrostedName] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null)
  const [managedGuest, setManagedGuest] = useState<Guest | null>(null)
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const coming = useMemo(() => guests.filter(g => g.rsvp_status === 'coming').reduce((sum, g) => sum + g.party_size, 0), [guests])
  const maybe = useMemo(() => guests.filter(g => g.rsvp_status === 'maybe').reduce((sum, g) => sum + g.party_size, 0), [guests])
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests])

  const feastContributions = useMemo(() => {
    const merged = [...contributions]
    const guestsWithContribution = new Set(contributions.map(c => c.guest_entry_id))

    for (const guest of guests) {
      if (guestsWithContribution.has(guest.id)) continue
      if (!guest.bringing_item || !guest.food_category || !isFoodGroup(guest.food_category)) continue
      merged.push({
        id: `guest-backup-${guest.id}`,
        guest_entry_id: guest.id,
        category: guest.food_category,
        item_name: guest.bringing_item,
        frosting_description: guest.frosting_description,
      })
    }

    return merged
  }, [contributions, guests])

  async function loadParty() {
    setPartyLoading(true)
    setLoadError('')
    const [{ data: guestData, error: guestError }, { data: foodData, error: foodError }] = await Promise.all([
      supabase.from('guest_entries').select('id,guest_name,plus_one_name,party_size,is_host,rsvp_status,food_category,bringing_item,frosting_description').order('is_host', { ascending: false }).order('created_at'),
      supabase.from('contributions').select('id,guest_entry_id,category,item_name,frosting_description').order('created_at'),
    ])

    if (guestData) setGuests(guestData as Guest[])
    if (foodData) setContributions(foodData as Contribution[])
    if (guestError || foodError) setLoadError('We could not refresh all of the party information. Please try again in a moment.')
    setPartyLoading(false)
  }

  async function loadMyRsvp() {
    const guestId = localStorage.getItem(RSVP_ID_KEY)
    const editToken = localStorage.getItem(RSVP_TOKEN_KEY)
    if (!guestId || !editToken) {
      setManagedGuest(null)
      return
    }

    const { data, error } = await supabase.rpc('get_my_rsvp', {
      p_guest_id: guestId,
      p_edit_token: editToken,
    })

    if (error || !data?.length) {
      localStorage.removeItem(RSVP_ID_KEY)
      localStorage.removeItem(RSVP_TOKEN_KEY)
      setManagedGuest(null)
      return
    }

    setManagedGuest(data[0] as Guest)
  }

  useEffect(() => {
    if (unlocked) {
      loadParty()
      loadMyRsvp()
    }
  }, [unlocked])

  function go(next: Page) {
    setPage(next)
    setSavedSummary(null)
    setReviewing(false)
    setCancelConfirm(false)
    if (next === 'coming' || next === 'feast') loadParty()
    if (next === 'rsvp') loadMyRsvp()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function enter(e: FormEvent) {
    e.preventDefault()
    if (code.trim().toLowerCase() !== PARTY_CODE.toLowerCase()) {
      setGateError('That code is still frozen. Try again.')
      return
    }
    localStorage.setItem('frosted-jam-unlocked', 'yes')
    setGateError('')
    setUnlocked(true)
  }

  function validateRsvp() {
    const cleanName = name.trim()
    const cleanPlusOne = plusOne.trim()
    const cleanFood = bringing.trim()
    const cleanFrostedName = frostedName.trim()

    if (!cleanName) return 'Please add your name.'
    if (cleanName.length > 80) return 'Please keep your name to 80 characters or fewer.'
    if (cleanPlusOne.length > 80) return 'Please keep your guest name to 80 characters or fewer.'

    if (rsvp !== 'declined') {
      if (category && !isFoodGroup(category)) return 'Please choose a valid food category.'
      if (cleanFood && !category) return "You told us what you're bringing - just choose which food category it belongs in."
      if (category && !cleanFood) return "You've chosen a food category - now tell us what you're bringing, or clear the category if you're deciding later."
      if (cleanFood.length > 200) return 'Please keep the food name to 200 characters or fewer.'
      if (cleanFrostedName && !cleanFood) return 'Add the real food name first, then give it a Frosted Jam name if you want.'
      if (cleanFrostedName.length > 120) return 'Please keep the Frosted Jam name to 120 characters or fewer.'
    }

    return ''
  }

  function reviewRsvp(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const error = validateRsvp()
    if (error) {
      setSaveError(error)
      return
    }
    setSaveError('')
    setReviewing(true)
    setSavedSummary(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function editRsvpForm() {
    if (saving) return
    setReviewing(false)
    setSaveError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startEditingManagedRsvp() {
    if (!managedGuest) return
    setName(managedGuest.guest_name)
    setPlusOne(managedGuest.plus_one_name || '')
    setRsvp(managedGuest.rsvp_status)
    setCategory(managedGuest.food_category && isFoodGroup(managedGuest.food_category) ? managedGuest.food_category : '')
    setBringing(managedGuest.bringing_item || '')
    setFrostedName(managedGuest.frosting_description || '')
    setEditingGuestId(managedGuest.id)
    setSavedSummary(null)
    setReviewing(false)
    setCancelConfirm(false)
    setSaveError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveConfirmedRsvp() {
    if (saving) return
    const validationError = validateRsvp()
    if (validationError) {
      setSaveError(validationError)
      setReviewing(false)
      return
    }

    const cleanName = name.trim()
    const cleanPlusOne = plusOne.trim()
    const cleanFood = rsvp === 'declined' ? '' : bringing.trim()
    const cleanFrostedName = rsvp === 'declined' ? '' : frostedName.trim()
    const cleanCategory = rsvp === 'declined' ? '' : category
    const partySize = cleanPlusOne ? 2 : 1
    const existingToken = localStorage.getItem(RSVP_TOKEN_KEY)
    const editToken = editingGuestId ? existingToken : createEditToken()

    if (editingGuestId && !editToken) {
      setSaveError('This browser no longer has the private edit key for this RSVP. Please tell Nancy or Rick what needs changing.')
      setReviewing(false)
      return
    }

    setSaveError('')
    setSaving(true)

    const { data, error } = await supabase.rpc('save_guest_rsvp', {
      p_guest_id: editingGuestId,
      p_edit_token: editToken,
      p_guest_name: cleanName,
      p_plus_one_name: cleanPlusOne || null,
      p_rsvp_status: rsvp,
      p_category: cleanCategory || null,
      p_item_name: cleanFood || null,
      p_frosted_name: cleanFrostedName || null,
    })

    if (error || !data?.length) {
      setSaveError('Nothing was changed. We could not save your RSVP, so please try again.')
      setSaving(false)
      return
    }

    const savedGuest = data[0] as Guest
    localStorage.setItem(RSVP_ID_KEY, savedGuest.id)
    localStorage.setItem(RSVP_TOKEN_KEY, editToken as string)
    setManagedGuest(savedGuest)
    setEditingGuestId(null)
    setReviewing(false)
    setSavedSummary({
      guestName: cleanName,
      plusOneName: cleanPlusOne,
      partySize,
      rsvpStatus: rsvp,
      category: cleanCategory,
      itemName: cleanFood,
      frostedName: cleanFrostedName,
    })
    setSaving(false)

    setName('')
    setPlusOne('')
    setRsvp('coming')
    setCategory('')
    setBringing('')
    setFrostedName('')
    await loadParty()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function markCannotCome() {
    if (!managedGuest || saving) return
    const editToken = localStorage.getItem(RSVP_TOKEN_KEY)
    if (!editToken) {
      setSaveError('This browser no longer has the private edit key for this RSVP. Please tell Nancy or Rick.')
      return
    }

    setSaving(true)
    setSaveError('')
    const { data, error } = await supabase.rpc('save_guest_rsvp', {
      p_guest_id: managedGuest.id,
      p_edit_token: editToken,
      p_guest_name: managedGuest.guest_name,
      p_plus_one_name: managedGuest.plus_one_name,
      p_rsvp_status: 'declined',
      p_category: null,
      p_item_name: null,
      p_frosted_name: null,
    })

    if (error || !data?.length) {
      setSaveError('Nothing was changed. We could not update your RSVP, so please try again.')
      setSaving(false)
      return
    }

    const savedGuest = data[0] as Guest
    setManagedGuest(savedGuest)
    setCancelConfirm(false)
    setSaving(false)
    await loadParty()
  }

  if (!unlocked) {
    return <main className="gate">
      <section className="invite-card">
        <p className="kicker">Karaoke Jam</p>
        <h1><span>BABY,</span><em>it's cold</em><strong>INSIDE</strong></h1>
        <div className="script">A Frosted Jam</div>
        <p className="date">Saturday · December 12, 2026 · 6:00 PM</p>
        <p className="tagline">Our hearts are warm, our friendships sparkle, and our voices are snow joke.</p>
        <p className="hosts">Hosted by Nancy & Rick</p>
        <form onSubmit={enter} className="code-form">
          <label>Party code</label>
          <div className="code-row"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Party code" /><button>Come On In</button></div>
          {gateError && <p className="error" role="alert">{gateError}</p>}
        </form>
      </section>
    </main>
  }

  return <main className="app-shell">
    <header className="site-header">
      <button className="brand" onClick={() => go('jam')}>
        <span>A Frosted Jam</span>
        <small>December 12, 2026 · 6:00 PM</small>
      </button>
      <div className="attendance"><b>{coming}</b> coming{maybe ? ` · ${maybe} maybe` : ''}</div>
    </header>

    <nav className="nav" aria-label="Party pages">
      {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => go(item.id)}>{item.label}</button>)}
    </nav>

    {page === 'jam' && <section className="jam-page">
      <section className="jam-hero">
        <div className="hero-copy">
          <p className="jam-kicker">A Frosted Jam</p>
          <h2><span>Baby, It's</span><span>Cold Inside</span></h2>
          <p className="hero-script">A Frosted Jam</p>
          <p className="jam-lead">Last year's karaoke was so much fun we're doing it again — music, laughter, a little friendly chaos and plenty of frosty fun.</p>
          <div className="jam-actions"><button className="primary big" onClick={() => go('rsvp')}>RSVP</button><button className="secondary big" onClick={() => go('coming')}>Who's Coming</button></div>
          <div className="jam-date"><b>Saturday, December 12, 2026</b><span>6:00 PM · Nancy & Rick's</span></div>
        </div>
        <div className="jammy-wrap" aria-label="Jammy, the Frosted Jam mascot">
          <img className="jammy-art" src="/Jammy.png" alt="Jammy holding a karaoke microphone" />
          <p className="jammy-note">See you at The Jam!<span>— Jammy</span></p>
        </div>
      </section>

      <section className="jam-highlights">
        <article>
          <p className="kicker">Karaoke</p>
          <h3>Sing a Little.<br />Sing a Lot.<br />Don't Sing at All.</h3>
          <p>Karaoke is for everyone — whether you're in the spotlight or happily enjoying the show.</p>
        </article>
        <div className="highlight-divider" aria-hidden="true">❄</div>
        <article>
          <p className="kicker">Games + Prizes</p>
          <h3>A Few Games.<br />A Few Prizes.<br />Plenty of Laughs.</h3>
          <p>Jump in, cheer on, or sit one out. The games are there to add a little fun, not take over the night.</p>
        </article>
      </section>

      <section className="frost-callout">
        <div><p className="kicker">The Frosted Twist</p><h3>Bring something delicious. Frost it your way.</h3></div>
        <p>Give your food a frosty name, add an icy presentation, wear a little sparkle — or do none of it. Creativity is encouraged. Pressure is not.</p>
        <button className="secondary" onClick={() => go('ideas')}>See Frosty Ideas</button>
      </section>
    </section>}

    {page === 'rsvp' && <section className="content-page narrow">
      {savedSummary ? <>
        <div className="page-heading"><p className="kicker">RSVP Saved</p><h2>{savedSummary.rsvpStatus === 'declined' ? "We've Updated It" : "You're In"}</h2><p>Here is exactly what we saved.</p></div>
        <section className="rsvp-success" aria-live="polite">
          <div className="review-line"><span>Guest{savedSummary.partySize > 1 ? 's' : ''}</span><b>{savedSummary.guestName}{savedSummary.plusOneName ? ` & ${savedSummary.plusOneName}` : ''}</b></div>
          <div className="review-line"><span>RSVP</span><b>{savedSummary.rsvpStatus === 'coming' ? 'Coming' : savedSummary.rsvpStatus === 'maybe' ? 'Maybe' : "Can't Make It"}</b></div>
          {savedSummary.itemName && <>
            <div className="review-line"><span>Category</span><b>{savedSummary.category}</b></div>
            <div className="review-line"><span>You're bringing</span><b>{savedSummary.itemName}</b></div>
            {savedSummary.frostedName && <div className="review-line frosted"><span>Frosted Jam name</span><b>{savedSummary.frostedName}</b></div>}
          </>}
          {!savedSummary.itemName && savedSummary.rsvpStatus !== 'declined' && <p className="review-note">No food choice yet - that's completely fine.</p>}
          <div className="review-actions"><button className="primary" type="button" onClick={() => { setSavedSummary(null); loadMyRsvp() }}>Manage My RSVP</button><button className="secondary" type="button" onClick={() => go('coming')}>See Who's Coming</button></div>
        </section>
      </> : reviewing ? <>
        <div className="page-heading"><p className="kicker">One Quick Check</p><h2>Before We Save It...</h2><p>Make sure this is exactly what you meant to send us.</p></div>
        <section className="rsvp-review">
          <div className="review-line"><span>Guest{plusOne.trim() ? 's' : ''}</span><b>{name.trim()}{plusOne.trim() ? ` & ${plusOne.trim()}` : ''}</b></div>
          <div className="review-line"><span>RSVP</span><b>{rsvp === 'coming' ? 'Coming' : rsvp === 'maybe' ? 'Maybe' : "Can't Make It"}</b></div>
          {rsvp !== 'declined' && bringing.trim() && <>
            <div className="review-line"><span>Category</span><b>{category}</b></div>
            <div className="review-line"><span>You're bringing</span><b>{bringing.trim()}</b></div>
            {frostedName.trim() && <div className="review-line frosted"><span>Frosted Jam name</span><b>{frostedName.trim()}</b></div>}
            {!frostedName.trim() && <div className="frost-name-nudge">
              <b>Want to frost up the name?</b>
              <p>Totally optional. Keep the real food name above, and add a fun Frosted Jam name just for the spirit of the party.</p>
              <p className="nudge-words">Try words like Snowdrift · Blizzard · Frostbite · Arctic · Polar · Icicle</p>
              <button type="button" className="secondary" onClick={editRsvpForm}>Add a Frosted Jam Name</button>
            </div>}
          </>}
          {rsvp !== 'declined' && !bringing.trim() && <p className="review-note">No food choice yet - that's completely fine. You can decide later.</p>}
          {saveError && <p className="error" role="alert">{saveError}</p>}
          <div className="review-actions"><button type="button" className="secondary" onClick={editRsvpForm} disabled={saving}>Make a Change</button><button type="button" className="primary" onClick={saveConfirmedRsvp} disabled={saving}>{saving ? 'Saving...' : editingGuestId ? 'Looks Good - Update My RSVP' : 'Looks Good - Save My RSVP'}</button></div>
        </section>
      </> : managedGuest && !editingGuestId ? <>
        <div className="page-heading"><p className="kicker">Your RSVP</p><h2>Welcome Back</h2><p>You can change your RSVP, your guest or what you're bringing at any time from this browser.</p></div>
        <section className="rsvp-success manage-rsvp">
          <div className="review-line"><span>Guest{managedGuest.party_size > 1 ? 's' : ''}</span><b>{managedGuest.guest_name}{managedGuest.plus_one_name ? ` & ${managedGuest.plus_one_name}` : ''}</b></div>
          <div className="review-line"><span>RSVP</span><b>{managedGuest.rsvp_status === 'coming' ? 'Coming' : managedGuest.rsvp_status === 'maybe' ? 'Maybe' : "Can't Make It"}</b></div>
          {managedGuest.bringing_item && <>
            <div className="review-line"><span>Category</span><b>{managedGuest.food_category}</b></div>
            <div className="review-line"><span>You're bringing</span><b>{managedGuest.bringing_item}</b></div>
            {managedGuest.frosting_description && <div className="review-line frosted"><span>Frosted Jam name</span><b>{managedGuest.frosting_description}</b></div>}
          </>}
          {saveError && <p className="error" role="alert">{saveError}</p>}
          {cancelConfirm ? <div className="cancel-confirm">
            <b>Change your RSVP to Can't Make It?</b>
            <p>This will also remove your food from the Frosted Feast. You can change your RSVP again later from this browser.</p>
            <div className="review-actions"><button type="button" className="secondary" onClick={() => setCancelConfirm(false)} disabled={saving}>Keep My RSVP</button><button type="button" className="danger-button" onClick={markCannotCome} disabled={saving}>{saving ? 'Updating...' : "Yes - I Can't Make It"}</button></div>
          </div> : <div className="review-actions">
            <button type="button" className="primary" onClick={startEditingManagedRsvp}>Edit My RSVP</button>
            {managedGuest.rsvp_status !== 'declined' && <button type="button" className="secondary" onClick={() => setCancelConfirm(true)}>I Can't Come Anymore</button>}
          </div>}
        </section>
      </> : <>
        <div className="page-heading"><p className="kicker">RSVP</p><h2>{editingGuestId ? 'Change Your RSVP' : "Tell Us If You're Coming"}</h2><p>{editingGuestId ? 'Update anything that has changed, then review it before saving.' : 'You can also tell everyone what you plan to bring. It does not need to be final.'}</p></div>
        <form onSubmit={reviewRsvp} className="rsvp-form">
          <div className="two"><label>Your name<input value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoComplete="name" /></label><label>Coming with someone?<input value={plusOne} onChange={e => setPlusOne(e.target.value)} placeholder="Optional" maxLength={80} /></label></div>
          <fieldset><legend>Are you coming?</legend><div className="choices"><button type="button" className={rsvp === 'coming' ? 'active' : ''} onClick={() => setRsvp('coming')}>Absolutely</button><button type="button" className={rsvp === 'maybe' ? 'active' : ''} onClick={() => setRsvp('maybe')}>Maybe</button><button type="button" className={rsvp === 'declined' ? 'active' : ''} onClick={() => setRsvp('declined')}>Can't Make It</button></div></fieldset>
          {rsvp !== 'declined' && <div className="food-fields">
            <div className="two"><label>What kind of contribution?<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Choose if you know</option>{FOOD_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label><label>What are you actually bringing?<input value={bringing} onChange={e => setBringing(e.target.value)} placeholder="e.g. Butter Tarts" maxLength={200} /></label></div>
            <label>Frosted Jam name <small>Optional</small><input value={frostedName} onChange={e => setFrostedName(e.target.value)} placeholder="e.g. Blizzard Butter Tarts" maxLength={120} /><span className="field-help">Keep the real food name above. This is just the fun party name.</span></label>
          </div>}
          {saveError && <p className="error" role="alert">{saveError}</p>}
          <button className="primary" disabled={saving}>{saving ? 'Please wait...' : 'Review My RSVP'}</button>
          {!editingGuestId && <p className="legacy-note">Already RSVP'd before the edit feature was added and this browser doesn't recognize it? Nancy or Rick can change that earlier RSVP for you.</p>}
        </form>
      </>}
    </section>}

    {page === 'coming' && <section className="content-page">
      <div className="page-heading"><p className="kicker">The Guest List</p><h2>Who's Coming</h2><p>{coming} confirmed{maybe ? ` · ${maybe} maybe` : ''}</p></div>
      {loadError && <p className="error" role="alert">{loadError}</p>}
      {partyLoading ? <p className="loading">Loading the party…</p> : <div className="people-list">
        {guests.filter(g => g.rsvp_status !== 'declined').map(g => <article key={g.id} className={g.is_host ? 'person host-person' : 'person'}>
          <div className="avatar-mark">{g.is_host ? '❄' : g.guest_name.charAt(0).toUpperCase()}</div>
          <div><h3>{g.guest_name}{g.plus_one_name ? ` & ${g.plus_one_name}` : ''}</h3><p>{g.is_host ? 'Hosts' : g.rsvp_status === 'coming' ? 'Coming' : 'Maybe'}</p></div>
        </article>)}
      </div>}
    </section>}

    {page === 'feast' && <section className="content-page">
      <div className="page-heading"><p className="kicker">What Everyone's Bringing</p><h2>The Frosted Feast</h2><p>A quick look at the table so we can see the delicious plan taking shape.</p></div>
      {loadError && <p className="error" role="alert">{loadError}</p>}
      {partyLoading ? <p className="loading">Checking the feast…</p> : <div className="feast-list">
        {FOOD_GROUPS.map(group => {
          const items = feastContributions.filter(c => c.category === group)
          if (!items.length) return null
          return <section key={group} className="feast-group"><h3>{FOOD_LABELS[group]}</h3>{items.map(item => {
            const person = guestById.get(item.guest_entry_id)
            return <article className="feast-row" key={item.id}><div>{item.frosting_description ? <><h4>{item.frosting_description}</h4><p className="real-food-name">{item.item_name}</p></> : <h4>{item.item_name}</h4>}</div><span>{person?.guest_name || 'Guest'}{person?.is_host ? ' · Hosts' : ''}</span></article>
          })}</section>
        })}
      </div>}
    </section>}

    {page === 'ideas' && <section className="content-page">
      <div className="page-heading"><p className="kicker">Need Inspiration?</p><h2>Frosty Ideas</h2><p>Borrow the mood, not the menu. These are just sparks to get you thinking.</p></div>
      <div className="idea-grid">
        <article><div className="idea-symbol">❄</div><h3>Frost Your Food</h3><p>Use snowy toppings, icy blue accents, sparkling presentation, chilled serving pieces, or a wintery garnish.</p></article>
        <article><div className="idea-symbol">✦</div><h3>Give It a Frosty Name</h3><div className="name-list"><span>Frostbite Wings</span><span>Snowdrift Dip</span><span>Black Ice Brownies</span><span>Northern Lights Punch</span><span>Snowbank Cheesecake</span><span>Arctic Garden</span></div></article>
        <article><div className="idea-symbol">✧</div><h3>Frost Yourself—If You Want</h3><p>A little silver, icy blue, snowflake jewellery, a wild winter hat, full frosty drama—or absolutely nothing extra.</p></article>
      </div>
      <div className="word-bank"><b>Try words like</b><span>Snow · Frost · Ice · Blizzard · Polar · Frozen · Snowdrift · Cold Snap · Icicle · Arctic · Winter · North Pole</span></div>
    </section>}
  </main>
}
