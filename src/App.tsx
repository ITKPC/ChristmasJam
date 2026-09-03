import { FormEvent, useMemo, useState } from 'react'

type Rsvp = 'coming' | 'maybe' | 'declined'
type Page = 'jam' | 'rsvp' | 'coming' | 'ideas'
type Guest = {
  id: string
  name: string
  plusOne?: string
  partySize: number
  host?: boolean
  rsvp: Rsvp
  category?: string
  bringing?: string
  frosting?: string
}

const PARTY_CODE = 'Frosty26'

const starterGuests: Guest[] = [
  {
    id: 'hosts',
    name: 'Nancy & Rick',
    partySize: 2,
    host: true,
    rsvp: 'coming',
    category: 'Hosts',
    bringing: 'Chicken Meatballs with Frosted Blueberry Kiss · Frost-Your-Own Potato Station · Blue Blizzard Crostinis',
  },
]

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'jam', label: 'The Jam', icon: '❄' },
  { id: 'rsvp', label: 'RSVP', icon: '✦' },
  { id: 'coming', label: "Who's Coming", icon: '♬' },
  { id: 'ideas', label: 'Frosty Ideas', icon: '✧' },
]

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [page, setPage] = useState<Page>('jam')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [guests, setGuests] = useState<Guest[]>(starterGuests)
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState('')
  const [rsvp, setRsvp] = useState<Rsvp>('coming')
  const [category, setCategory] = useState('')
  const [bringing, setBringing] = useState('')
  const [frosting, setFrosting] = useState('')

  const coming = useMemo(
    () => guests.filter(g => g.rsvp === 'coming').reduce((total, g) => total + g.partySize, 0),
    [guests],
  )
  const maybe = useMemo(
    () => guests.filter(g => g.rsvp === 'maybe').reduce((total, g) => total + g.partySize, 0),
    [guests],
  )

  function enter(e: FormEvent) {
    e.preventDefault()
    if (code.trim().toLowerCase() !== PARTY_CODE.toLowerCase()) {
      setError('That code is still frozen. Try again.')
      return
    }
    setError('')
    setUnlocked(true)
  }

  function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setGuests(current => [{
      id: crypto.randomUUID(),
      name: name.trim(),
      plusOne: plusOne.trim() || undefined,
      partySize: plusOne.trim() ? 2 : 1,
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
    setPage('coming')
  }

  if (!unlocked) {
    return <main className="gate">
      <section className="invite-card">
        <div className="eyebrow">2nd Annual Karaoke Jam</div>
        <h1><span>BABY,</span><em>it's cold</em><strong>INSIDE</strong></h1>
        <div className="script">A Frosted Jam</div>
        <p className="date">Saturday · December 12, 2026 · 6:00 PM</p>
        <p className="tagline">Our hearts are warm, our friendships sparkle, and our voices are snow joke.</p>
        <p className="hosts">Hosted by Nancy & Rick</p>
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
        <div className="eyebrow">Baby, It's Cold Inside</div>
        <h2>A Frosted Jam</h2>
        <p>Saturday, December 12 · 6:00 PM · Hosted by Nancy & Rick</p>
      </div>
      <div className="count"><b>{coming}</b><span>coming</span></div>
    </header>

    <nav className="nav" aria-label="Party pages">
      {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}>
        <span>{item.icon}</span>{item.label}
      </button>)}
    </nav>

    {page === 'jam' && <>
      <section className="welcome">
        <div className="big-icon">❄</div>
        <h3>Bring Your Own Kind of Frosty</h3>
        <p>Frost the food, the name, the presentation, yourself — or none of the above. Creativity is encouraged, never required. Just bring whatever feels fun.</p>
      </section>

      <section className="panel host-menu">
        <div className="section-title"><span>From Your Hosts</span><h3>What Nancy & Rick Are Serving</h3></div>
        <div className="menu-grid">
          <article><div className="food-icon">✦</div><h4>Chicken Meatballs with Frosted Blueberry Kiss</h4><p>Savoury chicken meatballs with their frosty blueberry finish.</p></article>
          <article><div className="food-icon">❄</div><h4>Frost-Your-Own Potato Station</h4><p>Warm baked potatoes ready for everyone to frost with their favourite toppings.</p></article>
          <article><div className="food-icon">✧</div><h4>Blue Blizzard Crostinis</h4><p>Crisp crostinis with a frosty blue cheese topping.</p></article>
        </div>
      </section>

      <section className="action-grid">
        <button onClick={() => setPage('rsvp')}><span>✦</span><b>RSVP</b><small>Tell us if you're coming and what you might bring.</small></button>
        <button onClick={() => setPage('coming')}><span>♬</span><b>Who's Coming</b><small>See which frosty friends are joining the Jam.</small></button>
        <button onClick={() => setPage('ideas')}><span>❄</span><b>Frosty Ideas</b><small>Need inspiration? Food, names, presentation and more.</small></button>
      </section>
    </>}

    {page === 'rsvp' && <section className="panel">
      <div className="section-title"><span>RSVP + Feast</span><h3>Tell Us You're Coming</h3></div>
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
            <button type="button" className={rsvp === 'declined' ? 'active' : ''} onClick={() => setRsvp('declined')}>Can't Make It</button>
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
    </section>}

    {page === 'coming' && <section className="panel">
      <div className="section-heading">
        <div className="section-title"><span>Who's Getting Frosted?</span><h3>Who's Coming</h3></div>
        <p>{coming} coming · {maybe} maybe</p>
      </div>
      <div className="guest-grid">
        {guests.filter(g => g.rsvp !== 'declined').map(g => <article className="guest" key={g.id}>
          <div className="guest-head"><h4>{g.name}{g.plusOne ? ` & ${g.plusOne}` : ''} {g.host && <span className="host-badge">Hosts</span>}</h4><b>{g.rsvp === 'coming' ? 'Coming' : 'Maybe'}</b></div>
          {g.category && <span className="category">{g.category}</span>}
          {g.bringing && <p className="bringing">{g.bringing}</p>}
          {g.frosting && <p className="frosting"><strong>Frosty spin:</strong> {g.frosting}</p>}
        </article>)}
      </div>
    </section>}

    {page === 'ideas' && <section className="ideas-page">
      <div className="ideas-intro">
        <div className="big-icon">✧</div>
        <span>Need a Little Inspiration?</span>
        <h3>Frosty Ideas</h3>
        <p>There are no rules. Give something a wintry name, add a little sparkle, go completely frosty — or simply bring something you love.</p>
      </div>

      <div className="idea-cards">
        <article className="idea-card">
          <div className="idea-icon">❄</div><h4>Frost Your Food</h4>
          <p>Add a snowy, icy or sparkling touch to something you already like.</p>
          <ul><li>Snowy white toppings or garnishes</li><li>Icy blue or silver accents</li><li>A snowdrift of cheese, yogurt, coconut or Parmesan</li><li>Serve it chilled, sparkling or on ice</li><li>Or just give the presentation a frosty twist</li></ul>
        </article>
        <article className="idea-card">
          <div className="idea-icon">✦</div><h4>Give It a Frosty Name</h4>
          <p>An ordinary favourite can become perfectly frosty with nothing more than a new name.</p>
          <div className="name-cloud"><span>Frostbite Wings</span><span>Snowdrift Dip</span><span>Black Ice Brownies</span><span>Northern Lights Punch</span><span>Snowbank Cheesecake</span><span>Arctic Garden</span><span>Snow Day Sliders</span><span>The Cold Board</span></div>
        </article>
        <article className="idea-card">
          <div className="idea-icon">✧</div><h4>Frost Yourself — If You Feel Like It</h4>
          <p>This is not a costume party. Be exactly as frosty as your own frosty self wants to be.</p>
          <ul><li>A little silver or sparkle</li><li>White or icy blue</li><li>Snowflake jewellery</li><li>A ridiculous winter hat</li><li>Full frosty masterpiece</li><li>Or absolutely nothing extra</li></ul>
        </article>
      </div>
      <div className="word-bank"><b>Try words like:</b> Snow · Frost · Ice · Blizzard · Polar · Frozen · Snowdrift · Cold Snap · Icicle · Arctic · Winter · North Pole</div>
    </section>}

    <footer>Good Friends ❄ Great Food ❄ Festive Drinks ❄ Epic Karaoke</footer>
  </main>
}
