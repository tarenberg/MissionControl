import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import {
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Trash2,
  Edit,
  Plus,
  Flag,
  Truck,
  Play,
  Square,
  Undo2,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Calendar,
  ArrowRight,
  Grid,
  List,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Info,
  Rocket,
  Download,
  Copy,
  Camera,
  Award,
  Trophy
} from 'lucide-react';
import styles from './ArtTrackerDashboard.module.css';

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
  status: 'In Studio' | 'Exhibited' | 'Sold' | 'Archived' | 'Committed' | 'Accepted';
  committedToShowTitle?: string;
  committedToShowId?: number;
  location: string; // Maps to 'description' in DB
  price?: number;
  imageUrl?: string;
  exhibitions: Exhibition[];
  _available?: number;
  _originalPriceString?: string;
}

interface Exhibition {
  deadlineId: number;
  showTitle: string;
  location: string;
  dueDate: string;
  showStart: string;
  showEnd: string;
  returnDate: string;
  fee: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  award: string | null;
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
  receipt_date?: string;
  ship_date?: string;
  show_start?: string;
  show_end?: string;
  return_date?: string;
  description?: string;
  link?: string;
  location?: string;
  fee?: string;
  status?: string;
  submittedArtworks?: {id: number, title: string, status?: string, imageUrl: string}[];
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
  user_status: 'Pending' | 'Interested' | 'Not Interested' | 'Entered' | 'Accepted' | 'Rejected';
}

const getApiBaseUrl = () => {
  return '/tools/ArtTrackerDashboard/api';
};

