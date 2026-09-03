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
}
type Contribution = {
  id: string
  guest_entry_id: string
  category: string
  item_name: string
  frosting_description: string | null
}

const PARTY_CODE = 'Frosty26'
const FOOD_GROUPS = ['Appetizer', 'Main', 'Side', 'Dessert', 'Other'] as const
const navItems: { id: Page; label: string }[] = [
  { id: 'jam', label: 'The Jam' },
  { id: 'rsvp', label: 'RSVP' },
  { id: 'coming', label: "Who's Coming" },
  { id: 'feast', label: 'The Frosted Feast' },
  { id: 'ideas', label: 'Frosty Ideas' },
]

export default function App() {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem('frosted-jam-unlocked') === 'yes')
  const [page, setPage] = useState<Page>('jam')
  const [code, setCode] = useState('')
  const [gateError, setGateError] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState('')
  const [rsvp, setRsvp] = useState<Rsvp>('coming')
  const [category, setCategory] = useState('')
  const [bringing, setBringing] = useState('')
  const [frosting, setFrosting] = useState('')

  const coming = useMemo(() => guests.filter(g => g.rsvp_status === 'coming').reduce((sum, g) => sum + g.party_size, 0), [guests])
  const maybe = useMemo(() => guests.filter(g => g.rsvp_status === 'maybe').reduce((sum, g) => sum + g.party_size, 0), [guests])
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests])

  async function loadParty() {
    setLoading(true)
    const [{ data: guestData, error: guestError }, { data: foodData, error: foodError }] = await Promise.all([
      supabase.from('guest_entries').select('id,guest_name,plus_one_name,party_size,is_host,rsvp_status').order('is_host', { ascending: false }).order('created_at'),
      supabase.from('contributions').select('id,guest_entry_id,category,item_name,frosting_description').order('created_at'),
    ])
    if (!guestError && guestData) setGuests(guestData as Guest[])
    if (!foodError && foodData) setContributions(foodData as Contribution[])
    setLoading(false)
  }

  useEffect(() => {
    if (unlocked) loadParty()
  }, [unlocked])

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

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaveError('')
    setLoading(true)

    const { data: guest, error } = await supabase.from('guest_entries').insert({
      guest_name: name.trim(),
      plus_one_name: plusOne.trim() || null,
      party_size: plusOne.trim() ? 2 : 1,
      is_host: false,
      rsvp_status: rsvp,
    }).select('id').single()

    if (error || !guest) {
      setSaveError('Your RSVP did not save. Please try again.')
      setLoading(false)
      return
    }

    if (rsvp !== 'declined' && category && bringing.trim()) {
      const { error: contributionError } = await supabase.from('contributions').insert({
        guest_entry_id: guest.id,
        category,
        item_name: bringing.trim(),
        frosting_description: frosting.trim() || null,
      })
      if (contributionError) setSaveError('Your RSVP saved, but the food item did not. You can tell Nancy or Rick what you are bringing.')
    }

    setName('')
    setPlusOne('')
    setRsvp('coming')
    setCategory('')
    setBringing('')
    setFrosting('')
    await loadParty()
    setPage('coming')
  }

  if (!unlocked) {
    return <main className="gate">
      <section className="invite-card">
        <p className="kicker">2nd Annual Karaoke Jam</p>
        <h1><span>BABY,</span><em>it's cold</em><strong>INSIDE</strong></h1>
        <div className="script">A Frosted Jam</div>
        <p className="date">Saturday · December 12, 2026 · 6:00 PM</p>
        <p className="tagline">Our hearts are warm, our friendships sparkle, and our voices are snow joke.</p>
        <p className="hosts">Hosted by Nancy & Rick</p>
        <form onSubmit={enter} className="code-form">
          <label>Party code</label>
          <div className="code-row"><input value={code} onChange={e => setCode(e.target.value)} placeholder="Frosty26" /><button>Come On In</button></div>
          {gateError && <p className="error">{gateError}</p>}
        </form>
      </section>
    </main>
  }

  return <main className="app-shell">
    <header className="site-header">
      <button className="brand" onClick={() => setPage('jam')}>
        <span>A Frosted Jam</span>
        <small>December 12 · 6:00 PM</small>
      </button>
      <div className="attendance"><b>{coming}</b> coming{maybe ? ` · ${maybe} maybe` : ''}</div>
    </header>

    <nav className="nav" aria-label="Party pages">
      {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => { setPage(item.id); if (item.id === 'coming' || item.id === 'feast') loadParty() }}>{item.label}</button>)}
    </nav>

    {page === 'jam' && <section className="jam-page">
      <div className="jam-hero">
        <div className="jam-glow jam-glow-one" />
        <div className="jam-glow jam-glow-two" />
        <p className="jam-kicker">Baby, It's Cold Inside · 2nd Annual Karaoke Jam</p>
        <h2><span>Turn Up the Music.</span><strong>Bring On the Frost.</strong></h2>
        <p className="jam-lead">Last year's karaoke was so much fun we're doing it again — frosted, playful and with a few surprises mixed in.</p>
        <div className="jam-actions"><button className="primary big" onClick={() => setPage('rsvp')}>I'm Coming</button><button className="secondary big" onClick={() => setPage('coming')}>See Who's In</button></div>
        <div className="jam-date"><b>Saturday, December 12</b><span>6:00 PM · Nancy & Rick's</span></div>
      </div>

      <section className="night-intro">
        <p className="kicker">Karaoke</p>
        <h3>Sing a Little. Sing a Lot. Don't Sing at All.</h3>
        <p>Grab the mic if you feel like it. Sing one song, sing all night, join a duet or simply cheer everyone else on. There is no performance requirement here.</p>
      </section>

      <section className="night-intro">
        <p className="kicker">Games + Prizes</p>
        <h3>A Few Games. A Few Prizes. Plenty of Laughs.</h3>
        <p>We'll mix in a few quick, easy games during the night. Join in when you want, sit one out when you don't, and there will be prizes worth claiming along the way.</p>
      </section>

      <section className="frost-callout">
        <div><p className="kicker">The Frosted Twist</p><h3>Bring something delicious. Frost it your way.</h3></div>
        <p>Give your food a frosty name, add an icy presentation, wear a little sparkle — or do none of it. Creativity is encouraged. Pressure is not.</p>
        <button className="secondary" onClick={() => setPage('ideas')}>See Frosty Ideas</button>
      </section>
    </section>}

    {page === 'rsvp' && <section className="content-page narrow">
      <div className="page-heading"><p className="kicker">RSVP</p><h2>Tell Us If You're Coming</h2><p>You can also tell everyone what you plan to bring. It does not need to be final.</p></div>
      <form onSubmit={save} className="rsvp-form">
        <div className="two"><label>Your name<input value={name} onChange={e => setName(e.target.value)} required /></label><label>Coming with someone?<input value={plusOne} onChange={e => setPlusOne(e.target.value)} placeholder="Optional" /></label></div>
        <fieldset><legend>Are you coming?</legend><div className="choices"><button type="button" className={rsvp === 'coming' ? 'active' : ''} onClick={() => setRsvp('coming')}>Absolutely</button><button type="button" className={rsvp === 'maybe' ? 'active' : ''} onClick={() => setRsvp('maybe')}>Maybe</button><button type="button" className={rsvp === 'declined' ? 'active' : ''} onClick={() => setRsvp('declined')}>Can't Make It</button></div></fieldset>
        {rsvp !== 'declined' && <div className="food-fields">
          <div className="two"><label>What kind of contribution?<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Choose if you know</option>{FOOD_GROUPS.map(group => <option key={group}>{group}</option>)}</select></label><label>What are you bringing?<input value={bringing} onChange={e => setBringing(e.target.value)} placeholder="It can change later" /></label></div>
          <label>How are you frosting it? <small>Optional</small><textarea value={frosting} onChange={e => setFrosting(e.target.value)} placeholder="A frosty name, presentation, decoration—or leave this blank." /></label>
        </div>}
        {saveError && <p className="error">{saveError}</p>}
        <button className="primary" disabled={loading}>{loading ? 'Saving…' : 'Save My RSVP'}</button>
      </form>
    </section>}

    {page === 'coming' && <section className="content-page">
      <div className="page-heading"><p className="kicker">The Guest List</p><h2>Who's Coming</h2><p>{coming} confirmed{maybe ? ` · ${maybe} maybe` : ''}</p></div>
      {loading ? <p className="loading">Loading the party…</p> : <div className="people-list">
        {guests.filter(g => g.rsvp_status !== 'declined').map(g => <article key={g.id} className={g.is_host ? 'person host-person' : 'person'}>
          <div className="avatar-mark">{g.is_host ? '❄' : g.guest_name.charAt(0).toUpperCase()}</div>
          <div><h3>{g.guest_name}{g.plus_one_name ? ` & ${g.plus_one_name}` : ''}</h3><p>{g.is_host ? 'Hosts' : g.rsvp_status === 'coming' ? 'Coming' : 'Maybe'}</p></div>
        </article>)}
      </div>}
    </section>}

    {page === 'feast' && <section className="content-page">
      <div className="page-heading"><p className="kicker">What Everyone's Bringing</p><h2>The Frosted Feast</h2><p>A quick look at the table so we can see the delicious plan taking shape.</p></div>
      {loading ? <p className="loading">Checking the feast…</p> : <div className="feast-list">
        {FOOD_GROUPS.map(group => {
          const items = contributions.filter(c => c.category === group)
          if (!items.length) return null
          return <section key={group} className="feast-group"><h3>{group}</h3>{items.map(item => {
            const person = guestById.get(item.guest_entry_id)
            return <article className="feast-row" key={item.id}><div><h4>{item.item_name}</h4>{item.frosting_description && <p>{item.frosting_description}</p>}</div><span>{person?.guest_name || 'Guest'}{person?.is_host ? ' · Hosts' : ''}</span></article>
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