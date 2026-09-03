import { FormEvent, useMemo, useState } from 'react'

type Rsvp = 'coming' | 'maybe' | 'declined'
type Guest = {
  id: string
  name: string
  plusOne?: string
  rsvp: Rsvp
  category?: string
  bringing?: string
  frosting?: string
}

const PARTY_CODE = 'Frosty26'

const starterGuests: Guest[] = [
  { id: '1', name: 'Nancy & Rick', rsvp: 'coming', category: 'Main', bringing: 'Chicken meatballs', frosting: 'Chicken Meatballs with Frosted Blueberry Kiss' },
  { id: '2', name: 'Sample Guest', rsvp: 'coming', category: 'Appetizer', bringing: 'Baked brie', frosting: 'Snowed-In Brie' },
]

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [guests, setGuests] = useState<Guest[]>(starterGuests)
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState('')
  const [rsvp, setRsvp] = useState<Rsvp>('coming')
  const [category, setCategory] = useState('')
  const [bringing, setBringing] = useState('')
  const [frosting, setFrosting] = useState('')

  const coming = useMemo(() => guests.filter(g => g.rsvp === 'coming').length, [guests])
  const maybe = useMemo(() => guests.filter(g => g.rsvp === 'maybe').length, [guests])

  function enter(e: FormEvent) {
    e.preventDefault()
    if (code.trim().toLowerCase() !== PARTY_CODE.toLowerCase()) {
      setError('That code is still frozen. Try again.')
      return
    }
    setUnlocked(true)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setGuests(current => [{
      id: crypto.randomUUID(),
      name: name.trim(),
      plusOne: plusOne.trim() || undefined,
      rsvp,
      category: category || undefined,
      bringing: bringing.trim() || undefined,
      frosting: frosting.trim() || undefined,
    }, ...current])
    setName('')
    setPlusOne('')
    setRsvp('coming')
    setCategory('')
    setBringing('')
    setFrosting('')
  }

  if (!unlocked) {
    return <main className="gate">
      <section className="invite-card">
        <div className="eyebrow">2ND ANNUAL KARAOKE JAM</div>
        <h1><span>BABY,</span><em>it's cold</em><strong>INSIDE</strong></h1>
        <div className="script">A Frosted Jam</div>
        <p className="date">Saturday · December 12, 2026 · 6:00 PM</p>
        <p className="tagline">Our hearts are warm, our friendships sparkle, and our voices are snow joke.</p>
        <form onSubmit={enter} className="code-form">
          <label>Enter the party code</label>
          <div className="code-row">
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Frosty26" />
            <button>Enter the Jam</button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  }

  return <main className="app">
    <header className="hero">
      <div>
        <div className="eyebrow">BABY, IT'S COLD INSIDE</div>
        <h2>A Frosted Jam</h2>
        <p>Saturday, December 12 · 6:00 PM</p>
      </div>
      <div className="count"><b>{coming}</b><span>coming</span></div>
    </header>

    <section className="welcome">
      <h3>Bring your own kind of frosty.</h3>
      <p>Frost the food, the name, the presentation, yourself — or none of the above. Creativity is encouraged, never required. Just bring whatever feels fun.</p>
    </section>

    <section className="panel">
      <div className="section-title"><span>RSVP + FEAST</span><h3>Tell us you're coming</h3></div>
      <form onSubmit={save} className="form">
        <div className="two">
          <label>Your name<input value={name} onChange={e => setName(e.target.value)} required /></label>
          <label>Coming with someone?<input value={plusOne} onChange={e => setPlusOne(e.target.value)} placeholder="Optional" /></label>
        </div>

        <div>
          <label>Are you coming?</label>
          <div className="choices">
            <button type="button" className={rsvp === 'coming' ? 'active' : ''} onClick={() => setRsvp('coming')}>Absolutely</button>
            <button type="button" className={rsvp === 'maybe' ? 'active' : ''} onClick={() => setRsvp('maybe')}>Maybe</button>
            <button type="button" className={rsvp === 'declined' ? 'active' : ''} onClick={() => setRsvp('declined')}>Can't make it</button>
          </div>
        </div>

        {rsvp !== 'declined' && <>
          <div className="two">
            <label>What kind of contribution?
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Choose if you know</option>
                <option>Appetizer</option><option>Main</option><option>Side</option><option>Dessert</option><option>Drink</option><option>Snack</option><option>Other</option>
              </select>
            </label>
            <label>What are you bringing?<input value={bringing} onChange={e => setBringing(e.target.value)} placeholder="It can change later" /></label>
          </div>
          <label>How are you frosting it? <small>Optional</small>
            <textarea value={frosting} onChange={e => setFrosting(e.target.value)} placeholder="A frosty name, presentation, decoration, outfit idea... or leave this blank." />
          </label>
        </>}
        <button className="primary">Save My Spot</button>
      </form>
    </section>

    <section className="panel">
      <div className="section-heading">
        <div className="section-title"><span>WHO'S GETTING FROSTED?</span><h3>The guest list</h3></div>
        <p>{coming} coming · {maybe} maybe</p>
      </div>
      <div className="guest-grid">
        {guests.filter(g => g.rsvp !== 'declined').map(g => <article className="guest" key={g.id}>
          <div className="guest-head"><h4>{g.name}{g.plusOne ? ` & ${g.plusOne}` : ''}</h4><b>{g.rsvp === 'coming' ? 'Coming' : 'Maybe'}</b></div>
          {g.category && <span className="category">{g.category}</span>}
          {g.bringing && <p className="bringing">{g.bringing}</p>}
          {g.frosting && <p className="frosting"><strong>Frosty spin:</strong> {g.frosting}</p>}
        </article>)}
      </div>
    </section>

    <footer>GOOD FRIENDS ❄ GREAT FOOD ❄ FESTIVE DRINKS ❄ EPIC KARAOKE</footer>
  </main>
}
