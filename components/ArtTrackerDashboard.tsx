import React, { useState, useEffect } from 'react';
import styles from './ArtTrackerDashboard.module.css';
import VoiceInterface from './VoiceInterface';

interface DashboardProps {
  appName: string;
  artistName: string;
}

interface Artwork {
  id: number;
  title: string;
  artistName: string;
  year: number;
  medium: string;
  dimensions: string;
  status: 'In Studio' | 'Exhibited' | 'Sold' | 'Archived';
  location: string; // Maps to 'description' in DB
  price?: number;
  imageUrl?: string;
  _available?: number;
  _originalPriceString?: string;
}

interface Cost {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  artworkId?: number;
}

interface Deadline {
  id: number;
  title: string;
  date: string;
  description?: string;
  link?: string;
  location?: string; // New: To display where the show is
  fee?: string;       // New: To display the entry fee
  submittedArtworks?: {id: number, imageUrl: string}[];
}

interface Show {
  id: number;
  title: string;
  location: string;
  due_date: string;
  fee: string;
  description: string;
  link: string;
  scope: 'L' | 'R' | 'N' | 'I';
  user_status: 'Pending' | 'Interested' | 'Not Interested' | 'Entered';
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If we're on localhost, hit port 8080. If on Tailscale, hit Tailscale IP port 8080.
    return `http://${hostname}:8080/tools/ArtTrackerDashboard/api`;
  }
  return '/tools/ArtTrackerDashboard/api';
};