const Dashboard: React.FC<DashboardProps> = ({ appName, artistName }) => {
  const API_BASE_URL = getApiBaseUrl();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  console.log("Dashboard component initialized. Artworks:", artworks);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [scrapedDeadlines, setScrapedDeadlines] = useState<any[]>([]);
  const [prospectusRequests, setProspectusRequests] = useState<any[]>([]);
  const [discoveryDigest, setDiscoveryDigest] = useState<{trends: {title: string, content: string}[], priorities: {title: string, content: string}[]} | null>(null);

  const [isLoadingArt, setIsLoadingArt] = useState(true);
  const [isLoadingCosts, setIsLoadingCosts] = useState(true);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(true);
  const [isLoadingShows, setIsLoadingShows] = useState(true);

  const [celebrationData, setCelebrationData] = useState<{imagePath: string, caption: string, artworkTitle: string, showTitle: string} | null>(null);
  const [isGeneratingCelebration, setIsGeneratingCelebration] = useState(false);

  const handleCelebrate = async (artwork: Artwork) => {
    if (!artwork.committedToShowTitle) return;
    
    setIsGeneratingCelebration(true);
    try {
      const response = await fetch('/api/generate-celebration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artworkTitle: artwork.title,
          imageUrl: artwork.imageUrl,
          showTitle: artwork.committedToShowTitle
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate celebration');
      const data = await response.json();
      setCelebrationData(data);
    } catch (error) {
      console.error('Error generating celebration:', error);
      alert('Could not generate celebration post. Check logs.');
    } finally {
      setIsGeneratingCelebration(false);
    }
  };

  const handleDismissDeadline = async (link: string) => {
    try {
      await fetch('/api/art-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link })
      });
      setScrapedDeadlines(prev => prev.filter(dl => dl.link !== link));
    } catch (err) {
      console.error("Error dismissing deadline:", err);
    }
  };

  const handleTrackDeadline = async (dl: any) => {
    try {
      // 1. Add to upcoming_shows database
      const res = await fetch(`${API_BASE_URL}/shows.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dl.title,
          location: dl.location || dl.source,
          due_date: dl.due_date || '2026-12-31',
          fee: '',
          description: `Imported from ${dl.source}`,
          link: dl.link,
          scope: 'N',
          user_status: 'Interested'
        })
      });

      if (res.ok) {
        // 2. Dismiss from discovery immediately so it "moves"
        await handleDismissDeadline(dl.link);

        // 3. ALSO add to deadlines table so it appears on calendar and top list
        await fetch(`${API_BASE_URL}/deadlines.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: dl.title,
            date: dl.due_date || '2026-12-31',
            description: `Imported from ${dl.source}`,
            link: dl.link,
            location: dl.location || dl.source,
            fee: ''
          })
        });

        // 4. Refresh everything
        fetchShows();
        fetchDeadlines();

        // 5. Trigger AI Scout to fill in missing fields (fees, dates, location)
        if (dl.link) {
          fetch('/api/analyze-prospectus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: dl.link })
          });
        }
      }
    } catch (err) {
      console.error("Error tracking deadline:", err);
    }
  };

  // UI State
  const [isArtworksCollapsed, setIsArtworksCollapsed] = useState(false);
  const [isExpensesCollapsed, setIsExpensesCollapsed] = useState(false);
  const [isDeadlinesCollapsed, setIsDeadlinesCollapsed] = useState(false);
  const [isDiscoveryCollapsed, setIsDiscoveryCollapsed] = useState(false);
  const [isShowsCollapsed, setIsShowsCollapsed] = useState(false);
  const [isLogisticsCollapsed, setIsLogisticsCollapsed] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const getCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month's leading days
    const totalDays = 42; // 6 weeks
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const getShowColor = (title: string) => {
    const colors = [
      'rgba(0, 255, 150, 0.4)', // Green
      'rgba(96, 165, 250, 0.4)', // Blue
      'rgba(255, 157, 0, 0.4)',  // Orange
      'rgba(168, 85, 247, 0.4)', // Purple
      'rgba(236, 72, 153, 0.4)', // Pink
      'rgba(20, 184, 166, 0.4)', // Teal
      'rgba(245, 158, 11, 0.4)'  // Amber
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getCalendarEntries = (date: Date) => {
    const entries: any[] = [];
    const dateStr = date.toISOString().split('T')[0];

    deadlines.forEach(dl => {
      const deadlineDate = dl.date;
      const receiptDate = dl.receipt_date;
      const shipDate = calculateShipBy(receiptDate);
      const showStart = dl.show_start;
      const showEnd = dl.show_end;
      const returnDate = calculateReturnDate(showEnd);

      const isDeadline = dateStr === deadlineDate;
      const isShip = shipDate && dateStr === shipDate;
      const isReceipt = receiptDate && dateStr === receiptDate;
      const isStart = showStart && dateStr === showStart;
      const isEnd = showEnd && dateStr === showEnd;
      const isReturn = returnDate && dateStr === returnDate;

      // Determine if this date is within the full span [Ship Date -> Return Date]
      const spanStart = shipDate || receiptDate || deadlineDate;
      const spanEnd = returnDate || showEnd || deadlineDate;
      const isInSpan = dateStr >= spanStart && dateStr <= spanEnd;

      if (isInSpan) {
        const showColor = getShowColor(dl.title);

        if (dl.submittedArtworks && dl.submittedArtworks.length > 0) {
          dl.submittedArtworks.forEach(art => {
            const status = art.status || 'Pending';
            
            if (status === 'Accepted') {
              // Accepted artwork: show full logistics span and specific events
              entries.push({
                artName: art.title,
                showTitle: dl.title,
                status: status,
                fullDeadline: dl,
                color: showColor,
                isPlaceholder: false,
                eventType: isDeadline ? 'deadline' :
                           isShip ? 'ship' :
                           isReceipt ? 'receipt' :
                           isStart ? 'start' :
                           isEnd ? 'end' :
                           isReturn ? 'return' : 'span'
              });
            } else {
              // Submitted but not accepted: ONLY show the submission deadline
              if (isDeadline) {
                entries.push({
                  artName: art.title,
                  showTitle: dl.title,
                  status: status,
                  fullDeadline: dl,
                  color: showColor,
                  isPlaceholder: false,
                  eventType: 'deadline'
                });
              }
            }
          });
        } else {
          // Placeholder show (no artworks submitted yet) - only show the deadline
          if (isDeadline) {
            entries.push({
              artName: `[ENTRY] ${dl.title}`,
              showTitle: dl.title,
              status: 'Pending',
              fullDeadline: dl,
              color: showColor,
              isPlaceholder: true,
              eventType: 'deadline'
            });
          }
        }
      }
    });

    return entries;
  };

  const [selectedDeadlineId, setSelectedDeadlineId] = useState<number | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) setSearchTerm(q);
      
      const act = params.get('action');
      if (act === 'scan') setIsScanModalOpen(true);
    }

    const handleVoiceSearch = (e: any) => {
      console.log('ArtTracker: Voice Search received:', e.detail);
      setSearchTerm(e.detail);
    };

    const handleVoiceView = (e: any) => {
      console.log('ArtTracker: Voice View received:', e.detail);
      if (e.detail === 'grid' || e.detail === 'list') {
        setViewMode(e.detail);
      }
    };

    const handleOpenScan = () => {
      console.log('ArtTracker: Voice Open Scan received');
      setIsScanModalOpen(true);
    };

    window.addEventListener('art-tracker-search', handleVoiceSearch);
    window.addEventListener('art-tracker-view', handleVoiceView);
    window.addEventListener('open-studio-scan', handleOpenScan);
    return () => {
      window.removeEventListener('art-tracker-search', handleVoiceSearch);
      window.removeEventListener('art-tracker-view', handleVoiceView);
      window.removeEventListener('open-studio-scan', handleOpenScan);
    };
  }, []);

  const [artSearchInModal, setArtSearchInModal] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({key: 'id', direction: 'desc'});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredArtworks = artworks.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         art.medium.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || art.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Modal State - Artworks
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  const [artModalTab, setArtModalTab] = useState<'info' | 'history'>('info');
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isArtworkSelectionPanelOpen, setIsArtworkSelectionPanelOpen] = useState(false);
  const [activeSubmissionDeadline, setActiveSubmissionDeadline] = useState<Deadline | null>(null);
  const [isAnalyzingProspectus, setIsAnalyzingProspectus] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [prospectusData, setProspectusData] = useState<any>(null);

  const handleStartSubmission = async (deadline: Deadline) => {
    setActiveSubmissionDeadline(deadline);
    setArtSearchInModal('');
    setIsSubmissionModalOpen(true);
    if (deadline.link) {
      analyzeProspectus(deadline.link);
    }
  };

  const analyzeProspectus = async (url: string, force: boolean = false) => {
    if (!url) return;

    // Guard: if we already have this data and are just re-checking/updating, don't clear it
    const isSameUrl = prospectusData?.url === url;

    console.log(`[SubmissionAssistant] Analyzing: ${url} (Same URL: ${isSameUrl}, Force: ${force})`);

    setIsAnalyzingProspectus(true);
    if (!isSameUrl || force) {
      setProspectusData(null);
    }

    try {
      const response = await fetch('/api/analyze-prospectus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, force })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const initialData = await response.json();
      console.log(`[SubmissionAssistant] Initial response:`, initialData);

      // If we got the data immediately (cached), use it and stop
      if (initialData.fees || initialData.mediums || initialData.status === 'complete') {
        console.log(`[SubmissionAssistant] Found cached data, finishing.`);
        setProspectusData({ ...initialData, url });
        setIsAnalyzingProspectus(false);
        return;
      }

      if (initialData.requestId) {
        console.log(`[SubmissionAssistant] Request ID ${initialData.requestId} received, starting poll.`);
        // Start polling
        let attempts = 0;
        const poll = setInterval(async () => {
          try {
            attempts++;
            const checkRes = await fetch('/api/analyze-prospectus', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requestId: initialData.requestId, url })
            });

            if (!checkRes.ok) throw new Error(`Polling failed: ${checkRes.status}`);

            const checkData = await checkRes.json();
            if (checkData.status === 'complete' || checkData.fees || checkData.mediums) {
              console.log(`[SubmissionAssistant] Analysis complete after ${attempts}s.`);
              setProspectusData({ ...checkData, url });
              setIsAnalyzingProspectus(false);
              clearInterval(poll);
            } else if (attempts > 120) {
              console.warn('[SubmissionAssistant] Timeout after 120s.');
              setIsAnalyzingProspectus(false);
              clearInterval(poll);
            }
          } catch (pollError) {
            console.error('[SubmissionAssistant] Polling error:', pollError);
            if (attempts > 120) {
              setIsAnalyzingProspectus(false);
              clearInterval(poll);
            }
          }
        }, 1000);
      } else {
        console.warn(`[SubmissionAssistant] No requestId returned.`);
        setIsAnalyzingProspectus(false);
      }
    } catch (error) {
      console.error('[SubmissionAssistant] Fatal error:', error);
      setIsAnalyzingProspectus(false);
      setProspectusData({ error: error instanceof Error ? error.message : 'Failed to analyze prospectus.', url });
    }
  };
  const [isCopying, setIsCopying] = useState<string | null>(null);

  const handleDownloadImages = async () => {
    if (!activeSubmissionDeadline || !activeSubmissionDeadline.submittedArtworks?.length) {
      alert("No artworks linked to this deadline.");
      return;
    }

    setIsPackaging(true);

    const nameParts = artistName.split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : artistName;

    try {
      for (const art of activeSubmissionDeadline.submittedArtworks) {
        const sourceUrl = getResolvedImageUrl(art.imageUrl);
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`;
        console.log(`[SubmissionAssistant] Fetching image via proxy: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const blob = await response.blob();
        
        // Naming template: LastName_Title.extension
        const extension = art.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
        const cleanTitle = art.title.replace(/[^a-z0-9]/gi, '_');
        const filename = `${lastName}_${cleanTitle}.${extension}`;
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }, 1000);
        
        // Small delay to prevent browser download grouping or blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error("Error downloading images:", error);
      alert(`Failed to download images: ${error.message}`);
    } finally {
      setIsPackaging(false);
    }
  };

  const handleCopyStatement = () => {
    const statement = "This body of work explores the intersection of traditional medium and contemporary digital landscapes, focusing on the tactile nature of light and shadow."; // Placeholder or pull from user profile if available
    navigator.clipboard.writeText(statement);
    setIsCopying('statement');
    setTimeout(() => setIsCopying(null), 2000);
  };

  const handleCopyMetadata = () => {
    if (!activeSubmissionDeadline || !activeSubmissionDeadline.submittedArtworks?.length) return;

    const metadata = activeSubmissionDeadline.submittedArtworks.map(art => {
      const fullArt = artworks.find(a => a.id === art.id);
      if (!fullArt) return `${art.title}: Details unknown`;
      return `${fullArt.title}\n${fullArt.medium}\n${fullArt.dimensions}\n$${fullArt.price}\n---`;
    }).join('\n');

    navigator.clipboard.writeText(metadata);
    setIsCopying('metadata');
    setTimeout(() => setIsCopying(null), 2000);
  };

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
    title: '',
    date: new Date().toISOString().split('T')[0],
    receipt_date: '',
    ship_date: '',
    show_start: '',
    show_end: '',
    return_date: '',
    description: '',
    link: '',
    location: '',
    fee: ''
  });

  // Modal State - Shows & Calls
  const [isAddShowOpen, setIsAddShowOpen] = useState(false);
  const [newShow, setNewShow] = useState<Partial<Show>>({
    title: '', location: '', due_date: new Date().toISOString().split('T')[0], fee: '', description: '', link: '', scope: 'L', user_status: 'Interested'
  });

  // Enter Show Modal State
  const [enteringShow, setEnteringShow] = useState<Show | null>(null);
  const [enterLogistics, setEnterLogistics] = useState({
    ship_date: '',
    receipt_date: '',
    return_date: '',
    show_start: '',
    show_end: ''
  });
  const [enterChecklist, setEnterChecklist] = useState({
    feePaid: false,
    confirmationReceived: false,
    deadlineSet: false,
  });
  const [enterFeeAmount, setEnterFeeAmount] = useState('');
  const [enterSelectedArtworks, setEnterSelectedArtworks] = useState<number[]>([]);
  const [enterConfirmationNum, setEnterConfirmationNum] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isWebsiteSyncing, setIsWebsiteSyncing] = useState(false);

  const handleSyncWebsite = async () => {
    setIsWebsiteSyncing(true);
    try {
      const response = await fetch('/api/sync-website', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert("Website artwork sync complete! Changes are pushing to looselytwisted.com.");
      } else {
        alert(`Sync failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Sync error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsWebsiteSyncing(false);
    }
  };

  // Scan Tool State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanCorners, setScanCorners] = useState<{x: number, y: number}[]>([
    {x: 10, y: 10}, {x: 90, y: 10}, {x: 90, y: 90}, {x: 10, y: 90}
  ]);
  const [scanRatio, setScanRatio] = useState<string>('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanArtworkTitle, setScanArtworkTitle] = useState('');

  const handleProcessScan = async () => {
    if (!scanFile) return;
    setIsProcessingScan(true);
    
    // Get natural dimensions of image to convert % corners to pixels
    const img = new Image();
    img.src = scanPreviewUrl!;
    await new Promise(resolve => img.onload = resolve);
    
    const pixelCorners = scanCorners.map(p => ([
      Math.round((p.x / 100) * img.width),
      Math.round((p.y / 100) * img.height)
    ]));

    const formData = new FormData();
    formData.append('image', scanFile);
    formData.append('corners', JSON.stringify(pixelCorners));
    formData.append('ratio', scanRatio || 'None');
    formData.append('title', scanArtworkTitle || 'Untitled');

    try {
      const response = await fetch(`${API_BASE_URL}/scan.php`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        alert(`Success! Hi-Res scan created: ${result.size_readable}`);
        setIsScanModalOpen(false);
        setScanFile(null);
        setScanPreviewUrl(null);
      } else {
        alert(`Error: ${result.error}\n${result.details || ''}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process scan.");
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleUpdateDeadlineStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_deadline_status', id, status })
      });
      if (response.ok) {
        setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status } : d));
        if (activeSubmissionDeadline && activeSubmissionDeadline.id === id) {
          setActiveSubmissionDeadline({ ...activeSubmissionDeadline, status });
        }
      }
    } catch (error) {
      console.error("Error updating deadline status:", error);
    }
  };

  const handleToggleArtworkLink = async (artworkId: number) => {
    if (!activeSubmissionDeadline) return;
    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_submission', deadline_id: activeSubmissionDeadline.id, artwork_id: artworkId })
      });
      if (response.ok) {
        fetchDeadlines();
        // Update local active state too
        const updatedArtworks = activeSubmissionDeadline.submittedArtworks || [];
        const exists = updatedArtworks.find(a => a.id === artworkId);
        
        if (exists) {
          setActiveSubmissionDeadline({
            ...activeSubmissionDeadline,
            submittedArtworks: updatedArtworks.filter(a => a.id !== artworkId)
          });
        } else {
          const fullArt = artworks.find(a => a.id === artworkId);
          if (fullArt) {
            setActiveSubmissionDeadline({
              ...activeSubmissionDeadline,
              submittedArtworks: [...updatedArtworks, { id: fullArt.id, title: fullArt.title, status: 'Pending', imageUrl: fullArt.imageUrl || '' }]
            });
          }
        }
      }
    } catch (err) {
      console.error('Error toggling artwork link:', err);
    }
  };

  const handleUpdateExhibitionStatus = async (deadlineId: number, status: 'Pending' | 'Accepted' | 'Rejected', award: string | null) => {
    if (!editingArtworkId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/deadlines.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_submission',
          deadlineId,
          artworkId: editingArtworkId,
          status,
          award
        })
      });

      if (res.ok) {
        // Update local artwork in the main list
        const updatedExhibitions = (newArtwork.exhibitions || []).map(ex => 
          ex.deadlineId === deadlineId ? { ...ex, status, award } : ex
        );
        const updatedArt = { ...newArtwork, exhibitions: updatedExhibitions };
        setNewArtwork(updatedArt);
        setArtworks(prev => prev.map(art => art.id === editingArtworkId ? { ...art, ...updatedArt } as Artwork : art));

        // Prompt if status is "Accepted"
        if (status === 'Accepted') {
          const autoUpdate = window.confirm(`"${newArtwork.title}" has been Accepted into the show!\n\nWould you like to automatically update its primary status to "Accepted" in the tracker?`);
          if (autoUpdate) {
            // Update artwork's main status to 'Accepted'
            const savedArt = { ...updatedArt, status: 'Accepted' as any };
            setNewArtwork(savedArt);
            setArtworks(prev => prev.map(art => art.id === editingArtworkId ? { ...art, ...savedArt } as Artwork : art));
            
            // Call API to save artwork changes
            await fetch(`${API_BASE_URL}/artworks.php`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: editingArtworkId,
                title: savedArt.title,
                medium: savedArt.medium,
                dimensions: savedArt.dimensions,
                price: savedArt.price,
                imageUrl: savedArt.imageUrl,
                status: 'Accepted',
                location: savedArt.location
              })
            });
          }
        }
      } else {
        console.error('Failed to update exhibition status');
      }
    } catch (err) {
      console.error('Error updating exhibition status:', err);
    }
  };

  const handleMarkSubmitted = async () => {
    if (!activeSubmissionDeadline) return;
    
    const confirm = window.confirm("Mark this submission as complete? This will move it to your 'Submitted' records.");
    if (!confirm) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...activeSubmissionDeadline,
          status: 'Submitted'
        })
      });

      if (response.ok) {
        // Also ensure the corresponding show is marked as 'Entered'
        const show = shows.find(s => s.title === activeSubmissionDeadline.title || (s.link && s.link === activeSubmissionDeadline.link));
        if (show && show.user_status !== 'Entered') {
          await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: show.id, user_status: 'Entered' })
          });
          fetchShows();
        }
        
        fetchDeadlines();
        setIsSubmissionModalOpen(false);
        setActiveSubmissionDeadline(null);
      }
    } catch (err) {
      console.error("Error marking submission as complete:", err);
    }
  };

  const handleMarkAccepted = async (targetDeadline?: Deadline | null) => {
    const deadline = targetDeadline || activeSubmissionDeadline;
    if (!deadline) return;

    const confirmAccept = window.confirm(
      `Congratulations! Mark "${deadline.title}" as Accepted?\n\n` +
      `This will automatically:\n` +
      `1. Update this show's status to "Accepted" in your logs.\n` +
      `2. Update all linked artworks (${deadline.submittedArtworks?.length || 0}) to "Accepted" status in your inventory.`
    );
    if (!confirmAccept) return;

    try {
      // 1. Update the deadline status to 'Accepted'
      const deadlineResponse = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deadline,
          status: 'Accepted'
        })
      });

      if (!deadlineResponse.ok) throw new Error("Failed to update show status.");

      // 2. For each linked artwork, update its status to 'Accepted' in paintings table
      if (deadline.submittedArtworks && deadline.submittedArtworks.length > 0) {
        for (const linkedArt of deadline.submittedArtworks) {
          const fullArt = artworks.find(a => a.id === linkedArt.id);
          if (fullArt) {
            await fetch(`${API_BASE_URL}/artworks.php?t=${Date.now()}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...fullArt,
                status: 'Accepted'
              })
            });
          }
        }
      }

      // 3. Refresh data
      fetchDeadlines();
      fetchArtworks();
      setIsSubmissionModalOpen(false);
      if (!targetDeadline) setActiveSubmissionDeadline(null);
      
      alert(`Success! "${deadline.title}" and linked artworks marked as Accepted. You can now generate your Celebration post from the inventory page! 🏆`);
    } catch (err) {
      console.error("Error marking show as accepted:", err);
      alert("Failed to update status. Check logs.");
    }
  };

  const handleMarkSubmittedDirect = async (dl: Deadline) => {
    const confirm = window.confirm(`Mark "${dl.title}" as complete? This will move it to your 'Submitted' records.`);
    if (!confirm) return;

    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dl,
          status: 'Submitted'
        })
      });

      if (response.ok) {
        const show = shows.find(s => s.title === dl.title || (s.link && s.link === dl.link));
        if (show && show.user_status !== 'Entered') {
          await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: show.id, user_status: 'Entered' })
          });
          fetchShows();
        }
        
        fetchDeadlines();
      }
    } catch (err) {
      console.error("Error marking submission complete:", err);
    }
  };

  const handleSaveAiData = async () => {
    if (!prospectusData || !activeSubmissionDeadline) return;

    try {
      const payload = {
        id: activeSubmissionDeadline.id,
        title: activeSubmissionDeadline.title, // Critical: title is required for PUT
        location: prospectusData.location || activeSubmissionDeadline.location,
        fee: prospectusData.fees || activeSubmissionDeadline.fee,
        description: prospectusData.mediums || activeSubmissionDeadline.description,
        receipt_date: prospectusData.importantDates?.receipt_date || activeSubmissionDeadline.receipt_date,
        ship_date: prospectusData.importantDates?.ship_date || activeSubmissionDeadline.ship_date,
        show_start: prospectusData.importantDates?.show_start || activeSubmissionDeadline.show_start,
        show_end: prospectusData.importantDates?.show_end || activeSubmissionDeadline.show_end,
        return_date: prospectusData.importantDates?.return_date || activeSubmissionDeadline.return_date,
        date: prospectusData.importantDates?.deadline || activeSubmissionDeadline.date,
        status: activeSubmissionDeadline.status // Maintain status
      };

      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("AI data synced to database!");
        fetchDeadlines();
        setIsSubmissionModalOpen(false);
      }
    } catch (err) {
      console.error("Error syncing AI data:", err);
      alert("Failed to sync AI data.");
    }
  };

  const fetchDiscoveryDigest = async () => {
    try {
      const response = await fetch('/api/discovery-digest');
      const data = await response.json();
      setDiscoveryDigest(data);
    } catch (err) {
      console.error("Error fetching discovery digest:", err);
    }
  };

  const fetchProspectusRequests = async () => {
    try {
      const res = await fetch('/api/analyze-prospectus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'list' }) // I'll need to update the route to support a 'list' action
      });
      const data = await res.json();
      if (Array.isArray(data)) setProspectusRequests(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchArtworks();
    fetchCosts();
    fetchDeadlines();
    fetchShows();
    fetchScrapedDeadlines();
    fetchDiscoveryDigest();
    fetchProspectusRequests();

    // Poll for prospectus updates
    const interval = setInterval(fetchProspectusRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchArtworks = async () => {
    setIsLoadingArt(true);
    try {
      const response = await fetch(`${API_BASE_URL}/artworks.php?t=${Date.now()}`);
      const data = await response.json();
      setArtworks(data);
    } catch (err) {
      console.error("Error fetching artworks:", err);
    } finally {
      setIsLoadingArt(false);
    }
  };

  const fetchCosts = async () => {
    setIsLoadingCosts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/costs.php?t=${Date.now()}`);
      const data = await response.json();
      setCosts(data);
    } catch (err) {} finally { setIsLoadingCosts(false); }
  };

  const fetchDeadlines = async () => {
    setIsLoadingDeadlines(true);
    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`);
      const data = await response.json();
      setDeadlines(data);
    } catch (err) {} finally { setIsLoadingDeadlines(false); }
  };

  const fetchShows = async () => {
    setIsLoadingShows(true);
    try {
      const response = await fetch(`${API_BASE_URL}/shows.php?t=${Date.now()}`);
      const data = await response.json();
      setShows(data);
    } catch (err) {} finally { setIsLoadingShows(false); }
  };

  const fetchScrapedDeadlines = async () => {
    try {
      const response = await fetch('/api/art-deadlines');
      const data = await response.json();
      setScrapedDeadlines(data || []);
    } catch (err) {
      console.error("Error fetching scraped deadlines:", err);
    }
  };

  // Helper: Get ship-by date (7 days before receipt)
  const calculateShipBy = (receiptDate?: string) => {
    if (!receiptDate) return null;
    const d = new Date(receiptDate);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };

  // Helper: Get return date (14 days after show end)
  const calculateReturnDate = (showEnd?: string) => {
    if (!showEnd) return null;
    const d = new Date(showEnd);
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  // Artwork Handlers
  const handleSaveArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingArtworkId ? 'PUT' : 'POST';
    const payload = { ...newArtwork };
    if (editingArtworkId) payload.id = editingArtworkId;
    try {
      const response = await fetch(`${API_BASE_URL}/artworks.php?t=${Date.now()}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) { fetchArtworks(); setIsArtModalOpen(false); setEditingArtworkId(null); setNewArtwork({ title: '', medium: '', status: 'In Studio', price: 0, location: '', dimensions: '', imageUrl: '' }); }
    } catch (err) {}
  };

  const handleDeleteArtwork = async (id: number) => {
    if (window.confirm("Delete?")) {
      await fetch(`${API_BASE_URL}/artworks.php?id=${id}`, { method: 'DELETE' });
      fetchArtworks();
    }
  };

  const openEditArtwork = (art: Artwork) => {
    setNewArtwork(art);
    setEditingArtworkId(art.id);
    setArtModalTab('info');
    setIsArtModalOpen(true);
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
    
    // Remove submittedArtworks from payload to keep it clean, though PHP handles it
    if ('submittedArtworks' in payload) delete (payload as any).submittedArtworks;

    try {
      const response = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) { 
        fetchDeadlines(); 
        setIsAddDeadlineOpen(false); 
        setEditingDeadlineId(null); 
        setNewDeadline({ 
          title: '', 
          date: new Date().toISOString().split('T')[0], 
          receipt_date: '', 
          ship_date: '',
          show_start: '', 
          show_end: '', 
          return_date: '',
          description: '', 
          link: '', 
          location: '', 
          fee: '' 
        }); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to save deadline'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to connect to the server.");
    }
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
        if (newStatus === 'Entered' || newStatus === 'Interested') {
          // Check if a deadline with this title and link already exists to prevent duplicates
          const alreadyExists = deadlines.some(d => d.title === show.title && d.link === show.link);

          if (!alreadyExists) {
            await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: show.title,
                date: show.due_date,
                description: show.description,
                link: show.link,
                location: show.location,
                fee: show.fee
              })
            });
            fetchDeadlines();
          }
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
    
    // Find associated deadline to pre-populate logistics
    const targetDeadline = deadlines.find(d => 
      d.title.toLowerCase() === show.title?.toLowerCase() || 
      (d.link && show.link && d.link === show.link)
    );

    if (targetDeadline) {
      setEnterLogistics({
        ship_date: targetDeadline.ship_date || '',
        receipt_date: targetDeadline.receipt_date || '',
        return_date: targetDeadline.return_date || '',
        show_start: targetDeadline.show_start || '',
        show_end: targetDeadline.show_end || ''
      });
    } else {
      setEnterLogistics({
        ship_date: '',
        receipt_date: '',
        return_date: '',
        show_start: '',
        show_end: ''
      });
    }

    // Ensure deadlineSet defaults to true so it always appears in Dynamic Deadlines
    setEnterChecklist({ feePaid: false, confirmationReceived: false, deadlineSet: true });
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

      // 3. Ensure deadline exists and link artworks
      let targetDeadline = deadlines.find(d => 
        d.title.toLowerCase() === enteringShow.title?.toLowerCase() || 
        (d.link && enteringShow.link && d.link === enteringShow.link)
      );

      let deadlineId = targetDeadline?.id;

      if (!targetDeadline) {
        const deadlineResponse = await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: enteringShow.title,
            date: enteringShow.due_date,
            description: enteringShow.description,
            link: enteringShow.link,
            location: enteringShow.location,
            fee: enteringShow.fee,
            status: 'Committed',
            ...enterLogistics
          })
        });

        if (deadlineResponse.ok) {
          const deadlineData = await deadlineResponse.json();
          deadlineId = deadlineData.id;
        }
      } else {
        // Update existing deadline with logistics and mark as Committed
        await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...targetDeadline,
            ...enterLogistics,
            status: 'Committed'
          })
        });
      }

      // Link selected artworks to the deadline (new or existing)
      if (deadlineId && enterSelectedArtworks.length > 0) {
        for (const artworkId of enterSelectedArtworks) {
          await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_submission', deadline_id: deadlineId, artwork_id: artworkId })
          });
        }
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
        if (payload.user_status === 'Interested' || payload.user_status === 'Entered') {
          await fetch(`${API_BASE_URL}/deadlines.php?t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: payload.title,
              date: payload.due_date,
              description: payload.description,
              link: payload.link,
              location: payload.location,
              fee: payload.fee
            })
          });
          fetchDeadlines();
        }
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
          <button 
            onClick={handleSyncWebsite}
            disabled={isWebsiteSyncing}
            className="neo-button no-3d px-3 py-1 rounded-xl text-gray-500 hover:text-blue-500 active:neo-button-active transition-all flex items-center gap-1.5"
            style={{ fontSize: '0.65em', height: '24px' }}
            title="Sync Artworks to looselytwisted.com"
          >
            <span>🎨</span>
            <span>{isWebsiteSyncing ? 'Syncing...' : 'Sync Website'}</span>
          </button>
        </div>

        <nav className={styles.navBar}>
          {[
            {id:'logistics',label:'Logistics',col:'main', title:'Scroll to Exhibition Logistics section'},
            {id:'discovery',label:'Discovery',col:'main', title:'Scroll to Show Discovery section'},
            {id:'shows',    label:'Shows',    col:'main', title:'Scroll to Shows & Calls section'},
            {id:'artworks', label:'Artworks', col:'main', title:'Scroll to Artworks section'},
            {id:'costs',    label:'Costs',    col:'main', title:'Scroll to Cost Tracking section'},
            {id:'roi',      label:'ROI',      col:'main', title:'Scroll to Financial ROI Tracker section'},
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
          <span className={styles.onlineIndicator}>\u25cf</span>
          <span className={styles.artistName}>{artistName}</span>
        </div>
      </header>

      <main className={styles.dashboardMain}>
        <div className={styles.mainColumn}>
          {/* EXHIBITION LOGISTICS SECTION */}
          <section id="logistics" className={styles.mainContentPanel}>
            <div className={styles.collapsibleHeader} onClick={() => setIsLogisticsCollapsed(!isLogisticsCollapsed)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <h2 className={styles.panelTitle} style={{margin: 0}}>Exhibition Logistics {'\uD83D\uDE9B'}</h2>
                <span className={styles.collapseIcon} style={{ transform: isLogisticsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', fontSize: '0.8em' }} title={isLogisticsCollapsed ? 'Expand Logistics' : 'Collapse Logistics'}>{'\u25BC'}</span>
              </div>
            </div>

            {!isLogisticsCollapsed && (
              <div className={styles.collapsibleContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))} className={styles.editButton} style={{ padding: '4px 12px' }}>&larr; Prev</button>
                  <h4 style={{ margin: 0, color: 'var(--color-primary-blue)' }}>
                    {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h4>
                  <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))} className={styles.editButton} style={{ padding: '4px 12px' }}>Next &rarr;</button>
                </div>

                <div className={styles.calendarContainer}>
                  <div className={styles.calendarGrid}>
                    <div className={styles.calendarHeader}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className={styles.dayHeader}>{d}</div>
                      ))}
                    </div>

                    <div className={styles.calendarDays}>
                      {getCalendarDays().map((day, idx) => {
                        const entries = getCalendarEntries(day.date);
                        const isToday = day.date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                        return (
                          <div
                            key={idx}
                            className={`${styles.calendarDay} ${isToday ? styles.today : ''}`}
                            style={{ opacity: day.isCurrentMonth ? 1 : 0.3, border: isToday ? '2px solid var(--color-primary-blue)' : '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <div className={styles.dayNumber} style={{ color: isToday ? 'var(--color-primary-blue)' : 'var(--muted)' }}>{day.date.getDate()}</div>
                            {entries.map((entry, eIdx) => {
                              const isSpanOnly = entry.eventType === 'span';
                              return (
                                <div 
                                  key={eIdx} 
                                  className={styles.calendarEntry}
                                  onClick={() => handleStartSubmission(entry.fullDeadline)}
                                  style={{ 
                                    backgroundColor: isSpanOnly ? entry.color.replace('0.4', '0.15') : entry.color,
                                    borderLeft: `3px solid ${entry.color.replace('0.4', '1')}`,
                                    fontSize: '0.65em',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    marginBottom: '3px',
                                    color: '#fff',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'pointer',
                                    boxShadow: isSpanOnly ? 'none' : '2px 2px 5px rgba(0,0,0,0.2)',
                                    fontStyle: entry.isPlaceholder ? 'italic' : 'normal',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: isSpanOnly ? 0.7 : 1
                                  }}
                                  title={`${entry.artName} - ${entry.showTitle} (${entry.status}) - ${entry.eventType}`}
                                >
                                  {entry.eventType === 'deadline' && <Flag size={10} />}
                                  {entry.eventType === 'ship' && <Truck size={10} />}
                                  {entry.eventType === 'start' && <Play size={10} fill="currentColor" />}
                                  {entry.eventType === 'end' && <Square size={10} fill="currentColor" />}
                                  {entry.eventType === 'return' && <Undo2 size={10} />}
                                  {!['deadline', 'ship', 'start', 'end', 'return'].includes(entry.eventType) && (
                                    <>
                                      {entry.status === 'Accepted' && <Check size={10} strokeWidth={3} />}
                                      {entry.status === 'Pending' && <Clock size={10} strokeWidth={3} />}
                                      {entry.status === 'Rejected' && <AlertCircle size={10} strokeWidth={3} />}
                                    </>
                                  )}
                                  <span>{entry.artName}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.calendarLegend} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', fontSize: '0.65em', color: 'rgba(255,255,255,0.4)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flag size={10} /> Deadline</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={10} /> Ship / Receipt</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Play size={10} fill="currentColor" /> Show Start</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Square size={10} fill="currentColor" /> Show End</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Undo2 size={10} /> Return</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}></div> Exhibition Span</div>
                </div>
              </div>
            )}
          </section>

          <section id="deadlines" className={styles.widgetPanel}>
            <div className={styles.collapsibleHeader} onClick={() => setIsDeadlinesCollapsed(!isDeadlinesCollapsed)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <h3 style={{margin: 0, borderBottom: 'none', paddingBottom: 0, fontSize: '1.2em'}}>Deadlines</h3>
                <span className={styles.collapseIcon} style={{ transform: isDeadlinesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', fontSize: '0.8em' }} title={isDeadlinesCollapsed ? 'Expand Deadlines' : 'Collapse Deadlines'}>\u25bc</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); fetchDeadlines(); }}
                title="Refresh deadlines"
                className="neo-button no-3d p-2.5 rounded-2xl text-gray-400 hover:text-blue-500 active:neo-button-active"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
              >
                <RefreshCw size={16} className={isLoadingDeadlines ? 'animate-spin' : ''} />
              </button>
            </div>

            {!isDeadlinesCollapsed && (
              <div className={styles.collapsibleContent}>
                <div className={styles.spreadsheetContainer} style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className={styles.spreadsheetTable}>
                    <thead>
                      <tr>
                        <th>Actions</th>
                        <th>Title</th>
                        <th>Deadline</th>
                        <th>Location</th>
                        <th>Linked Art</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingDeadlines ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading deadlines...</td></tr>
                      ) : deadlines.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#8899bb', fontStyle: 'italic' }}>No upcoming deadlines.</td></tr>
                      ) : deadlines.map(dl => {
                        const isSelected = selectedDeadlineId === dl.id;
                        return (
                          <React.Fragment key={dl.id}>
                            <tr
                              onClick={() => setSelectedDeadlineId(isSelected ? null : dl.id)}
                              className={isSelected ? styles.activeDeadlineRow : ''}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className={styles.submitButton}
                                    style={{ padding: '4px 8px', fontSize: '0.7em', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', borderRadius: '4px' }}
                                    onClick={() => handleStartSubmission(dl)}
                                    title="Start Submission"
                                  >{'\uD83D\uDE80'}</button>
                                  <button className={styles.editButton} onClick={() => openEditDeadline(dl)} title="Edit">{'\u270F\uFE0F'}</button>
                                  <button className={styles.deleteButton} onClick={() => handleDeleteDeadline(dl.id)} title="Delete">{'\u274C'}</button>
                                </div>
                              </td>
                              <td className={styles.spreadsheetTitleCell}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {dl.title}
                                  {dl.status === 'Submitted' && (
                                    <span style={{ fontSize: '0.65em', background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(255, 215, 0, 0.4)', letterSpacing: '0.05em' }}>
                                      COMMITTED
                                    </span>
                                  )}
                                  {dl.status === 'Accepted' && (
                                    <span style={{ fontSize: '0.65em', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.4)', letterSpacing: '0.05em' }}>
                                      ACCEPTED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{dl.date}</td>
                              <td>{dl.location || 'N/A'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {dl.submittedArtworks && dl.submittedArtworks.length > 0 ? (
                                    dl.submittedArtworks.map(art => (
                                      <img
                                        key={art.id}
                                        src={getResolvedImageUrl(art.imageUrl)}
                                        alt="Art"
                                        title={artworks.find(a => a.id === art.id)?.title || ''}
                                        style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)' }}
                                      />
                                    ))
                                  ) : (
                                    <span style={{ fontSize: '0.7em', color: 'var(--muted)' }}>None</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isSelected && (
                              <tr style={{ background: 'rgba(0, 170, 255, 0.05)' }}>
                                <td colSpan={5} style={{ padding: '15px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {dl.description && (
                                      <p style={{ fontSize: '0.85em', color: 'var(--foreground)', margin: 0 }}>{dl.description}</p>
                                    )}
                                    {dl.link && (
                                      <a href={dl.link} target="_blank" rel="noopener noreferrer" className={styles.showLink} style={{ fontSize: '0.85em' }}>
                                        View Prospectus &rarr;
                                      </a>
                                    )}
                                    <p style={{ fontSize: '0.75em', color: 'var(--muted)', margin: 0, fontStyle: 'italic' }}>
                                      Click on artworks in the "Artworks Overview" section below to link them to this deadline.
                                    </p>
                                    
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
                                      {dl.status !== 'Submitted' && dl.status !== 'Accepted' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMarkSubmittedDirect(dl); }}
                                          className={styles.submitButton}
                                          style={{ padding: '6px 12px', fontSize: '0.75em', margin: 0 }}
                                        >
                                          ✓ Mark Submitted
                                        </button>
                                      )}
                                      {dl.status !== 'Accepted' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleMarkAccepted(dl); }}
                                          className={styles.submitButton}
                                          style={{ padding: '6px 12px', fontSize: '0.75em', background: 'rgba(0, 255, 150, 0.15)', color: '#00ff96', border: '1px solid rgba(0, 255, 150, 0.4)', margin: 0 }}
                                        >
                                          🏆 Mark Accepted
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button className={styles.actionButton} style={{marginTop: '20px', width: '100%', padding: '10px', fontSize: '0.9em'}} onClick={() => { 
                  setEditingDeadlineId(null); 
                  setNewDeadline({ 
                    title: '', 
                    date: new Date().toISOString().split('T')[0], 
                    receipt_date: '', 
                    ship_date: '',
                    show_start: '', 
                    show_end: '', 
                    return_date: '',
                    description: '', 
                    link: '', 
                    location: '', 
                    fee: '' 
                  }); 
                  setIsAddDeadlineOpen(true); 
                }} title="Add a new submission deadline or event">
                  + Add Deadline
                </button>
              </div>
            )}
          </section>

          <div className={styles.splitRow}>
            <div id="discovery" className={styles.widgetPanel}>
              <div className={styles.collapsibleHeader} onClick={() => setIsDiscoveryCollapsed(!isDiscoveryCollapsed)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <h3 className={styles.widgetTitle} style={{margin: 0, borderBottom: 'none'}}>Show Discovery {'\uD83D\uDD0D'}</h3>
                  <span className={styles.collapseIcon} style={{ transform: isDiscoveryCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', fontSize: '0.8em' }} title={isDiscoveryCollapsed ? 'Expand Discovery' : 'Collapse Discovery'}>{'\u25BC'}</span>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsSyncing(true);
                    await fetch('/api/scrape-art-deadlines', { method: 'POST' });
                    fetchScrapedDeadlines();
                    fetchDiscoveryDigest();
                    setIsSyncing(false);
                  }}
                  className="neo-button no-3d p-2.5 rounded-2xl text-gray-400 hover:text-blue-500 active:neo-button-active"
                  style={{ padding: '8px', transition: 'background 0.2s' }}
                  disabled={isSyncing}
                  title="Refresh Discovery"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                </button>
              </div>

              {!isDiscoveryCollapsed && (
                <div className={styles.collapsibleContent}>
                  {discoveryDigest && (
                    <div className={styles.discoveryDigest} style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 170, 255, 0.05)', border: '1px solid rgba(0, 170, 255, 0.2)', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--color-primary-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Rocket size={14} /> Pathfinder Trend Radar
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {discoveryDigest.priorities.length > 0 && (
                          <div style={{ fontSize: '0.8em' }}>
                            <strong style={{ color: '#FFD700', display: 'block', marginBottom: '4px' }}>Priority Targets:</strong>
                            <ul style={{ margin: 0, paddingLeft: '15px' }}>
                              {discoveryDigest.priorities.map((p, i) => (
                                <li key={i}><span style={{ fontWeight: 600 }}>{p.title}:</span> {p.content}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {discoveryDigest.trends.length > 0 && (
                          <div style={{ fontSize: '0.8em' }}>
                            <strong style={{ color: '#00ff96', display: 'block', marginBottom: '4px' }}>Market Trends:</strong>
                            {discoveryDigest.trends.slice(0, 2).map((t, i) => (
                              <div key={i} style={{ marginBottom: '6px' }}>
                                <div style={{ fontWeight: 600, color: '#60a5fa' }}>{t.title}</div>
                                <div style={{ fontSize: '0.9em', color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{t.content}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className={styles.deadlineList} style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {scrapedDeadlines.length === 0 ? (
                      <p style={{ fontSize: '0.8em', color: 'var(--muted)', textAlign: 'center' }}>No new opportunities found tonight.</p>
                    ) : (
                      scrapedDeadlines.map((dl, idx) => (
                        <div key={idx} className={styles.deadlineItem} style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(0,255,255,0.1)' }}>
                          <div className={styles.deadlineActions} style={{ display: 'flex', gap: '8px', width: '100%', paddingBottom: '12px', borderBottom: '1px solid rgba(0, 255, 255, 0.1)' }}>
                            <button
                              onClick={() => handleTrackDeadline(dl)}
                              style={{
                                flex: 2,
                                background: 'rgba(0,255,150,0.1)',
                                border: '1px solid rgba(0,255,150,0.4)',
                                borderRadius: '6px',
                                color: '#00ff96',
                                cursor: 'pointer',
                                fontSize: '0.75em',
                                padding: '6px 12px',
                                fontWeight: 600
                              }}
                              title="Add to Shows & Calls list as 'Interested'"
                            >
                              Track Opportunity
                            </button>
                            <a href={dl.link} target="_blank" rel="noopener noreferrer" className={styles.showLink} style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', fontSize: '0.75em' }}>View</a>
                            <button onClick={() => handleDismissDeadline(dl.link)} className={styles.deleteButton} style={{ padding: '6px 12px', fontSize: '0.75em' }}>{'\u2716'}</button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className={styles.deadlineTitle} style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{dl.title}</div>
                            <div className={styles.showMeta} style={{display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px', fontSize: '0.85em'}}>
                              {dl.location && <span>{'\uD83D\uDCCD'} {dl.location}</span>}
                              {dl.due_date && <span>{'\uD83D\uDCC5'} Deadline: {dl.due_date}</span>}
                              <span style={{ fontSize: '0.85em', color: 'var(--muted)', marginTop: '4px' }}>Source: {dl.source}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <section id="shows" className={styles.showPanel}>
              <div className={styles.collapsibleHeader} onClick={() => setIsShowsCollapsed(!isShowsCollapsed)} style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <h2 className={styles.panelTitle} style={{margin: 0}}>Shows & Calls</h2>
                  <span className={styles.collapseIcon} style={{ transform: isShowsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out', fontSize: '0.8em' }} title={isShowsCollapsed ? 'Expand Shows' : 'Collapse Shows'}>{'\u25BC'}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fetchShows(); }}
                  title="Refresh shows"
                  className="neo-button no-3d p-2.5 rounded-2xl text-gray-400 hover:text-blue-500 active:neo-button-active"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.2s',
                  }}
                >
                  <RefreshCw size={16} className={isLoadingShows ? 'animate-spin' : ''} />
                </button>
              </div>

              {!isShowsCollapsed && (
                <div className={styles.collapsibleContent}>
                  <div className={styles.showList} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {isLoadingShows ?
                      <p title="Retrieving available show and call for entry opportunities.">Fetching opportunities...</p>
                    : (() => {
                        const activeOpportunities = shows.filter(show => {
                          const isProspecting = show.user_status === 'Pending' || show.user_status === 'Interested' || show.user_status === null;
                          const isAlreadyTracked = deadlines.some(d => 
                            d.title.toLowerCase() === show.title.toLowerCase() || 
                            (d.link && show.link && d.link.replace(/\/$/, '') === show.link.replace(/\/$/, ''))
                          );
                          return isProspecting && !isAlreadyTracked;
                        });
                        
                        if (activeOpportunities.length === 0) {
                          return <p style={{color: '#8899bb', fontStyle: 'italic'}} title="No new show or call for entry opportunities were found.">No new opportunities at this time.</p>;
                        }

                        return activeOpportunities.map(show => {
                          const isSelected = selectedShowId === show.id;
                          return (
                            <div 
                              key={show.id} 
                              className={`${styles.showItem} ${isSelected ? styles.activeDeadline : ''}`} 
                              style={{flexDirection: 'column', gap: '12px', padding: '15px', border: '1px solid rgba(0,255,255,0.1)', cursor: 'pointer'}}
                              onClick={() => setSelectedShowId(isSelected ? null : show.id)}
                            >
                          <div className={styles.showActions} style={{marginLeft: 0, flexDirection: 'row', gap: '8px', width: '100%', marginBottom: '5px', paddingBottom: '10px', borderBottom: '1px solid rgba(0, 255, 255, 0.1)'}}>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEnterModal(show); }}
                              style={{
                                flex: 1,
                                background: show.user_status === 'Accepted' ? 'rgba(239, 68, 68, 0.15)' : 
                                           (show.user_status === 'Entered' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0,255,150,0.07)'),
                                border: `1px solid ${show.user_status === 'Accepted' ? 'rgba(239, 68, 68, 0.4)' : 
                                                   (show.user_status === 'Entered' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(0,255,150,0.4)')}`,
                                borderRadius: '6px',
                                color: show.user_status === 'Accepted' ? '#ef4444' : 
                                       (show.user_status === 'Entered' ? '#ffd700' : '#00ff96'),
                                cursor: 'pointer',
                                fontSize: '0.75em',
                                padding: '6px 12px',
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                              }}
                              title={show.user_status === 'Entered' ? 'You have already entered this show' : 'Open modal to confirm entry and record details'}
                            >
                              {show.user_status === 'Accepted' ? '\uD83C\uDFC6 Accepted' : 
                               (show.user_status === 'Entered' ? '\u2705 Committed' : 'Enter')}
                            </button>
                            <label className={styles.showCheckbox} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75em', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} title="Mark this show as 'Not Interested'" htmlFor={`status-hide-${show.id}`} onClick={(e) => e.stopPropagation()}>
                              <input id={`status-hide-${show.id}`} type="radio" name={`status-${show.id}`} checked={show.user_status === 'Not Interested'} onChange={() => handleShowStatusChange(show, 'Not Interested')} /> Hide
                            </label>
                          </div>

                          <div className={styles.showItemLeft}>
                            <div className={styles.showHeader} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <span className={styles.scopeBadge} data-scope={show.scope} title={
                                show.scope === 'L' ? 'Local Opportunity' :
                                show.scope === 'R' ? 'Regional Opportunity' :
                                show.scope === 'N' ? 'National Opportunity' :
                                show.scope === 'I' ? 'International Opportunity' : 'Unknown Scope'
                              }>{show.scope}</span>
                              <span className={styles.showTitle} style={{fontSize: '0.9em', fontWeight: 'bold'}} title="Click for more details about this show/call">{show.title}</span>
                              {prospectusRequests.find(r => r.url === show.link && (r.status === 'pending' || r.status === 'processing')) && (
                                <span style={{
                                  fontSize: '0.6em',
                                  padding: '2px 6px',
                                  borderRadius: '10px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#60a5fa',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid rgba(59, 130, 246, 0.2)',
                                  animation: 'pulse 2s infinite'
                                }}>
                                  <RefreshCw size={8} className="animate-spin" /> Scouting...
                                </span>
                              )}
                            </div>
                            <div className={styles.showMeta} style={{display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '5px', fontSize: '0.85em'}}>
                              <span>{'\uD83D\uDCCD'} {show.location}</span>
                              <span>{'\uD83D\uDCC5'} Deadline: {show.due_date}</span>
                            </div>
                            
                            {!isSelected ? (
                              <div className={styles.showDesc} style={{display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.85em', marginTop: '5px'}}>{show.description}</div>
                            ) : (
                              <div style={{ marginTop: '10px', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{ fontSize: '0.9em', color: 'var(--foreground)', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  {show.description}
                                </div>
                                {show.link && (
                                  <a 
                                    href={show.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={styles.showLink} 
                                    style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 15px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Visit Official Website &rarr;
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {!isSelected && (
                              <button 
                                className={styles.showLink} 
                                style={{ marginTop: '5px', display: 'inline-block', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-primary-blue)', fontWeight: '600' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedShowId(show.id); }}
                              >
                                View Details {'\u2192'}
                              </button>
                            )}
                          </div>
                        </div>
                      )})})()
                    }
                  </div>

                </div>
              )}
            </section>
          </div>

        <section id="artworks" className={styles.mainContentPanel}>
          <div className={styles.collapsibleHeader} onClick={() => setIsArtworksCollapsed(!isArtworksCollapsed)}>
            <h2 className={styles.panelTitle}>Artworks Overview</h2>
            <span className={styles.collapseIcon} style={{ transform: isArtworksCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out' }} title={isArtworksCollapsed ? 'Expand Artworks section' : 'Collapse Artworks section'}>\u25bc</span>
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
              <input
                id="art-search"
                name="art-search"
                type="text"
                placeholder="Search by title or medium..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.filterInput}
                title="Search artworks by title or medium"
              />

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.filterSelect}
                title="Filter by status"
              >
                <option value="All">All Statuses</option>
                <option value="In Studio">In Studio</option>
                <option value="Exhibited">Exhibited</option>
                <option value="Sold">Sold</option>
                <option value="Archived">Archived</option>
              </select>

              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.activeView : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Switch to Image Grid View"
                >
                  {'\uD83D\uDDBC'}
                </button>
                <button
                  className={`${styles.viewToggleButton} ${viewMode === 'list' ? styles.activeView : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Switch to Spreadsheet List View"
                >
                  {'\uD83D\uDCC4'}
                </button>
              </div>
            </div>
            {isLoadingArt ? (<p>Loading artworks database...</p>) : filteredArtworks.length === 0 ? (
              <p style={{color: '#8899bb', fontStyle: 'italic'}} title="No artworks match the current search and filter criteria.">No artworks found matching your criteria.</p>
            ) : viewMode === 'grid' ? (
              <div className={styles.artworkList}>
                {filteredArtworks.map((artwork) => (
                  <div key={artwork.id} className={styles.artworkItem} onClick={() => selectedDeadlineId ? handleToggleSubmission(artwork.id) : openEditArtwork(artwork)}>
                    {selectedDeadlineId && (
                      <div className={styles.artworkCheckbox} title="Link this artwork to the selected deadline">
                        {deadlines.find(d => d.id === selectedDeadlineId)?.submittedArtworks?.some(a => a.id === artwork.id) ? '\u2705' : '\u2B1C'}
                      </div>
                    )}
                    <div className={styles.artworkImageWrapper} title="View detailed artwork information">
                      <img
                        src={getResolvedImageUrl(artwork.imageUrl)}
                        alt={artwork.title}
                        className={styles.artworkImage}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image'; }}
                      />
                    </div>
                    <div className={styles.artworkDetails}>
                      <h3 className={styles.artworkTitle}>{artwork.title}</h3>
                      <p className={styles.artworkMedium}>{artwork.medium}</p>
                      <div className={styles.artworkMeta}>
                        <span 
                          className={styles.artworkStatus} 
                          data-status={artwork.status.toLowerCase()}
                          onClick={(e) => {
                            if ((artwork.status === 'Committed' || artwork.status === 'Accepted') && artwork.committedToShowTitle) {
                              e.stopPropagation();
                              const prefix = artwork.status === 'Accepted' ? 'Accepted to' : 'Submitted to';
                              alert(`${prefix}: ${artwork.committedToShowTitle}`);
                            }
                          }}
                          title={(artwork.status === 'Committed' || artwork.status === 'Accepted') ? `Click to see show info` : ''}
                        >
                          {artwork.status}
                        </span>
                        <span className={styles.artworkPrice}>${artwork.price}</span>
                      </div>
                      <div className={styles.artworkActions}>
                        {artwork.status === 'Accepted' && (
                          <button 
                            className={styles.celebrateButton} 
                            onClick={(e) => { e.stopPropagation(); handleCelebrate(artwork); }} 
                            title="Generate celebration post"
                            disabled={isGeneratingCelebration}
                          >
                            {isGeneratingCelebration ? <RefreshCw className={styles.spin} size={14} /> : <Rocket size={14} />}
                          </button>
                        )}
                        <button className={styles.editButton} onClick={(e) => { e.stopPropagation(); openEditArtwork(artwork); }} title="Edit artwork details">{'\u270F\uFE0F'}</button>
                        <button className={styles.deleteButton} onClick={(e) => { e.stopPropagation(); handleDeleteArtwork(artwork.id); }} title="Delete artwork from database">{'\uD83D\uDDD1'}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.spreadsheetContainer}>
                <table className={styles.spreadsheetTable}>
                  <thead>
                    <tr>
                      <th onClick={() => setSortConfig({key: 'id', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>ID</th>
                      <th onClick={() => setSortConfig({key: 'title', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Title</th>
                      <th>Medium</th>
                      <th>Dimensions</th>
                      <th onClick={() => setSortConfig({key: 'status', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Status</th>
                      <th onClick={() => setSortConfig({key: 'price', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArtworks.map((artwork) => (
                      <tr key={artwork.id}>
                        <td>{artwork.id}</td>
                        <td className={styles.spreadsheetTitleCell}>{artwork.title}</td>
                        <td>{artwork.medium}</td>
                        <td>{artwork.dimensions}</td>
                        <td>
                          <span 
                            className={styles.artworkStatus} 
                            data-status={artwork.status.toLowerCase()}
                            onClick={(e) => {
                              if ((artwork.status === 'Committed' || artwork.status === 'Accepted') && artwork.committedToShowTitle) {
                                e.stopPropagation();
                                const prefix = artwork.status === 'Accepted' ? 'Accepted to' : 'Submitted to';
                                alert(`${prefix}: ${artwork.committedToShowTitle}`);
                              }
                            }}
                            title={(artwork.status === 'Committed' || artwork.status === 'Accepted') ? `Click to see show info` : ''}
                          >
                            {artwork.status}
                          </span>
                        </td>
                        <td>${artwork.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button 
                className={styles.actionButton} 
                style={{ flex: 1, padding: '10px', fontSize: '1em', background: 'rgba(0, 255, 150, 0.1)', border: '1px solid #00ff96' }}
                onClick={() => setIsScanModalOpen(true)}
                title="Process a studio photo into a flat 5K master"
              >
                <Camera size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Studio Scan
              </button>
              <button className={styles.actionButton} style={{ flex: 1, padding: '10px', fontSize: '1em' }} onClick={() => { setEditingArtworkId(null); setNewArtwork({ title: '', medium: '', status: 'In Studio', price: 0, location: '', dimensions: '', imageUrl: '', exhibitions: [] }); setArtModalTab('info'); setIsArtModalOpen(true); }} title="Add a new artwork to your inventory">
                + Add Artwork
              </button>
            </div>
            </div>
          )}
        </section>

        <section id="costs" className={styles.costTrackingPanel}>
          <div className={styles.collapsibleHeader} onClick={() => setIsExpensesCollapsed(!isExpensesCollapsed)}>
            <h2 className={styles.panelTitle}>Expense Tracker</h2>
            <span className={styles.collapseIcon} style={{ transform: isExpensesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease-in-out' }} title={isExpensesCollapsed ? 'Expand Expenses section' : 'Collapse Expenses section'}>\u25bc</span>
          </div>

          {!isExpensesCollapsed && (
            <div className={styles.collapsibleContent}>
            <div className={styles.spreadsheetContainer}>
              <table className={styles.spreadsheetTable}>
                <thead>
                  <tr>
                    <th>Actions</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingCosts ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading expenses...</td></tr>
                  ) : costs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#8899bb', fontStyle: 'italic' }}>No expenses recorded.</td></tr>
                  ) : costs.map(cost => (
                    <tr key={cost.id}>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={styles.editButton} onClick={() => openEditCost(cost)} title="Edit expense">\u270f\ufe0f</button>
                          <button className={styles.deleteButton} onClick={() => handleDeleteCost(cost.id)} title="Delete expense">\ud83d\uddd1\ufe0f</button>
                        </div>
                      </td>
                      <td>{cost.date}</td>
                      <td>{cost.category}</td>
                      <td>{cost.description}</td>
                      <td style={{ color: '#ef4444', fontWeight: 'bold' }}>-${cost.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={styles.actionButton} style={{marginTop: '20px', width: '100%', padding: '10px', fontSize: '1em'}} onClick={() => { setEditingCostId(null); setNewCost({ date: new Date().toISOString().split('T')[0], category: 'Materials', description: '', amount: 0, currency: 'USD' }); setIsAddCostOpen(true); }} title="Record a new business expense">
              + Add Expense
            </button>
            </div>
          )}
        </section>

        <section id="roi" className={styles.roiPanel}>
          <h2 className={styles.panelTitle}>Financial ROI Tracker {'\uD83D\uDCB0'}</h2>
          <div className={styles.roiGrid}>
            <div className={styles.roiCard} title="Total amount spent on materials, fees, and logistics">
              <h3>Total Investment</h3>
              <p className={styles.roiValue} style={{color: '#ef4444'}}>${costs.reduce((sum, c) => sum + Number(c.amount), 0).toFixed(2)}</p>
            </div>
            <div className={styles.roiCard} title="Total potential revenue from artworks currently in studio">
              <h3>Inventory Value</h3>
              <p className={styles.roiValue} style={{color: '#00ff96'}}>${artworks.filter(a => a.status === 'In Studio').reduce((sum, a) => sum + Number(a.price || 0), 0).toFixed(2)}</p>
            </div>
            <div className={styles.roiCard} title="Total revenue from artworks marked as 'Sold'">
              <h3>Realized Sales</h3>
              <p className={styles.roiValue} style={{color: '#3b82f6'}}>${artworks.filter(a => a.status === 'Sold').reduce((sum, a) => sum + Number(a.price || 0), 0).toFixed(2)}</p>
            </div>
          </div>
        </section>
        </div>
      </main>

      {/* MODALS */}
      {isArtModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingArtworkId ? 'Edit Artwork' : 'Add New Artwork'}</h2>
            
            {editingArtworkId && (
              <div className={styles.tabContainer}>
                <button
                  type="button"
                  className={`${styles.tabButton} ${artModalTab === 'info' ? styles.tabButtonActive : ''}`}
                  onClick={() => setArtModalTab('info')}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton} ${artModalTab === 'history' ? styles.tabButtonActive : ''}`}
                  onClick={() => setArtModalTab('history')}
                >
                  Exhibition History
                </button>
              </div>
            )}

            {(!editingArtworkId || artModalTab === 'info') ? (
              <form onSubmit={handleSaveArtwork} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="art-title">Title</label>
                  <input id="art-title" name="art-title" type="text" value={newArtwork.title} onChange={e => setNewArtwork({...newArtwork, title: e.target.value})} required title="Enter the title of the artwork" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="art-medium">Medium</label>
                  <input id="art-medium" name="art-medium" type="text" value={newArtwork.medium} onChange={e => setNewArtwork({...newArtwork, medium: e.target.value})} required title="Enter the materials used (e.g. Oil on Canvas)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className={styles.formGroup}>
                    <label htmlFor="art-price">Price ($)</label>
                    <input id="art-price" name="art-price" type="number" value={newArtwork.price} onChange={e => setNewArtwork({...newArtwork, price: Number(e.target.value)})} required title="Enter the retail price in USD" />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="art-status">Status</label>
                    <select id="art-status" name="art-status" value={newArtwork.status} onChange={e => setNewArtwork({...newArtwork, status: e.target.value as any})} title="Select the current availability of the work">
                      <option value="In Studio">In Studio</option>
                      <option value="Exhibited">Exhibited</option>
                      <option value="Sold">Sold</option>
                      <option value="Archived">Archived</option>
                      <option value="Committed">Committed</option>
                      <option value="Accepted">Accepted</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="art-image">Image URL / Path</label>
                  <input id="art-image" name="art-image" type="text" value={newArtwork.imageUrl} onChange={e => setNewArtwork({...newArtwork, imageUrl: e.target.value})} placeholder="e.g. /images/work1.jpg" title="Enter the path to the artwork's image file" />
                </div>
                <div className={styles.modalActions}>
                  <button type="submit" className={styles.submitButton}>Save Artwork</button>
                  <button type="button" onClick={() => setIsArtModalOpen(false)} className={styles.cancelButton}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!newArtwork.exhibitions || newArtwork.exhibitions.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.95em' }}>
                    No exhibition entries for this artwork yet. Submit this artwork to a show via the Deadlines section to see it here!
                  </div>
                ) : (
                  <div className={styles.timelineContainer}>
                    {newArtwork.exhibitions.map((ex) => (
                      <div key={ex.deadlineId} className={styles.timelineItem}>
                        <div className={styles.timelineIcon}>
                          {ex.status === 'Accepted' ? (
                            <Trophy style={{ color: '#22c55e' }} />
                          ) : (
                            <Calendar />
                          )}
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineHeader}>
                            <span className={styles.timelineTitle}>{ex.showTitle}</span>
                            <select
                              value={ex.status || 'Pending'}
                              onChange={(e) => {
                                const newStatus = e.target.value as 'Pending' | 'Accepted' | 'Rejected';
                                handleUpdateExhibitionStatus(ex.deadlineId, newStatus, ex.award);
                              }}
                              className={`${styles.timelinePill} ${
                                ex.status === 'Accepted' ? styles.timelinePillAccepted :
                                ex.status === 'Rejected' ? styles.timelinePillRejected :
                                styles.timelinePillPending
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Accepted">Accepted</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                          
                          <div className={styles.timelineMeta}>
                            {ex.location && <span>📍 {ex.location}</span>}
                            {ex.dueDate && <span>📅 Due: {ex.dueDate}</span>}
                            {ex.fee && Number(ex.fee) > 0 && <span>💰 Fee: ${ex.fee}</span>}
                            {(ex.showStart || ex.showEnd) && (
                              <span>
                                🏛️ Show: {ex.showStart || 'N/A'} {ex.showEnd ? `to ${ex.showEnd}` : ''}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                            <Award size={16} style={{ color: 'var(--muted)' }} />
                            <input
                              type="text"
                              className={styles.timelineAwardInput}
                              value={ex.award || ''}
                              placeholder="Award / Notes (e.g. Best in Show, First Place)"
                              onChange={(e) => {
                                const updatedExs = (newArtwork.exhibitions || []).map(item => 
                                  item.deadlineId === ex.deadlineId ? { ...item, award: e.target.value } : item
                                );
                                setNewArtwork({ ...newArtwork, exhibitions: updatedExs });
                              }}
                              onBlur={(e) => {
                                handleUpdateExhibitionStatus(ex.deadlineId, ex.status, e.target.value);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className={styles.modalActions} style={{ marginTop: '20px', borderTop: '1px solid var(--neo-border-medium)', paddingTop: '15px' }}>
                  <button type="button" onClick={() => setIsArtModalOpen(false)} className={styles.cancelButton}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAddCostOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingCostId ? 'Edit Expense' : 'Record New Expense'}</h2>
            <form onSubmit={handleSaveCost} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="cost-date">Date</label>
                <input id="cost-date" name="cost-date" type="date" value={newCost.date} onChange={e => setNewCost({...newCost, date: e.target.value})} required title="Select the date the expense occurred" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cost-category">Category</label>
                <select id="cost-category" name="cost-category" value={newCost.category} onChange={e => setNewCost({...newCost, category: e.target.value})} title="Select the type of expense">
                  <option value="Materials">Materials</option>
                  <option value="Studio Rent">Studio Rent</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Show Entry">Show Entry</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cost-desc">Description</label>
                <input id="cost-desc" name="cost-desc" type="text" value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} required title="Enter a brief description of the expense" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cost-amount">Amount ($)</label>
                <input id="cost-amount" name="cost-amount" type="number" step="0.01" value={newCost.amount} onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})} required title="Enter the total cost in USD" />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>Save Expense</button>
                <button type="button" onClick={() => setIsAddCostOpen(false)} className={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddDeadlineOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingDeadlineId ? 'Edit Deadline' : 'Add New Deadline / Event'}</h2>
            <form onSubmit={handleSaveDeadline} className={styles.modalForm}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-title">Title</label>
                  <input id="dl-title" name="dl-title" type="text" value={newDeadline.title || ''} onChange={e => setNewDeadline({...newDeadline, title: e.target.value})} required title="Enter the name of the exhibition or event" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-location">Location</label>
                  <input id="dl-location" name="dl-location" type="text" value={newDeadline.location || ''} onChange={e => setNewDeadline({...newDeadline, location: e.target.value})} title="Enter the venue name or city" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-date">Submission Deadline</label>
                  <input id="dl-date" name="dl-date" type="date" value={newDeadline.date || ''} onChange={e => setNewDeadline({...newDeadline, date: e.target.value})} required title="Select the final date for submissions" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-ship">Ship By</label>
                  <input id="dl-ship" name="dl-ship" type="date" value={newDeadline.ship_date || ''} onChange={e => setNewDeadline({...newDeadline, ship_date: e.target.value})} title="Select the date the artwork must be shipped by" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-receipt">Receipt Date</label>
                  <input id="dl-receipt" name="dl-receipt" type="date" value={newDeadline.receipt_date || ''} onChange={e => setNewDeadline({...newDeadline, receipt_date: e.target.value})} title="Select the date the organization must receive the physical artwork" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-start">Exhibition Start</label>
                  <input id="dl-start" name="dl-start" type="date" value={newDeadline.show_start || ''} onChange={e => setNewDeadline({...newDeadline, show_start: e.target.value})} title="Select the date the exhibition opens to the public" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-end">Exhibition End</label>
                  <input id="dl-end" name="dl-end" type="date" value={newDeadline.show_end || ''} onChange={e => setNewDeadline({...newDeadline, show_end: e.target.value})} title="Select the final day of the exhibition" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="dl-return">Return/Pickup</label>
                  <input id="dl-return" name="dl-return" type="date" value={newDeadline.return_date || ''} onChange={e => setNewDeadline({...newDeadline, return_date: e.target.value})} title="Select the date for pickup or return shipping" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="dl-desc">Description / Mediums</label>
                <textarea id="dl-desc" name="dl-desc" value={newDeadline.description || ''} onChange={e => setNewDeadline({...newDeadline, description: e.target.value})} title="Enter any specific requirements or notes" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="dl-link">Prospectus Link</label>
                <input id="dl-link" name="dl-link" type="text" value={newDeadline.link || ''} onChange={e => setNewDeadline({...newDeadline, link: e.target.value})} title="Enter the URL to the call for artists" />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>Save Deadline</button>
                <button type="button" onClick={() => setIsAddDeadlineOpen(false)} className={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSubmissionModalOpen && activeSubmissionDeadline && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.submissionModal}`}>
            <div className={styles.submissionGrid}>
              {/* Left Column: AI Assistant */}
              <div className={styles.assistantColumn}>
                <div className={styles.assistantHeader} style={{ padding: '8px 12px', gap: '8px' }}>
                  <div style={{ fontSize: '1.2em' }}>\ud83e\uddc1</div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1em', fontWeight: 800, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', lineHeight: 1.1 }}>
                      {activeSubmissionDeadline.title}
                    </h3>
                    <div style={{ margin: '2px 0 0 0', fontSize: '0.65em', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ opacity: 0.8 }}>Submission Assistant</span>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)', opacity: 0.5 }}></span>
                      <span style={{ color: activeSubmissionDeadline.status === 'Submitted' ? '#ffd700' : '#60a5fa', fontWeight: 'bold' }}>
                        {activeSubmissionDeadline.status || 'Pending'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => analyzeProspectus(activeSubmissionDeadline.link!, true)}
                    className={styles.editButton}
                    style={{ padding: '3px 6px', fontSize: '0.65em' }}
                    title="Force refresh AI analysis"
                    disabled={isAnalyzingProspectus}
                  >
                    <RefreshCw size={10} className={isAnalyzingProspectus ? 'animate-spin' : ''} />
                  </button>
                </div>

                {prospectusData && !prospectusData.error ? (
                  <div key="content">
                    <div className={styles.aiInfoSection}>
                      <div className={styles.aiInfoLabel}>Entry Fees</div>
                      <div className={styles.aiInfoValue} style={{ color: '#00ff96' }}>{prospectusData.fees || 'Not found'}</div>
                    </div>

                    <div className={styles.aiInfoSection}>
                      <div className={styles.aiInfoLabel}>Accepted Mediums</div>
                      <div className={styles.aiInfoValue}>{prospectusData.mediums || 'Not specified'}</div>
                    </div>

                    <div className={styles.aiInfoSection}>
                      <div className={styles.aiInfoLabel}>Timeline</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '5px' }}>
                        {prospectusData.importantDates?.deadline && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>Deadline:</span> {prospectusData.importantDates.deadline}
                          </div>
                        )}
                        {prospectusData.importantDates?.ship_date && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>Ship:</span> {prospectusData.importantDates.ship_date}
                          </div>
                        )}
                        {prospectusData.importantDates?.receipt_date && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>{prospectusData.isLocalOnly ? 'Drop off:' : 'Receipt:'}</span> {prospectusData.importantDates.receipt_date}
                          </div>
                        )}
                        {prospectusData.importantDates?.show_start && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>Start:</span> {prospectusData.importantDates.show_start}
                          </div>
                        )}
                        {prospectusData.importantDates?.show_end && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>End:</span> {prospectusData.importantDates.show_end}
                          </div>
                        )}
                        {prospectusData.importantDates?.return_date && (
                          <div className={styles.dateChip}>
                            <span style={{ opacity: 0.5 }}>{prospectusData.isLocalOnly ? 'Pick up:' : 'Return:'}</span> {prospectusData.importantDates.return_date}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.aiInfoSection}>
                      <div className={styles.aiInfoLabel}>Artist Documentation</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                        <button
                          className={styles.actionButton}
                          style={{ width: '100%', margin: 0, padding: '10px', fontSize: '0.85em', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={handleCopyStatement}
                        >
                          {isCopying === 'statement' ? <Check size={16} /> : <Copy size={16} />}
                          {isCopying === 'statement' ? 'Copied!' : 'Copy Statement'}
                        </button>
                        <button
                          className={styles.actionButton}
                          style={{ width: '100%', margin: 0, padding: '10px', fontSize: '0.85em', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={() => {
                            const bio = "Tom Arenberg is a contemporary artist based in New Haven, CT. His work focuses on the intersection of physical and digital spaces, exploring the tactile nature of light through mixed media and generative processes.";
                            navigator.clipboard.writeText(bio);
                            setIsCopying('bio');
                            setTimeout(() => setIsCopying(null), 2000);
                          }}
                        >
                          {isCopying === 'bio' ? <Check size={16} /> : <Copy size={16} />}
                          {isCopying === 'bio' ? 'Copied!' : 'Copy Artist Bio'}
                        </button>
                      </div>
                    </div>

                    <div className={styles.aiInfoSection}>
                      <div className={styles.aiInfoLabel}>Logistics & Forms</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {prospectusData.entryFormUrl && (
                          <a 
                            href={prospectusData.entryFormUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={styles.aiLinkButton}
                          >
                            <ExternalLink size={14} /> Open Entry Form
                          </a>
                        )}
                        <button
                          className={styles.actionButton}
                          style={{ width: '100%', margin: 0, padding: '10px', fontSize: '0.85em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={handleDownloadImages}
                          disabled={isPackaging}
                        >
                          <Download size={16} /> {isPackaging ? 'Downloading...' : 'Download Images'}
                        </button>
                        <button
                          className={styles.actionButton}
                          style={{ width: '100%', margin: 0, padding: '10px', fontSize: '0.85em', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={handleCopyStatement}
                        >
                          {isCopying === 'statement' ? <Check size={16} /> : <Copy size={16} />}
                          {isCopying === 'statement' ? 'Copied!' : 'Copy Artist Statement'}
                        </button>
                        <button
                          className={styles.actionButton}
                          style={{ width: '100%', margin: 0, padding: '10px', fontSize: '0.85em', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          onClick={handleCopyMetadata}
                        >
                          {isCopying === 'metadata' ? <Check size={16} /> : <Copy size={16} />}
                          {isCopying === 'metadata' ? 'Copied!' : 'Copy Artwork Meta'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (isAnalyzingProspectus || !prospectusData) ? (
                <div key="loading" style={{ textAlign: 'center', padding: '60px', flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3em', marginBottom: '20px' }}>\u2699\ufe0f</div>
                  <p style={{ fontSize: '1.1em', fontWeight: 600 }}>Muffin is reading the prospectus...</p>
                  <p style={{ fontSize: '0.85em', color: 'var(--muted)', marginTop: '10px' }}>Finding fees, mediums, and entry forms.</p>
                </div>
              ) : prospectusData && prospectusData.error ? (
                <div key="error" style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                  <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>\u26a0\ufe0f Analysis Interrupted</p>
                  <p style={{ fontSize: '0.85em', margin: 0 }}>{prospectusData.error}</p>
                  <button
                    onClick={() => analyzeProspectus(activeSubmissionDeadline.link!)}
                    style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: 'white', padding: '5px 12px', borderRadius: '6px', fontSize: '0.8em', cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
              </div>

              {/* Right Column: Linked Artworks */}
              <div className={styles.linkedArtColumn}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1em', fontWeight: 700 }}>Linked Artworks</h3>
                  <button 
                    onClick={() => setIsArtworkSelectionPanelOpen(true)}
                    className={styles.addArtworkBtn}
                    title="Link more artworks"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  {(!activeSubmissionDeadline.submittedArtworks || activeSubmissionDeadline.submittedArtworks.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dotted rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '0.8em', color: 'var(--muted)', margin: 0 }}>No artworks linked yet.</p>
                      <button 
                        onClick={() => setIsArtworkSelectionPanelOpen(true)}
                        style={{ marginTop: '10px', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8em', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Browse Artworks &rarr;
                      </button>
                    </div>
                  ) : (
                    activeSubmissionDeadline.submittedArtworks.map(art => (
                      <div key={art.id} className={styles.selectionItem} style={{ padding: '8px', cursor: 'default' }}>
                        <img 
                          src={getResolvedImageUrl(art.imageUrl)} 
                          alt={art.title} 
                          className={styles.selectionThumb} 
                          style={{ width: '40px', height: '40px' }}
                        />
                        <div className={styles.selectionInfo}>
                          <span className={styles.selectionTitle} style={{ fontSize: '0.85em' }}>{art.title || artworks.find(a => a.id === art.id)?.title}</span>
                          <span className={styles.selectionMeta} style={{ fontSize: '0.7em' }}>{art.status || artworks.find(a => a.id === art.id)?.status}</span>
                        </div>
                        <button 
                          onClick={() => handleToggleArtworkLink(art.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', opacity: 0.6 }}
                          title="Unlink artwork"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {activeSubmissionDeadline.submittedArtworks && activeSubmissionDeadline.submittedArtworks.length > 0 && (
                  <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.8em', color: 'var(--muted)' }}>Submission Readiness</span>
                      <span style={{ fontSize: '0.8em', fontWeight: 700, color: '#00ff96' }}>
                        {activeSubmissionDeadline.submittedArtworks.length} {activeSubmissionDeadline.submittedArtworks.length === 1 ? 'Entry' : 'Entries'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '100%', background: '#00ff96', boxShadow: '0 0 10px rgba(0, 255, 150, 0.4)' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions} style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.1)' }}>
              {prospectusData && (
                <button
                  onClick={handleSaveAiData}
                  className={styles.submitButton}
                  style={{ background: 'rgba(0, 255, 150, 0.1)', color: '#00ff96', border: '1px solid #00ff96' }}
                >
                  \ud83d\udce5 Sync AI Data
                </button>
              )}
              
              {activeSubmissionDeadline.status !== 'Submitted' && activeSubmissionDeadline.status !== 'Accepted' && (
                <button
                  onClick={handleMarkSubmitted}
                  className={styles.submitButton}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', marginLeft: prospectusData ? '10px' : '0' }}
                >
                  \u2705 Mark Submitted
                </button>
              )}

              {activeSubmissionDeadline.status !== 'Accepted' && (
                <button
                  onClick={() => handleMarkAccepted()}
                  className={styles.submitButton}
                  style={{ background: 'rgba(0, 255, 150, 0.15)', color: '#00ff96', border: '1px solid rgba(0, 255, 150, 0.4)', marginLeft: '10px' }}
                >
                  🏆 Mark Accepted
                </button>
              )}
              
              <button onClick={() => setIsSubmissionModalOpen(false)} className={styles.cancelButton} style={{ marginLeft: 'auto' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isAddShowOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '700px', maxWidth: '98vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{newShow.id ? 'Edit Show' : 'Add New Show / Call'}</h2>
            <form onSubmit={handleSaveShow} className={styles.modalForm}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div className={styles.formGroup}>
                  <label htmlFor="show-title">Show Title</label>
                  <input id="show-title" name="show-title" type="text" value={newShow.title || ''} onChange={e => setNewShow({...newShow, title: e.target.value})} required title="Enter the name of the exhibition" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="show-location">Location</label>
                  <input id="show-location" name="show-location" type="text" value={newShow.location || ''} onChange={e => setNewShow({...newShow, location: e.target.value})} required title="Enter the venue or organization name" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="show-due-date">Deadline</label>
                  <input id="show-due-date" name="show-due-date" type="date" value={newShow.due_date || ''} onChange={e => setNewShow({...newShow, due_date: e.target.value})} required title="Select the submission deadline date" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="show-fee">Fee</label>
                  <input id="show-fee" name="show-fee" type="text" placeholder="e.g. $35" value={newShow.fee || ''} onChange={e => setNewShow({...newShow, fee: e.target.value})} title="Enter the entry fee amount" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="show-scope">Scope</label>
                  <select id="show-scope" name="show-scope" value={newShow.scope || 'L'} onChange={e => setNewShow({...newShow, scope: e.target.value as any})} title="Select the reach of this exhibition">
                    <option value="L">Local</option>
                    <option value="R">Regional</option>
                    <option value="N">National</option>
                    <option value="I">International</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="show-link">Link</label>
                  <input id="show-link" name="show-link" type="text" value={newShow.link || ''} onChange={e => setNewShow({...newShow, link: e.target.value})} title="Enter the URL for the prospectus or entry form" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="show-desc">Description</label>
                <textarea id="show-desc" name="show-desc" value={newShow.description || ''} onChange={e => setNewShow({...newShow, description: e.target.value})} title="Enter a brief overview of the show" />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>Save Opportunity</button>
                <button type="button" onClick={() => setIsAddShowOpen(false)} className={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {enteringShow && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ width: '600px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Rocket size={24} /> Confirm Entry: {enteringShow.title}
            </h2>

            {enteringShow.link && (
              <div style={{ marginBottom: '20px' }}>
                <a 
                  href={enteringShow.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.actionButton}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px', 
                    background: 'rgba(59, 130, 246, 0.2)', 
                    border: '1px solid #3b82f6',
                    textDecoration: 'none',
                    width: '100%'
                  }}
                >
                  <ExternalLink size={18} /> Go to Entry Form
                </a>
                <p style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: '8px', textAlign: 'center' }}>
                  Open the official prospectus/form to complete your submission externally.
                </p>
              </div>
            )}

            <div className={styles.enterChecklist}>
              <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1.1em' }}>
                  <input
                    type="checkbox"
                    checked={enterChecklist.feePaid}
                    onChange={e => setEnterChecklist({...enterChecklist, feePaid: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  I have paid the entry fee
                </label>
                {enterChecklist.feePaid && (
                  <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }} className="animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label style={{ fontSize: '0.8em', color: 'var(--muted)' }}>Amount Paid ($)</label>
                      <input
                        type="number"
                        value={enterFeeAmount}
                        onChange={e => setEnterFeeAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', marginTop: '5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8em', color: 'var(--muted)' }}>Confirmation #</label>
                      <input
                        type="text"
                        value={enterConfirmationNum}
                        onChange={e => setEnterConfirmationNum(e.target.value)}
                        placeholder="Optional"
                        style={{ width: '100%', marginTop: '5px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginTop: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1.1em' }}>
                  <input
                    type="checkbox"
                    checked={enterChecklist.confirmationReceived}
                    onChange={e => setEnterChecklist({...enterChecklist, confirmationReceived: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  I received a confirmation email
                </label>
              </div>

              {/* Editable Logistics Info */}
              <div className={styles.formGroup} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: '#60a5fa' }}>Logistics Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Ship By</label>
                    <input type="date" value={enterLogistics.ship_date} onChange={e => setEnterLogistics({...enterLogistics, ship_date: e.target.value})} style={{ width: '100%', fontSize: '0.85em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Receipt Deadline</label>
                    <input type="date" value={enterLogistics.receipt_date} onChange={e => setEnterLogistics({...enterLogistics, receipt_date: e.target.value})} style={{ width: '100%', fontSize: '0.85em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Show Start</label>
                    <input type="date" value={enterLogistics.show_start} onChange={e => setEnterLogistics({...enterLogistics, show_start: e.target.value})} style={{ width: '100%', fontSize: '0.85em' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Show End</label>
                    <input type="date" value={enterLogistics.show_end} onChange={e => setEnterLogistics({...enterLogistics, show_end: e.target.value})} style={{ width: '100%', fontSize: '0.85em' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.7em', color: 'var(--muted)' }}>Return/Pickup</label>
                    <input type="date" value={enterLogistics.return_date} onChange={e => setEnterLogistics({...enterLogistics, return_date: e.target.value})} style={{ width: '100%', fontSize: '0.85em' }} />
                  </div>
                </div>
              </div>

              <div className={styles.formGroup} style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', marginTop: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9em' }}>Linked Artworks</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {enterSelectedArtworks.map(id => {
                    const art = artworks.find(a => a.id === id);
                    return (
                      <div key={id} className={styles.artworkChip}>
                        {art?.title}
                        <button onClick={() => setEnterSelectedArtworks(prev => prev.filter(a => a !== id))}>\u00d7</button>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => setIsArtworkSelectionPanelOpen(true)}
                    className={styles.addArtChip}
                  >
                    + Link Art
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions} style={{ marginTop: '30px' }}>
              <button 
                onClick={handleConfirmEntry}
                className={styles.submitButton}
                style={{ flex: 2 }}
              >
                Complete Entry
              </button>
              <button onClick={() => setEnteringShow(null)} className={styles.cancelButton} style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Artwork Selection Slide-out Panel */}
      {isArtworkSelectionPanelOpen && (
        <>
          <div 
            className={styles.selectionPanelOverlay} 
            onClick={() => setIsArtworkSelectionPanelOpen(false)} 
          />
          <div className={styles.artworkSelectionPanel}>
            <div className={styles.selectionPanelHeader}>
              <h3>Select Artwork</h3>
              <button 
                onClick={() => setIsArtworkSelectionPanelOpen(false)}
                className="p-1 hover:bg-black/10 rounded-full transition-colors"
                title="Close panel"
              >
                <Undo2 size={20} />
              </button>
            </div>
            
            <div className={styles.selectionPanelContent}>
              <div className={styles.selectionSearchWrapper}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input 
                  type="text" 
                  placeholder="Search artworks..." 
                  className={styles.selectionSearchInput}
                  value={artSearchInModal}
                  onChange={(e) => setArtSearchInModal(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.selectionGrid}>
                {artworks
                  .filter(art => art.title.toLowerCase().includes(artSearchInModal.toLowerCase()))
                  .map(art => {
                    const isLinked = enteringShow 
                      ? enterSelectedArtworks.includes(art.id)
                      : activeSubmissionDeadline?.submittedArtworks?.some(s => s.id === art.id);
                    
                    return (
                      <div 
                        key={art.id} 
                        className={`${styles.selectionItem} ${isLinked ? styles.selectionItemActive : ''}`}
                        onClick={() => {
                          if (enteringShow) {
                            setEnterSelectedArtworks(prev => 
                              prev.includes(art.id) ? prev.filter(id => id !== art.id) : [...prev, art.id]
                            );
                          } else {
                            handleToggleArtworkLink(art.id);
                          }
                        }}
                      >
                        <img 
                          src={getResolvedImageUrl(art.imageUrl)} 
                          alt={art.title} 
                          className={styles.selectionThumb} 
                        />
                        <div className={styles.selectionInfo}>
                          <span className={styles.selectionTitle}>{art.title}</span>
                          <span className={styles.selectionMeta}>{art.medium} \u2022 {art.dimensions}</span>
                        </div>
                        <div 
                          className={styles.selectionCheckbox}
                          style={{ 
                            background: isLinked ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                            border: isLinked ? 'none' : '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}
                        >
                          {isLinked && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </>
      )}

      <footer className={styles.dashboardFooter}>
        <p className={styles.versionInfo}>MISSION CONTROL v2.4.0-TWISTED</p>
        <p className={styles.disclaimer}>PROACTIVE AGENT INTERFACE // MUFFIN PERSONA ACTIVE</p>
      </footer>

      {/* Studio Scan Modal */}
      {isScanModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '900px', width: '95%' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}><Camera style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Studio Scan Processor</h2>
              <button onClick={() => setIsScanModalOpen(false)} className={styles.closeButton}>\u00d7</button>
            </div>
            
            <div className={styles.modalBody} style={{ display: 'grid', gridTemplateColumns: scanPreviewUrl ? '1fr 1fr' : '1fr', gap: '20px' }}>
              <div className={styles.scanSetup}>
                <div className={styles.formGroup}>
                  <label>1. Upload Studio Photo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setScanFile(file);
                        setScanPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                  />
                </div>

                {scanPreviewUrl && (
                  <>
                    <div className={styles.formGroup}>
                      <label>2. Physical Aspect Ratio (W/H)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="e.g. 1.5 for 24x16"
                          value={scanRatio}
                          onChange={(e) => setScanRatio(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button 
                          className={styles.miniButton}
                          onClick={() => {
                            const dims = prompt("Enter dimensions (e.g. 24x16):");
                            if (dims && dims.includes('x')) {
                              const [w, h] = dims.split('x').map(Number);
                              if (w && h) setScanRatio((w/h).toFixed(2));
                            }
                          }}
                        >
                          Calc
                        </button>
                      </div>
                      <p style={{ fontSize: '0.7em', color: 'var(--muted)', marginTop: '5px' }}>
                        Leave blank to use the visual ratio of your corner points.
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label>3. Artwork Title</label>
                      <input 
                        type="text"
                        placeholder="Uptown"
                        value={scanArtworkTitle}
                        onChange={(e) => setScanArtworkTitle(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9em' }}>Instructions</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8em', color: 'rgba(255,255,255,0.7)' }}>
                        <li>Drag the circles to the 4 outer corners of the frame.</li>
                        <li>Order: Top-Left, Top-Right, Bottom-Right, Bottom-Left.</li>
                        <li>Hit "Process Scan" to generate your 5K master.</li>
                      </ul>
                    </div>
                  </>
                )}
              </div>

              {scanPreviewUrl && (
                <div className={styles.scanPreviewContainer} style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', minHeight: '400px' }}>
                  <img 
                    src={scanPreviewUrl} 
                    alt="Scan Source" 
                    style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.8 }} 
                  />
                  
                  {/* Visual Overlay for Corners */}
                  <svg 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <polygon 
                      points={scanCorners.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="rgba(0, 255, 150, 0.15)"
                      stroke="#00ff96"
                      strokeWidth="0.5"
                    />
                  </svg>

                  {scanCorners.map((corner, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: `${corner.x}%`,
                        top: `${corner.y}%`,
                        width: '24px',
                        height: '24px',
                        background: '#00ff96',
                        border: '2px solid #fff',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        cursor: 'move',
                        zIndex: 10,
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#000',
                        fontWeight: 'bold'
                      }}
                      onMouseDown={(e) => {
                        const container = e.currentTarget.parentElement!;
                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const rect = container.getBoundingClientRect();
                          const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                          const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                          setScanCorners(prev => {
                            const next = [...prev];
                            next[i] = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
                            return next;
                          });
                        };
                        const onMouseUp = () => {
                          window.removeEventListener('mousemove', onMouseMove);
                          window.removeEventListener('mouseup', onMouseUp);
                        };
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalActions} style={{ marginTop: '30px' }}>
              <button 
                onClick={handleProcessScan}
                className={styles.submitButton}
                disabled={!scanFile || isProcessingScan}
                style={{ flex: 2 }}
              >
                {isProcessingScan ? (
                  <><RefreshCw className="animate-spin" size={16} style={{ marginRight: '8px' }} /> Processing 5K Master...</>
                ) : (
                  <>Process Scan & Archive</>
                )}
              </button>
              <button 
                onClick={() => { setIsScanModalOpen(false); setScanFile(null); setScanPreviewUrl(null); }} 
                className={styles.cancelButton} 
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {celebrationData && (
        <div className={styles.modalOverlay} onClick={() => setCelebrationData(null)}>
          <div className={styles.celebrationModal} onClick={e => e.stopPropagation()}>
            <div className={styles.celebrationHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={styles.celebrationIcon}>\ud83e\uddc1</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2em' }}>Celebration Ready!</h2>
                  <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.6 }}>Generated for {celebrationData.artworkTitle}</p>
                </div>
              </div>
              <button className={styles.modalClose} onClick={() => setCelebrationData(null)}>&times;</button>
            </div>
            
            <div className={styles.celebrationBody}>
              <div className={styles.celebrationImagePreview}>
                <img 
                  src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/api/media?path=${encodeURIComponent(celebrationData.imagePath)}`} 
                  alt="Celebration Post" 
                  className={styles.celebrationImg}
                />
              </div>
              
              <div className={styles.celebrationCaptionSection}>
                <label className={styles.captionLabel}>AI-Crafted Caption</label>
                <div className={styles.captionBox}>
                  {celebrationData.caption}
                </div>
                <div className={styles.celebrationActions}>
                  <button 
                    className={styles.copyButton}
                    onClick={() => {
                      navigator.clipboard.writeText(celebrationData.caption);
                      alert('Caption copied!');
                    }}
                  >
                    <Copy size={16} /> Copy Caption
                  </button>
                  <a 
                    href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/api/media?path=${encodeURIComponent(celebrationData.imagePath)}`}
                    download={`${celebrationData.artworkTitle}_celebration.jpg`}
                    className={styles.downloadButton}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={16} /> Download Graphic
                  </a>
                </div>
              </div>
            </div>
            
            <div className={styles.celebrationFooter}>
                <p>Muffin generated this celebration for your acceptance into <strong>{celebrationData.showTitle}</strong>.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add missing helper functions
const getResolvedImageUrl = (path?: string) => {
  if (!path) return 'https://via.placeholder.com/150?text=No+Image';
  if (path.startsWith('http')) return path;
  
  // Normalize path by removing leading '../' which is relative to the PHP API directory
  let cleanPath = path;
  if (cleanPath.startsWith('../')) {
    cleanPath = cleanPath.substring(3);
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  return `/tools/ArtTrackerDashboard/${cleanPath}`;
};

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default Dashboard;