const Dashboard: React.FC<DashboardProps> = ({ appName, artistName }) => {
  const API_BASE_URL = getApiBaseUrl();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  console.log("Dashboard component initialized. Artworks:", artworks);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  
  const [isLoadingArt, setIsLoadingArt] = useState(true);
  const [isLoadingCosts, setIsLoadingCosts] = useState(true);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(true);
  const [isLoadingShows, setIsLoadingShows] = useState(true);
  
  // UI State
  const [isArtworksCollapsed, setIsArtworksCollapsed] = useState(false);

  const [selectedDeadlineId, setSelectedDeadlineId] = useState<number | null>(null);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  // Modal State - Artworks
  const [isAddArtworkOpen, setIsAddArtworkOpen] = useState(false);
  const [editingArtworkId, setEditingArtworkId] = useState<number | null>(null);
  const [newArtwork, setNewArtwork] = useState<Partial<Artwork>>({
    title: '', medium: '', status: 'In Studio', price: 0, location: '', dimensions: '', imageUrl: ''
  });

  // Modal State - Costs
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [newCost, setNewCost] = useState<Partial<Cost>>({
    date: new Date().toISOString().split('T')[0], category: 'Materials', description: '', amount: 0, currency: 'USD'
  });

  // Modal State - Deadlines
  const [isAddDeadlineOpen, setIsAddDeadlineOpen] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({
    title: '', date: new Date().toISOString().split('T')[0], description: '', link: '', location: '', fee: ''
  });

  // Modal State - Shows & Calls
  const [isAddShowOpen, setIsAddShowOpen] = useState(false);
  const [newShow, setNewShow] = useState<Partial<Show>>({
    title: '', location: '', due_date: new Date().toISOString().split('T')[0], fee: '', description: '', link: '', scope: 'L', user_status: 'Interested'
  });

  // Enter Show Modal State
  const [enteringShow, setEnteringShow] = useState<Show | null>(null);
  const [enterChecklist, setEnterChecklist] = useState({
    feePaid: false,
    confirmationReceived: false,
    deadlineSet: false,
  });
  const [enterFeeAmount, setEnterFeeAmount] = useState('');
  const [enterSelectedArtworks, setEnterSelectedArtworks] = useState<number[]>([]);
  const [enterConfirmationNum, setEnterConfirmationNum] = useState('');

  const fetchArtworks = () => {
    setIsLoadingArt(true);
    fetch(`${API_BASE_URL}/artworks.php?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setArtworks(data); setIsLoadingArt(false); })
      .catch(err => { console.error(err); setIsLoadingArt(false); });
  };

  const fetchCosts = () => {
    setIsLoadingCosts(true);
    fetch(`${API_BASE_URL}/costs.php?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCosts(data); setIsLoadingCosts(false); })
      .catch(err => { console.error(err); setIsLoadingCosts(false); });
  };

  const fetchDeadlines = () => {
    setIsLoadingDeadlines(true);
    fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDeadlines(data); setIsLoadingDeadlines(false); })
      .catch(err => { console.error(err); setIsLoadingDeadlines(false); });
  };

  const fetchShows = () => {
    setIsLoadingShows(true);
    fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setShows(data); setIsLoadingShows(false); })
      .catch(err => { console.error(err); setIsLoadingShows(false); });
  };

  useEffect(() => { fetchArtworks(); fetchCosts(); fetchDeadlines(); fetchShows(); }, []);

  const costsByCategory = costs.reduce((acc, cost) => {
    acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
    return acc;
  }, {} as Record<string, number>);

  const groupedCosts = costs.reduce((acc, cost) => {
    if (!acc[cost.category]) acc[cost.category] = [];
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, Cost[]>);

  const getResolvedImageUrl = (path?: string) => {
    if (!path) return '';
    const baseUrl = API_BASE_URL.replace('/api', '');
    if (path.startsWith('../')) {
      const relativePath = path.substring(3); // remove ../
      return `${baseUrl}/${relativePath}`;
    }
    return path;
  };

  const filteredArtworks = artworks
    .filter(art => filterStatus === 'All' || art.status === filterStatus)
    .filter(art => 
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      art.medium.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'Newest') return b.id - a.id;
      if (sortBy === 'Oldest') return a.id - b.id;
      if (sortBy === 'Price High-Low') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'Price Low-High') return (a.price || 0) - (b.price || 0);
      return 0;
    });

  // Artwork Handlers
  const handleSaveArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newArtwork, artistName };
    const method = editingArtworkId ? 'PUT' : 'POST';
    if (editingArtworkId) payload.id = editingArtworkId;

    try {
      const response = await fetch(`${API_BASE_URL}/artworks.php?t=${Date.now()}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchArtworks();
        setIsAddArtworkOpen(false);
        setEditingArtworkId(null);
        setNewArtwork({ title: '', medium: '', status: 'In Studio', price: 0, location: '', dimensions: '', imageUrl: '' });
      } else { alert("Error saving artwork."); }
    } catch (err) { alert("Failed to connect to database."); }
  };

  const handleDeleteArtwork = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this artwork?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/artworks.php?id=${id}`, { method: 'DELETE' });
      if (response.ok) { fetchArtworks(); fetchCosts(); }
    } catch (err) { alert("Failed to delete."); }
  };

  const openEditArtwork = (art: Artwork) => {
    setNewArtwork(art);
    setEditingArtworkId(art.id);
    setIsAddArtworkOpen(true);
  };

  // Cost Handlers
  const handleSaveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newCost, artworkId: newCost.artworkId ? Number(newCost.artworkId) : null };
    const method = editingCostId ? 'PUT' : 'POST';
    if (editingCostId) payload.id = editingCostId;
    try {
      const response = await fetch(`${API_BASE_URL}/costs.php?t=${Date.now()}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) { fetchCosts(); setIsAddCostOpen(false); setEditingCostId(null); setNewCost({ date: new Date().toISOString().split('T')[0], category: 'Materials', description: '', amount: 0, currency: 'USD' }); }
    } catch (err) {}
  };

  const handleDeleteCost = async (id: number) => {
    if (window.confirm("Delete?")) {
      await fetch(`${API_BASE_URL}/costs.php?id=${id}`, { method: 'DELETE' });
      fetchCosts();
    }
  };

  const openEditCost = (cost: Cost) => {
    setNewCost(cost);
    setEditingCostId(cost.id);
    setIsAddCostOpen(true);
  };

  // Deadline Handlers
  const handleSaveDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newDeadline };
    const method = editingDeadlineId ? 'PUT' : 'POST';
    if (editingDeadlineId) payload.id = editingDeadlineId;
    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) { fetchDeadlines(); setIsAddDeadlineOpen(false); setEditingDeadlineId(null); setNewDeadline({ title: '', date: new Date().toISOString().split('T')[0], description: '', link: '', location: '', fee: '' }); }
    } catch (err) {}
  };

  const handleDeleteDeadline = async (id: number) => {
    if (window.confirm("Delete?")) {
      await fetch(`${API_BASE_URL}/deadlines.php?id=${id}`, { method: 'DELETE' });
      fetchDeadlines();
      if (selectedDeadlineId === id) setSelectedDeadlineId(null);
    }
  };

  const openEditDeadline = (dl: Deadline) => {
    setNewDeadline(dl);
    setEditingDeadlineId(dl.id);
    setIsAddDeadlineOpen(true);
  };

  const handleToggleSubmission = async (artworkId: number) => {
    if (!selectedDeadlineId) return;
    try {
      await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_submission', deadline_id: selectedDeadlineId, artwork_id: artworkId })
      });
      fetchDeadlines(); 
    } catch (err) { console.error(err); }
  };

  // Show Interaction Handlers
  const handleShowStatusChange = async (show: Show, newStatus: 'Interested' | 'Not Interested' | 'Entered') => {
    try {
      const response = await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: show.id, user_status: newStatus })
      });
      if (response.ok) {
        if (newStatus === 'Entered') {
          await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: show.title, date: show.due_date, description: `Submission for ${show.location}`, link: show.link })
          });
          fetchDeadlines();
        }
        fetchShows();
      }
    } catch (err) { console.error(err); }
  };

  const openEnterModal = (show: Show) => {
    setEnteringShow(show);
    const feeNum = show.fee ? show.fee.replace(/[^0-9.]/g, '') : '';
    setEnterFeeAmount(feeNum);
    setEnterSelectedArtworks([]);
    setEnterConfirmationNum('');
    setEnterChecklist({ feePaid: false, confirmationReceived: false, deadlineSet: false });
  };

  const handleConfirmEntry = async () => {
    if (!enteringShow) return;
    try {
      // 1. Mark show as Entered
      await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: enteringShow.id, user_status: 'Entered' })
      });

      // 2. Log cost if fee was paid
      if (enterChecklist.feePaid && enterFeeAmount) {
        await fetch(`${API_BASE_URL}/costs.php?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: new Date().toISOString().split('T')[0],
            category: 'Show Entry',
            description: `${enteringShow.title}${enterConfirmationNum ? ` [${enterConfirmationNum}]` : ''}`,
            amount: parseFloat(enterFeeAmount),
            currency: 'USD'
          })
        });
      }

      // 3. Create deadline
      if (enterChecklist.deadlineSet) {
        await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: enteringShow.title,
            date: enteringShow.due_date,
            description: `${enteringShow.location}${enterConfirmationNum ? ` | Confirmation: ${enterConfirmationNum}` : ''}`,
            link: enteringShow.link
          })
        });
      }

      fetchShows();
      fetchCosts();
      fetchDeadlines();
      setEnteringShow(null);
    } catch (err) {
      console.error('Error confirming entry:', err);
    }
  };

  const handleSaveShow = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newShow.title,
      location: newShow.location,
      due_date: newShow.due_date,
      fee: newShow.fee,
      description: newShow.description,
      link: newShow.link,
      scope: newShow.scope || 'L',
      user_status: newShow.user_status || 'Interested'
    };

    try {
      const response = await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        fetchShows();
        setIsAddShowOpen(false);
        setNewShow({ title: '', location: '', due_date: new Date().toISOString().split('T')[0], fee: '', description: '', link: '', scope: 'L', user_status: 'Interested' });
      } else {
        alert('Error saving show.');
      }
    } catch (err) {
      alert('Failed to connect to show API.');
    }
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getDate().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${styles.dashboardContainer} art-tracker-container`}>
      <header className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <h1 className={styles.appName}>{appName}</h1>
          <div className={styles.headerStatus}>
            <span>MySQL: <span className={styles.statusOk}>CONNECTED</span></span>
          </div>
        </div>

        <nav className={styles.navBar}>
          {[
            {id:'artworks', label:'Artworks', col:'left', title:'Scroll to Artworks section'},
            {id:'costs',    label:'Costs',    col:'left', title:'Scroll to Cost Tracking section'},
            {id:'roi',      label:'ROI',      col:'left', title:'Scroll to Financial ROI Tracker section'},
            {id:'deadlines',label:'Deadlines',col:'right', title:'Scroll to Dynamic Deadlines section'},
            {id:'shows',    label:'Shows',    col:'right', title:'Scroll to Shows & Calls section'},
          ].map(({id, label, col, title}) => (
            <a key={id} href={`#${id}`} className={styles.navLink} title={title}
              onClick={e => {
                e.preventDefault();
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
              }}
            >{label}</a>
          ))}
        </nav>

        <div className={styles.artistStatus}>
          <span className={styles.onlineIndicator}>●</span>
          <span className={styles.artistName}>{artistName}</span>
        </div>
      </header>

      <main className={styles.dashboardMain}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
        <section id="artworks" className={styles.mainContentPanel}>
          <div className={styles.collapsibleHeader} onClick={() => setIsArtworksCollapsed(!isArtworksCollapsed)}>
            <h2 className={styles.panelTitle}>Artworks Overview</h2>
            <span className={styles.collapseIcon} style={{ transform: isArtworksCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out' }} title={isArtworksCollapsed ? 'Expand Artworks section' : 'Collapse Artworks section'}>▼</span>
          </div>
          
          {!isArtworksCollapsed && (
            <div className={styles.collapsibleContent}>
            {selectedDeadlineId && (
              <div className={styles.selectionBanner}>
                <span>Select artworks to submit for this deadline. (Check the boxes on the images below)</span>
                <button className={styles.cancelButton} style={{border: '1px solid var(--color-accent-cyan)', color: 'var(--color-accent-cyan)'}} onClick={() => setSelectedDeadlineId(null)}>Done</button>
              </div>
            )}
            <div className={styles.filterBar}>
              <input type="text" placeholder="Search by title or medium..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.filterInput} title="Search artworks by title or medium" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect} title="Filter artworks by their current status">
                <option value="All">All Statuses</option>
                <option value="In Studio">In Studio</option>
                <option value="Exhibited">Exhibited</option>
                <option value="Sold">Sold</option>
                <option value="Archived">Archived</option>
              </select>
              <select value={sortBy} onChange={(e) => setFilterStatus(e.target.value)} className={styles.filterSelect} title="Sort artworks by different criteria">
                <option value="Newest">Newest First</option>
                <option value="Oldest">Oldest First</option>
                <option value="Price High-Low">Price (High to Low)</option>
                <option value="Price Low-High">Price (Low to High)</option>
              </select>
            </div>
            {console.log({ isLoadingArt, filteredArtworksLength: filteredArtworks.length, filterStatus, searchTerm })}
            {isLoadingArt ? (<p>Loading artworks database...</p>) : filteredArtworks.length === 0 ? (
              <p style={{color: '#8899bb', fontStyle: 'italic'}} title="No artworks match the current search and filter criteria.">No artworks found matching your criteria.</p>
            ) : (
              <div className={styles.artworkList}>
                {filteredArtworks.map((artwork) => (
                  <div key={artwork.id} className={styles.artworkItem} onClick={() => openEditArtwork(artwork)} style={{cursor: 'pointer'}} title="Click to Edit All Fields">
                    {selectedDeadlineId && (
                      <div className={styles.submissionCheckboxWrapper} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className={styles.submissionCheckbox}
                          checked={deadlines.find(d => d.id === selectedDeadlineId)?.submittedArtworks?.some(sa => sa.id === artwork.id) || false}
                          onChange={() => handleToggleSubmission(artwork.id)}
                          title="Toggle submission for this artwork to the selected deadline"
                        />
                      </div>
                    )}
                    <img src={getResolvedImageUrl(artwork.imageUrl)} alt={artwork.title} className={styles.artworkImage} title={artwork.title} />
                    <div className={styles.artworkDetails}>
                      <span className={styles.artworkTitle}>{artwork.title}</span>
                      <span className={styles.artworkMedium} title={`Dimensions: ${artwork.dimensions}`}>({artwork.medium})</span>
                      <span className={styles.artworkStatus} data-status={artwork.status.toLowerCase()} title="Current status of the artwork">{artwork.status}</span>
                    </div>
                    <span className={styles.artworkPrice}>{artwork.price ? `$${artwork.price.toFixed(2)}` : 'N/A'}</span>
                  </div>
                ))}
              </div>
            )}
            <button className={styles.actionButton} onClick={() => { setEditingArtworkId(null); setNewArtwork({ title: '', medium: '', status: 'In Studio', price: 0, location: '', dimensions: '', imageUrl: '' }); setIsAddArtworkOpen(true); }} title="Add a new artwork to your collection">+ Add New Artwork</button>
          </div>
          )}
        </section>
        {/* Costs + ROI */}
        <section id="costs" className={styles.costTrackingPanel}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0'}}>
            <h2 className={styles.panelTitle} style={{marginBottom: 0}}>Cost Tracking</h2>
            <button
              onClick={() => { fetchCosts(); }}
              title="Refresh costs"
              style={{
                background: 'rgba(0, 170, 255, 0.1)',
                border: '1px solid rgba(0, 170, 255, 0.4)',
                borderRadius: '6px',
                color: 'var(--color-primary-blue)',
                cursor: 'pointer',
                fontSize: '0.85em',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.1)')}
            >
              🔄 Refresh
            </button>
          </div>
          <div className={styles.costSummary}>
            {Object.entries(costsByCategory).map(([category, total]) => (
              <div key={category} className={styles.costMetric} title={`Total expenses for ${category}`}>
                <span className={styles.costMetricLabel}>{category}:</span>
                <span className={styles.costMetricValue}>${total.toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          {costs.length > 0 && (
            <div style={{marginTop: '30px'}}>
              <div className={styles.collapsibleHeader}>
                <h3 className={styles.widgetTitle} style={{marginBottom: 0, borderBottom: 'none'}}>Recent Expenses by Category</h3>
                <span className={styles.collapseIcon} title="Toggle display of recent expenses by category">▼</span>
              </div>
              <div className={styles.collapsibleContent}>
                <div className={styles.recentCostList} style={{gap: '20px'}}>
                  {Object.entries(groupedCosts).map(([category, catCosts]) => (
                    <div key={category} style={{backgroundColor: 'rgba(20, 20, 40, 0.4)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 170, 255, 0.1)'}}>
                      <h4 style={{color: 'var(--color-primary-blue)', margin: '0 0 10px 0', borderBottom: '1px solid rgba(0, 170, 255, 0.2)', paddingBottom: '5px'}}>
                        {category} <span style={{float: 'right', color: 'var(--color-accent-cyan)'}}>${catCosts.reduce((s, c) => s + c.amount, 0).toFixed(2)}</span>
                      </h4>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {catCosts.map((cost) => (
                          <div key={cost.id} className={styles.costItem}>
                            <span className={styles.costItemDate}>[{cost.date}]</span>
                            <span className={styles.costItemDesc}>{cost.description}</span>
                            <span className={styles.costItemAmount}>${cost.amount.toFixed(2)}
                              <div className={styles.costActions} style={{display: 'inline-block', marginLeft: '10px'}}>
                                <button className={styles.editButton} onClick={() => openEditCost(cost)} title="Edit this expense">✏️</button>
                                <button className={styles.deleteButton} onClick={() => handleDeleteCost(cost.id)} title="Delete this expense">❌</button>
                              </div>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button className={styles.actionButton} onClick={() => { setEditingCostId(null); setNewCost({ date: new Date().toISOString().split('T')[0], category: 'Materials', description: '', amount: 0, currency: 'USD' }); setIsAddCostOpen(true); }} style={{marginTop: '25px'}} title="Add a new expense">+ Add New Expense</button>
        </section>

        <section id="roi" className={styles.roiPanel} style={{gridColumn: '1 / 2'}}>
          <h2 className={styles.panelTitle}>Financial ROI Tracker</h2>
          <div className={styles.roiStats}>
            <div className={styles.roiStatBox} title="Total revenue from all sold artworks."><span className={styles.roiStatLabel}>Total Revenue (Sold)</span><span className={styles.roiStatValue}>${artworks.filter(a => a.status === 'Sold').reduce((acc, a) => acc + (a.price || 0), 0).toFixed(2)}</span></div>
            <div className={styles.roiStatBox} title="Total sum of all recorded expenses."><span className={styles.roiStatLabel}>Total Expenses</span><span className={styles.roiStatValue}>${costs.reduce((acc, c) => acc + c.amount, 0).toFixed(2)}</span></div>
            <div className={styles.roiStatBox} title="Calculated as Total Revenue minus Total Expenses."><span className={styles.roiStatLabel}>Net Profit</span><span className={`${styles.roiStatValue} ${(artworks.filter(a => a.status === 'Sold').reduce((acc, a) => acc + (a.price || 0), 0) - costs.reduce((acc, c) => acc + c.amount, 0)) >= 0 ? styles.roiPositive : styles.roiNegative}`}>${(artworks.filter(a => a.status === 'Sold').reduce((acc, a) => acc + (a.price || 0), 0) - costs.reduce((acc, c) => acc + c.amount, 0)).toFixed(2)}</span></div>
          </div>
          <h3 className={styles.widgetTitle} style={{marginTop: '20px'}}>Artwork Profitability (Linked Costs)</h3>
          {artworks.filter(a => a.status === 'Sold').length === 0 ? (<p style={{color: '#8899bb', fontStyle: 'italic', fontSize: '0.9em'}}>No sold artworks found.</p>) : (
            <table className={styles.roiTable}>
              <thead><tr><th><span title="Name of the artwork">Artwork</span></th><th><span title="Final selling price of the artwork">Selling Price</span></th><th><span title="Expenses directly linked to this artwork">Linked Expenses</span></th><th><span title="Selling Price minus Linked Expenses for this artwork">Net Profit</span></th></tr></thead>
              <tbody>{artworks.filter(a => a.status === 'Sold').map(art => { const linkedCosts = costs.filter(c => c.artworkId === art.id).reduce((sum, c) => sum + c.amount, 0); const net = (art.price || 0) - linkedCosts; return (<tr key={art.id}><td><strong>{art.title}</strong></td><td>${(art.price || 0).toFixed(2)}</td><td style={{color: '#e74c3c'}}>-${linkedCosts.toFixed(2)}</td><td className={net >= 0 ? styles.roiPositive : styles.roiNegative}><strong>${net.toFixed(2)}</strong></td></tr>); })}</tbody>
            </table>
          )}
        </section>
        </div>{/* end leftColumn */}

        {/* RIGHT COLUMN */}
        <div className={styles.sidePanel}>
          <section id="deadlines" className={styles.widgetPanel}>
            <div className={styles.widgetTitle} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h3 style={{margin: 0, borderBottom: 'none', paddingBottom: 0, fontSize: '1.2em'}}>Dynamic Deadlines</h3>
              <button
                onClick={() => { fetchDeadlines(); }}
                title="Refresh deadlines"
                style={{
                  background: 'rgba(0, 170, 255, 0.1)',
                  border: '1px solid rgba(0, 170, 255, 0.4)',
                  borderRadius: '6px',
                  color: 'var(--color-primary-blue)',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.1)')}
            >
              🔄 Refresh
            </button>
              <span style={{fontSize: '0.8em', color: 'var(--color-text-muted)'}}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className={styles.deadlineListWrapper}>
              {isLoadingDeadlines ? (
                <p>Loading deadlines...</p>
              ) : deadlines.length === 0 ? (
                <p style={{color: '#8899bb', fontStyle: 'italic', fontSize: '0.9em'}} title="There are no deadlines currently entered or available.">No upcoming deadlines.</p>
              ) : (
                deadlines.map(dl => {
                  const isSelected = selectedDeadlineId === dl.id;
                  return (
                    <div 
                      key={dl.id} 
                      className={`${styles.deadlineItem} ${isSelected ? styles.activeDeadline : ''}`}
                      onClick={() => setSelectedDeadlineId(isSelected ? null : dl.id)}
                      style={{cursor: 'pointer', display: 'block'}}
                      title="Click to view/select artworks for this deadline or edit details"
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '5px'}}>
                        <span className={styles.deadlineTitle} style={{fontSize: '0.95em'}}>
                          {dl.link ? <a href={dl.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{color: 'inherit', textDecoration: 'none'}} title="View full details or prospectus for this deadline">{dl.title}</a> : dl.title}
                        </span>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          <span className={styles.deadlineDate}>{formatShortDate(dl.date)}</span>
                          <div className={styles.deadlineActions}>
                            <button className={styles.editButton} onClick={(e) => { e.stopPropagation(); openEditDeadline(dl); }} title="Edit this deadline">✏️</button>
                            <button className={styles.deleteButton} onClick={(e) => { e.stopPropagation(); handleDeleteDeadline(dl.id); }} title="Delete this deadline">❌</button>
                          </div>
                        </div>
                      </div>
                      {dl.description && <p style={{fontSize: '0.8em', color: 'var(--color-text-muted)', margin: '0 0 5px 0'}}>{dl.description}</p>}
                      {dl.submittedArtworks && dl.submittedArtworks.length > 0 && (
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px'}}>
                          {dl.submittedArtworks.map(art => (
                            <img
                              key={art.id}
                              src={art.imageUrl}
                              alt="Submitted Artwork"
                              title={artworks.find(a => a.id === art.id)?.title || ''}
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid rgba(0,255,255,0.25)',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {(!dl.submittedArtworks || dl.submittedArtworks.length === 0) && (
                        <p style={{fontSize: '0.75em', color: 'rgba(136,153,187,0.5)', margin: '6px 0 0 0', fontStyle: 'italic'}} title="Click on this deadline to link artworks from your collection.">
                          No artworks linked — click to select
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <button className={styles.actionButton} style={{marginTop: '15px', width: '100%', padding: '8px', fontSize: '0.9em'}} onClick={() => { setEditingDeadlineId(null); setNewDeadline({ title: '', date: new Date().toISOString().split('T')[0], description: '', link: '', location: '', fee: '' }); setIsAddDeadlineOpen(true); }} title="Add a new submission deadline or event">
              + Add Deadline
            </button>
          </section>

          <section id="shows" className={styles.showPanel}>
            <h2 className={styles.panelTitle}>Shows & Calls</h2>
            <button
              onClick={() => { fetchShows(); }}
              title="Refresh shows"
              style={{
                background: 'rgba(0, 170, 255, 0.1)',
                border: '1px solid rgba(0, 170, 255, 0.4)',
                borderRadius: '6px',
                color: 'var(--color-primary-blue)',
                cursor: 'pointer',
                fontSize: '0.85em',
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0, 170, 255, 0.1)')}
            >
              🔄 Refresh
            </button>
            <div className={styles.showList}>
              {isLoadingShows ? (
                <p title="Retrieving available show and call for entry opportunities.">Fetching opportunities...</p>
              ) : shows.length === 0 ? (
                <p style={{color: '#8899bb', fontStyle: 'italic'}} title="No new show or call for entry opportunities were found.">No new opportunities at this time.</p>
              ) : (
                shows.map(show => (
                  <div key={show.id} className={styles.showItem} style={{flexDirection: 'column', gap: '10px'}}>
                    <div className={styles.showItemLeft}>
                      <div className={styles.showHeader}>
                        <span className={styles.scopeBadge} data-scope={show.scope} title={
                          show.scope === 'L' ? 'Local Opportunity' :
                          show.scope === 'R' ? 'Regional Opportunity' :
                          show.scope === 'N' ? 'National Opportunity' :
                          show.scope === 'I' ? 'International Opportunity' : 'Unknown Scope'
                        }>{show.scope}</span>
                        <span className={styles.showTitle} style={{fontSize: '0.9em'}} title="Click for more details about this show/call">{show.title}</span>
                      </div>
                      <div className={styles.showMeta} style={{display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px'}}>
                        <span>📍 {show.location}</span>
                        <span>🗓️ Due: {show.due_date}</span>
                      </div>
                      <div className={styles.showDesc} style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{show.description}</div>
                      <a href={show.link} target="_blank" rel="noopener noreferrer" className={styles.showLink}>View Details &rarr;</a>
                    </div>
                    
                    <div className={styles.showActions} style={{marginLeft: 0, flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 255, 0.1)'}}>
                      <label className={styles.showCheckbox} title="Mark this show as 'Not Interested'">
                        <input type="radio" name={`status-${show.id}`} checked={show.user_status === 'Not Interested'} onChange={() => handleShowStatusChange(show, 'Not Interested')} /> Hide
                      </label>
                      <label className={styles.showCheckbox} title="Mark this show as 'Interested'">
                        <input type="radio" name={`status-${show.id}`} checked={show.user_status === 'Interested'} onChange={() => handleShowStatusChange(show, 'Interested')} /> Keep
                      </label>
                      <button
                        onClick={() => openEnterModal(show)}
                        style={{
                          background: show.user_status === 'Entered' ? 'rgba(0,255,150,0.15)' : 'rgba(0,255,150,0.07)',
                          border: '1px solid rgba(0,255,150,0.4)',
                          borderRadius: '6px',
                          color: '#00ff96',
                          cursor: 'pointer',
                          fontSize: '0.8em',
                          padding: '5px 14px',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                        }}
                        title={show.user_status === 'Entered' ? 'You have already entered this show' : 'Open modal to confirm entry and record details'}
                      >
                        {show.user_status === 'Entered' ? '✅ Entered' : '→ Enter'}
                      </button>
                    </div>
                  </div>
                )))}
              </div>
            <button className={styles.actionButton} style={{marginTop: '15px', width: '100%', padding: '8px', fontSize: '0.9em'}} onClick={() => { setNewShow({ title: '', location: '', due_date: new Date().toISOString().split('T')[0], fee: '', description: '', link: '', scope: 'L', user_status: 'Interested' }); setIsAddShowOpen(true); }} title="Add a new show or call for entries">
              + Add Show
            </button>
          </section>
        </div>{/* end sidePanel */}
      </main>

      {/* EXPANDED ARTWORK MODAL (The "Editing Page") */}
      {isAddArtworkOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{width: '700px', maxWidth: '95vw'}}>
            <h2>{editingArtworkId ? `Editing: ${newArtwork.title}` : 'Add New Painting'}</h2>
            <form onSubmit={handleSaveArtwork} className={styles.modalForm}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div className={styles.formGroup}>
                  <label>Title</label>
                  <input type="text" value={newArtwork.title} onChange={e => setNewArtwork({...newArtwork, title: e.target.value})} required title="Enter the title of the artwork" />
                </div>
                <div className={styles.formGroup}>
                  <label>Medium</label>
                  <input type="text" value={newArtwork.medium} onChange={e => setNewArtwork({...newArtwork, medium: e.target.value})} required title="Enter the medium used for the artwork" />
                </div>
                <div className={styles.formGroup}>
                  <label>Dimensions / Size (e.g. 12"h x 18"w)</label>
                  <input type="text" value={newArtwork.dimensions} onChange={e => setNewArtwork({...newArtwork, dimensions: e.target.value})} title="Enter the dimensions (e.g., 12h x 18w)" />
                </div>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select value={newArtwork.status} onChange={e => setNewArtwork({...newArtwork, status: e.target.value as Artwork['status']})} title="Select the current status of the artwork">
                    <option value="In Studio">In Studio</option><option value="Exhibited">Exhibited</option><option value="Sold">Sold</option><option value="Archived">Archived</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Price or "Sold"/"Archived" String</label>
                  <input type="text" value={newArtwork._originalPriceString || ''} onChange={e => setNewArtwork({...newArtwork, _originalPriceString: e.target.value})} title="Enter the selling price or a descriptive status (e.g., 'Sold', 'Archived')" />
                </div>
                <div className={styles.formGroup}>
                  <label>Database Image Path (e.g. ../Artwork/Paintings/490.jpg)</label>
                  <input type="text" value={newArtwork.imageUrl} onChange={e => setNewArtwork({...newArtwork, imageUrl: e.target.value})} title="Enter the internal path to the artwork image file" />
                </div>
              </div>
              <div className={styles.formGroup} style={{marginTop: '15px'}}>
                <label>Painting Description / Story</label>
                <textarea 
                  value={newArtwork.location} 
                  onChange={e => setNewArtwork({...newArtwork, location: e.target.value})} 
                  style={{width: '100%', minHeight: '150px', backgroundColor: 'rgba(10, 10, 32, 0.5)', border: '1px solid rgba(0, 255, 255, 0.3)', color: 'white', borderRadius: '6px', padding: '10px', fontFamily: 'inherit', resize: 'vertical'}}
                  title="Provide a detailed description or story for the artwork"
                />
              </div>
              <div className={styles.modalActions}>
                {editingArtworkId && <button type="button" className={styles.deleteButton} style={{marginRight: 'auto', padding: '10px 20px'}} onClick={() => handleDeleteArtwork(editingArtworkId)} title="Permanently delete this artwork and all linked data">DELETE PERMANENTLY</button>}
                <button type="button" className={styles.cancelButton} onClick={() => setIsAddArtworkOpen(false)} title="Discard changes and close this window">Cancel</button>
                <button type="submit" className={styles.submitButton} style={{padding: '10px 30px'}} title={editingArtworkId ? 'Save changes to the artwork' : 'Save this new artwork'}>{editingArtworkId ? 'Save All Database Fields' : 'Save New Painting'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddCostOpen && (<div className={styles.modalOverlay}><div className={styles.modalContent}><h2>{editingCostId ? 'Edit Expense' : 'Add New Expense'}</h2><form onSubmit={handleSaveCost} className={styles.modalForm}><div className={styles.formGroup}><label>Date</label><input type="date" value={newCost.date} onChange={e => setNewCost({...newCost, date: e.target.value})} required title="Enter the date of the expense" /></div><div className={styles.formGroup}><label>Category</label><select value={newCost.category} onChange={e => setNewCost({...newCost, category: e.target.value})} title="Select the category for this expense"><option value="Materials">Materials</option><option value="Framing">Framing</option><option value="Shipping">Shipping</option><option value="Show Entry">Show Entry</option><option value="AI Usage">AI Usage</option><option value="Other">Other</option></select></div><div className={styles.formGroup}><label>Description</label><input type="text" placeholder="e.g. Canvas and Paint" value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} required title="Enter a brief description of the expense" /></div><div className={styles.formGroup}><label>Amount ($)</label><input type="number" step="0.01" value={newCost.amount} onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})} required title="Enter the cost amount in USD" /></div><div className={styles.formGroup}><label>Link to Artwork (Optional)</label><select value={newCost.artworkId || ''} onChange={e => setNewCost({...newCost, artworkId: e.target.value ? Number(e.target.value) : undefined})} title="Optionally link this expense to a specific artwork"><option value="">-- None --</option>{artworks.map(art => (<option key={art.id} value={art.id}>{art.title}</option>))}</select></div><div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={() => setIsAddCostOpen(false)} title="Discard changes and close this window">Cancel</button><button type="submit" className={styles.submitButton} title={editingCostId ? 'Save changes to the expense' : 'Save this new expense'}>{editingCostId ? 'Update Expense' : 'Save Expense'}</button></div></form></div></div>)}

      {isAddDeadlineOpen && (<div className={styles.modalOverlay}><div className={styles.modalContent}><h2>{editingDeadlineId ? 'Edit Deadline' : 'Add New Deadline'}</h2><form onSubmit={handleSaveDeadline} className={styles.modalForm}><div className={styles.formGroup}><label>Title / Show Name</label><input type="text" value={newDeadline.title} onChange={e => setNewDeadline({...newDeadline, title: e.target.value})} required title="Enter the title of the deadline or show" /></div><div className={styles.formGroup}><label>Date</label><input type="date" value={newDeadline.date} onChange={e => setNewDeadline({...newDeadline, date: e.target.value})} required title="Enter the due date for the deadline" /></div><div className={styles.formGroup}><label>Description / Details (Optional)</label><input type="text" value={newDeadline.description} onChange={e => setNewDeadline({...newDeadline, description: e.target.value})} title="Provide additional details or notes for the deadline" /></div><div className={styles.modalActions}><button type="button" className={styles.cancelButton} onClick={() => setIsAddDeadlineOpen(false)} title="Discard changes and close this window">Cancel</button><button type="submit" className={styles.submitButton} title={editingDeadlineId ? 'Save changes to the deadline' : 'Save this new deadline'}>{editingDeadlineId ? 'Update Deadline' : 'Save Deadline'}</button></div></form></div></div>)}

      {/* ENTER SHOW MODAL */}
      {enteringShow && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{width: '560px', maxWidth: '95vw'}}>
            <h2 style={{marginBottom: '4px'}}>→ Enter Show</h2>
            <p style={{color: 'var(--color-text-muted)', fontSize: '0.9em', marginBottom: '20px'}}>{enteringShow.title}</p>

            <div style={{display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(0,255,150,0.05)', borderRadius: '8px', border: '1px solid rgba(0,255,150,0.15)', fontSize: '0.85em', flexWrap: 'wrap'}}>
              <span>📍 {enteringShow.location}</span>
              <span>🗓️ Due: {enteringShow.due_date}</span>
              {enteringShow.fee && enteringShow.fee !== 'TBD' && <span>💰 {enteringShow.fee}</span>}
              {enteringShow.link && <a href={enteringShow.link} target="_blank" rel="noopener noreferrer" style={{color: 'var(--color-accent-cyan)'}}>View Prospectus →</a>}
            </div>

            <div className={styles.formGroup} style={{marginBottom: '16px'}}>
              <label style={{fontWeight: 600, marginBottom: '10px', display: 'block'}}>Checklist</label>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}} title="Check if the entry fee has been paid">
                  <input type="checkbox" checked={enterChecklist.feePaid} onChange={e => setEnterChecklist({...enterChecklist, feePaid: e.target.checked})} />
                  <span>Entry fee paid</span>
                  {enterChecklist.feePaid && (
                    <input
                      type="number" step="0.01" placeholder="Amount $"
                      value={enterFeeAmount}
                      onChange={e => setEnterFeeAmount(e.target.value)}
                      style={{width: '100px', padding: '4px 8px', background: 'rgba(10,10,32,0.6)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '4px', color: 'white', fontSize: '0.9em'}}
                      title="Enter the amount of the entry fee"
                    />
                  )}
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}} title="Check if a confirmation has been received">
                  <input type="checkbox" checked={enterChecklist.confirmationReceived} onChange={e => setEnterChecklist({...enterChecklist, confirmationReceived: e.target.checked})} />
                  <span>Confirmation received</span>
                  {enterChecklist.confirmationReceived && (
                    <input
                      type="text" placeholder="Confirmation #"
                      value={enterConfirmationNum}
                      onChange={e => setEnterConfirmationNum(e.target.value)}

                      style={{width: '150px', padding: '4px 8px', background: 'rgba(10,10,32,0.6)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '4px', color: 'white', fontSize: '0.9em'}}
                      title="Enter the confirmation number or reference"
                    />
                  )}
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer'}} title="Automatically create a new deadline entry for this show">
                  <input type="checkbox" checked={enterChecklist.deadlineSet} onChange={e => setEnterChecklist({...enterChecklist, deadlineSet: e.target.checked})} />
                  <span>Add to deadlines tracker</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup} style={{marginBottom: '20px'}}>
              <label style={{fontWeight: 600, marginBottom: '8px', display: 'block'}}>Works Being Submitted (optional)</label>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '8px', background: 'rgba(10,10,32,0.4)', borderRadius: '6px', border: '1px solid rgba(0,255,255,0.1)'}}>
                {artworks.map(art => (
                  <div
                    key={art.id}
                    onClick={() => setEnterSelectedArtworks(prev => prev.includes(art.id) ? prev.filter(id => id !== art.id) : [...prev, art.id])}
                    style={{
                      cursor: 'pointer', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8em',
                      background: enterSelectedArtworks.includes(art.id) ? 'rgba(0,255,150,0.2)' : 'rgba(255,255,255,0.05)',
                      border: enterSelectedArtworks.includes(art.id) ? '1px solid rgba(0,255,150,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: enterSelectedArtworks.includes(art.id) ? '#00ff96' : 'var(--color-text-muted)',
                    }}
                    title="Click to select/deselect this artwork for submission"
                  >
                    {art.title}
                  </div>
                ))}
              </div>
              {enterSelectedArtworks.length > 0 && <p style={{fontSize: '0.8em', color: '#00ff96', marginTop: '6px'}}>{enterSelectedArtworks.length} work{enterSelectedArtworks.length > 1 ? 's' : ''} selected</p>}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setEnteringShow(null)} title="Close this window without confirming entry">Cancel</button>
              <button type="button" className={styles.submitButton} onClick={handleConfirmEntry} style={{background: 'rgba(0,255,150,0.15)', borderColor: 'rgba(0,255,150,0.5)', color: '#00ff96'}} title="Confirm entry to this show and record details">
                ✅ Confirm Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.dashboardFooter}>
        <p className={styles.versionInfo}>MISSION CONTROL v2.4.0-TWISTED</p>
        <p className={styles.disclaimer}>PROACTIVE AGENT INTERFACE // MUFFIN PERSONA ACTIVE</p>
      </footer>

      <VoiceInterface />
    </div>
  );
};

export default Dashboard;
