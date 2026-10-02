/**
 * CIVICFIX - Modern Citizen Problem Reporting Platform
 * Tagline: "See it. Report it. Track it."
 * 
 * Features:
 * - Single-page responsive website with hash-based routing (#home, #report, #success, #my-reports, #track, #nearby, #about)
 * - Persistent state management in localStorage
 * - Dynamic photo upload with instant image preview & quick sample presets
 * - Category picker with 8 selectable cards & visible highlight
 * - Mock GPS location detection with simulated high-accuracy lock
 * - Success screen with Report ID generation
 * - Vertical resolution timeline with dynamic status highlights
 * - Filterable My Reports list with real-time search
 * - Interactive Leaflet map for Kochi civic issues with custom markers and side drawer
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // DEFAULT SEED DATA
  // =========================================================================
  const DEFAULT_REPORTS = [
    {
      id: 'CF10245',
      title: 'Pothole near Main Junction',
      category: 'Pothole',
      icon: '🕳️',
      location: 'Main Junction, Kochi',
      status: 'In Progress',
      time: 'Today, 10:30 AM',
      description: 'Large pothole near the junction causing difficulty for vehicles.',
      image: 'assets/images/pothole.jpg',
      crew: 'Ramesh Nair • KMC Road Maintenance Wing (Order #KMC-419)',
      lastUpdated: 'Today, 10:30 AM',
      coords: { lat: 9.9816, lng: 76.2999 },
      ward: 'Ward 12'
    },
    {
      id: 'CF10231',
      title: 'Broken Streetlight',
      category: 'Broken Streetlight',
      icon: '💡',
      location: 'MG Road, Kochi',
      status: 'Under Review',
      time: 'Yesterday, 4:15 PM',
      description: 'Streetlight fixture broken and wire hanging near bus stop.',
      image: 'assets/images/streetlight.jpg',
      crew: 'Assigned to KSEB Electrical Division (Ernakulam Central)',
      lastUpdated: 'Yesterday, 4:15 PM',
      coords: { lat: 9.9880, lng: 76.2870 },
      ward: 'Ward 15'
    },
    {
      id: 'CF10198',
      title: 'Garbage Overflow',
      category: 'Garbage',
      icon: '🗑️',
      location: 'Bus Stand Road, Kochi',
      status: 'Resolved',
      time: '3 days ago',
      description: 'Commercial waste overflowing onto pedestrian sidewalk.',
      image: 'assets/images/garbage.jpg',
      crew: 'KMC Sanitation Squad - Cleared & Disinfected',
      lastUpdated: '3 days ago',
      coords: { lat: 9.9720, lng: 76.2820 },
      ward: 'Ward 08'
    },
    {
      id: 'CF10185',
      title: 'Drainage Blockage',
      category: 'Drainage',
      icon: '🌊',
      location: 'Civil Station Road, Kochi',
      status: 'Under Review',
      time: '5 days ago',
      description: 'Stormwater drain overflowing into road during monsoon showers.',
      image: 'assets/images/waterleak.jpg',
      crew: 'KMC Stormwater Engineering Division',
      lastUpdated: '5 days ago',
      coords: { lat: 9.9950, lng: 76.3050 },
      ward: 'Ward 21'
    },
    {
      id: 'CF10150',
      title: 'Main Pipeline Burst',
      category: 'Water Leak',
      icon: '🚰',
      location: 'North Avenue, Kochi',
      status: 'Resolved',
      time: '1 week ago',
      description: 'Potable water pipeline leakage causing low pressure.',
      image: 'assets/images/waterleak.jpg',
      crew: 'Kerala Water Authority (KWA) Quick Response Team',
      lastUpdated: '1 week ago',
      coords: { lat: 10.0020, lng: 76.2950 },
      ward: 'Ward 04'
    }
  ];

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const STORAGE_KEY = 'civicfix_reports_v2';
  const STATS_KEY = 'civicfix_stats_v2';
  const REPORT_STATUSES = ['Under Review', 'In Progress', 'Resolved'];
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'civicfix123';
  const ADMIN_SESSION_KEY = 'civicfix_admin_authenticated';

  let state = {
    reports: loadReports(),
    stats: loadStats(),
    activeReportId: 'CF10245',
    activeFilter: 'All',
    searchQuery: '',
    selectedCategory: 'Pothole',
    uploadedPhotoData: 'assets/images/pothole.jpg',
    leafletMap: null,
    mapMarkers: [],
    activeMapMarkerId: 'CF10245',
    currentLocation: 'Main Junction, Kochi',
    currentCoords: { lat: 9.9816, lng: 76.2999 },
    locationMap: null,
    locationMarker: null,
    nearbySearchMarker: null,
    activeLocationSearch: null,
    locationSearchLastRequestAt: 0
  };

  function loadReports() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
    // Default seed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPORTS));
    return [...DEFAULT_REPORTS];
  }

  function saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
    } catch (e) {
      console.warn('Could not save reports to localStorage:', e);
    }
  }

  function loadStats() {
    try {
      const saved = localStorage.getItem(STATS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const defaultStats = { submitted: 1248, resolved: 843, inProgress: 287, underReview: 118 };
    localStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
    return defaultStats;
  }

  function saveStats() {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(state.stats));
    } catch (e) {}
  }

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function getStatusClass(status) {
    if (status === 'Under Review') return 'status-review';
    if (status === 'Resolved') return 'status-resolved';
    return 'status-progress';
  }

  function formatDateTime(date = new Date()) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function createReportId() {
    const highestNumber = state.reports.reduce((highest, report) => {
      const match = /^CF(\d+)$/i.exec(report.id);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);
    return `CF${String(highestNumber + 1).padStart(5, '0')}`;
  }

  function isAdminAuthenticated() {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  // =========================================================================
  // DOM REFERENCES
  // =========================================================================
  const pages = document.querySelectorAll('.page-view');
  const desktopNavItems = document.querySelectorAll('.nav-item');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const btnMobileToggle = document.getElementById('btnMobileToggle');
  const myReportsBadge = document.getElementById('myReportsBadge');
  const mobileReportsCount = document.getElementById('mobileReportsCount');

  // Stats DOM
  const statSubmitted = document.getElementById('statSubmitted');
  const statResolved = document.getElementById('statResolved');
  const statInProgress = document.getElementById('statInProgress');
  const statUnderReview = document.getElementById('statUnderReview');

  // Report Form DOM
  const reportForm = document.getElementById('reportProblemForm');
  const photoFileInput = document.getElementById('photoFileInput');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const uploadPreviewContainer = document.getElementById('uploadPreviewContainer');
  const uploadedImagePreview = document.getElementById('uploadedImagePreview');
  const previewFileNameBadge = document.getElementById('previewFileNameBadge');
  const btnBrowseFile = document.getElementById('btnBrowseFile');
  const btnChangePhoto = document.getElementById('btnChangePhoto');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  const presetPhotoChips = document.querySelectorAll('.btn-preset-chip');
  const categoryCards = document.querySelectorAll('.category-select-card');
  const selectedCategoryInput = document.getElementById('selectedCategoryInput');
  const detectedLocationText = document.getElementById('detectedLocationText');
  const locationSearchInput = document.getElementById('locationSearchInput');
  const btnSearchLocation = document.getElementById('btnSearchLocation');
  const locationSearchResults = document.getElementById('locationSearchResults');
  const reportLocationMap = document.getElementById('reportLocationMap');
  const btnUseCurrentLocation = document.getElementById('btnUseCurrentLocation');
  const locBtnText = document.getElementById('locBtnText');
  const problemDescriptionInput = document.getElementById('problemDescriptionInput');
  const charCountSpan = document.getElementById('charCountSpan');
  const btnFillDemoDesc = document.getElementById('btnFillDemoDesc');
  const submitBtnText = document.getElementById('submitBtnText');
  const submitSpinner = document.getElementById('submitSpinner');

  // Success Screen DOM
  const successReportId = document.getElementById('successReportId');
  const successCategory = document.getElementById('successCategory');
  const successLocation = document.getElementById('successLocation');
  const successStatusBadge = document.getElementById('successStatusBadge');
  const btnSuccessTrack = document.getElementById('btnSuccessTrack');
  const btnSuccessMyReports = document.getElementById('btnSuccessMyReports');
  const btnSuccessHome = document.getElementById('btnSuccessHome');

  // My Reports DOM
  const myReportsList = document.getElementById('myReportsList');
  const filterTabBtns = document.querySelectorAll('.filter-tab-btn');
  const reportSearchInput = document.getElementById('reportSearchInput');
  const countAll = document.getElementById('countAll');
  const countReview = document.getElementById('countReview');
  const countProgress = document.getElementById('countProgress');
  const countResolved = document.getElementById('countResolved');
  const homeRecentReportsGrid = document.getElementById('homeRecentReportsGrid');
  const adminReportsList = document.getElementById('adminReportsList');
  const adminQueueTotal = document.getElementById('adminQueueTotal');
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminStatusFilter = document.getElementById('adminStatusFilter');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminUsernameInput = document.getElementById('adminUsername');
  const adminPasswordInput = document.getElementById('adminPassword');
  const adminLoginError = document.getElementById('adminLoginError');
  const btnAdminLogout = document.getElementById('btnAdminLogout');

  // Track Report DOM
  const trackHeaderId = document.getElementById('trackHeaderId');
  const trackHeaderTitle = document.getElementById('trackHeaderTitle');
  const trackHeaderLocation = document.getElementById('trackHeaderLocation');
  const trackHeaderBadge = document.getElementById('trackHeaderBadge');
  const trackLastUpdated = document.getElementById('trackLastUpdated');
  const trackLookupInput = document.getElementById('trackLookupInput');
  const btnLookupTicket = document.getElementById('btnLookupTicket');
  const trackDetailCategory = document.getElementById('trackDetailCategory');
  const trackDetailLocation = document.getElementById('trackDetailLocation');
  const trackDetailId = document.getElementById('trackDetailId');
  const trackDetailStatus = document.getElementById('trackDetailStatus');
  const trackDetailCrew = document.getElementById('trackDetailCrew');
  const trackDetailDescription = document.getElementById('trackDetailDescription');
  const trackDetailPhoto = document.getElementById('trackDetailPhoto');
  const verticalTimeline = document.getElementById('verticalTimeline');

  // Nearby Map DOM
  const mapChips = document.querySelectorAll('.map-chip');
  const nearbyPlaceSearchInput = document.getElementById('nearbyPlaceSearchInput');
  const btnSearchNearbyPlace = document.getElementById('btnSearchNearbyPlace');
  const nearbyPlaceSearchResults = document.getElementById('nearbyPlaceSearchResults');
  const mapDetailCard = document.getElementById('mapDetailCard');
  const mapCardId = document.getElementById('mapCardId');
  const mapCardIcon = document.getElementById('mapCardIcon');
  const mapCardTitle = document.getElementById('mapCardTitle');
  const mapCardLocation = document.getElementById('mapCardLocation');
  const mapCardStatus = document.getElementById('mapCardStatus');
  const mapCardCoords = document.getElementById('mapCardCoords');
  const mapCardTime = document.getElementById('mapCardTime');
  const btnMapCardViewDetails = document.getElementById('btnMapCardViewDetails');
  const btnMapRecenter = document.getElementById('btnMapRecenter');
  const jumpButtons = document.querySelectorAll('.btn-jump-marker');

  // Toast DOM
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // =========================================================================
  // TOAST UTILITY
  // =========================================================================
  let toastTimer = null;
  function showToast(msg, icon = '✓') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    const iconEl = toastNotification.querySelector('.toast-icon');
    if (iconEl) iconEl.textContent = icon;
    toastNotification.classList.add('show');
    toastTimer = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3200);
  }

  // =========================================================================
  // ROUTING & NAVIGATION
  // =========================================================================
  function navigateTo(targetPage, params = {}) {
    let hash = `#${targetPage}`;
    if (params.id) {
      hash += `?id=${params.id}`;
    }
    window.location.hash = hash;
  }

  function handleRoute() {
    let rawHash = window.location.hash.slice(1) || 'home';
    let [pageName, queryString] = rawHash.split('?');
    
    // Parse query params
    const queryParams = new URLSearchParams(queryString || '');
    const reportIdParam = queryParams.get('id');

    // Default fallback to home
    const validPages = ['home', 'report', 'success', 'my-reports', 'admin-login', 'admin', 'track', 'nearby', 'about'];
    if (!validPages.includes(pageName)) {
      pageName = 'home';
    }

    if (pageName === 'admin' && !isAdminAuthenticated()) {
      window.location.hash = '#admin-login';
      pageName = 'admin-login';
    } else if (pageName === 'admin-login' && isAdminAuthenticated()) {
      window.location.hash = '#admin';
      pageName = 'admin';
    }

    // Switch active page
    pages.forEach(p => {
      if (p.getAttribute('data-page') === pageName) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Update Nav Link highlighting
    desktopNavItems.forEach(item => {
      if (item.getAttribute('data-nav') === pageName || (pageName === 'admin-login' && item.getAttribute('data-nav') === 'admin')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    mobileNavItems.forEach(item => {
      if (item.getAttribute('data-nav') === pageName || (pageName === 'admin-login' && item.getAttribute('data-nav') === 'admin')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile drawer on route
    if (mobileDrawer) {
      mobileDrawer.classList.remove('open');
      if (btnMobileToggle) btnMobileToggle.setAttribute('aria-expanded', 'false');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page-specific initializers
    if (pageName === 'my-reports') {
      renderMyReports();
    } else if (pageName === 'admin') {
      renderAdminReports();
    } else if (pageName === 'report') {
      initLocationPicker();
    } else if (pageName === 'track') {
      const idToTrack = reportIdParam || state.activeReportId || 'CF10245';
      renderTrackPage(idToTrack);
    } else if (pageName === 'nearby') {
      initOrUpdateMap();
    } else if (pageName === 'home') {
      updateHomeStats();
      renderRecentReports();
    }
  }

  window.addEventListener('hashchange', handleRoute);

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = adminUsernameInput.value.trim();
      const password = adminPasswordInput.value;
      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        adminLoginError.textContent = 'Incorrect username or password.';
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
        return;
      }

      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch (error) {
        adminLoginError.textContent = 'Sign in is unavailable because session storage could not be accessed.';
        return;
      }

      adminLoginError.textContent = '';
      adminLoginForm.reset();
      navigateTo('admin');
      showToast('Signed in to the admin queue');
    });
  }

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      try {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      } catch (error) {}
      navigateTo('admin-login');
      showToast('Signed out of the admin queue', 'ℹ️');
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const reports = JSON.parse(event.newValue);
      if (Array.isArray(reports)) {
        state.reports = reports;
        updateHomeStats();
        handleRoute();
      }
    } catch (error) {
      console.warn('Could not sync reports from another tab:', error);
    }
  });

  // Mobile menu toggle
  if (btnMobileToggle) {
    btnMobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      btnMobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // =========================================================================
  // STATS & COUNTERS
  // =========================================================================
  function updateHomeStats() {
    if (statSubmitted) statSubmitted.textContent = state.stats.submitted.toLocaleString();
    if (statResolved) statResolved.textContent = state.stats.resolved.toLocaleString();
    if (statInProgress) statInProgress.textContent = state.stats.inProgress.toLocaleString();
    if (statUnderReview) statUnderReview.textContent = state.stats.underReview.toLocaleString();

    if (myReportsBadge) myReportsBadge.textContent = state.reports.length;
    if (mobileReportsCount) mobileReportsCount.textContent = state.reports.length;
  }

  function renderRecentReports() {
    if (!homeRecentReportsGrid) return;
    const recentReports = state.reports.slice(0, 3);
    const latestReport = recentReports[0];
    if (latestReport) {
      const heroStatus = document.getElementById('heroPreviewStatus');
      const heroId = document.getElementById('heroPreviewId');
      const heroCategory = document.getElementById('heroPreviewCategory');
      const heroTitle = document.getElementById('heroPreviewTitle');
      const heroLocation = document.getElementById('heroPreviewLocation');
      const heroUpdated = document.getElementById('heroPreviewUpdated');
      const heroProgress = document.getElementById('heroPreviewProgress');
      const heroTrackLink = document.querySelector('.preview-track-link');
      const statusIndex = ['Submitted', ...REPORT_STATUSES].indexOf(latestReport.status);

      if (heroStatus) {
        heroStatus.className = `preview-badge-status ${getStatusClass(latestReport.status)}`;
        heroStatus.innerHTML = `<span class="status-pulse-dot"></span> ${escapeHTML(latestReport.status)}`;
      }
      if (heroId) heroId.textContent = latestReport.id;
      if (heroCategory) heroCategory.textContent = `${latestReport.icon} ${latestReport.category}`;
      if (heroTitle) heroTitle.textContent = latestReport.title;
      if (heroLocation) heroLocation.textContent = `📍 ${latestReport.location}`;
      if (heroUpdated) heroUpdated.textContent = `Updated ${latestReport.lastUpdated || latestReport.time || 'recently'}`;
      if (heroTrackLink) heroTrackLink.href = `#track?id=${encodeURIComponent(latestReport.id)}`;
      const heroImage = document.getElementById('heroPreviewImg');
      if (heroImage) {
        heroImage.src = latestReport.image || 'assets/images/pothole.jpg';
        heroImage.alt = latestReport.title;
      }
      if (heroProgress) {
        heroProgress.querySelectorAll('.mini-bar').forEach((bar, index) => {
          bar.className = index < statusIndex ? 'mini-bar filled' : index === statusIndex ? 'mini-bar active' : 'mini-bar';
        });
      }
    }

    homeRecentReportsGrid.innerHTML = recentReports.map(report => `
      <div class="report-card">
        <div class="report-card-media">
          <img src="${escapeHTML(report.image || 'assets/images/pothole.jpg')}" alt="${escapeHTML(report.title)}" class="report-card-img">
          <span class="report-badge-id">${escapeHTML(report.id)}</span>
        </div>
        <div class="report-card-body">
          <div class="report-status-row">
            <span class="status-chip ${getStatusClass(report.status)}">
              <span class="status-pulse-dot"></span> ${escapeHTML(report.status)}
            </span>
            <span class="report-category-pill">${escapeHTML(report.icon)} ${escapeHTML(report.category)}</span>
          </div>
          <h3 class="report-card-heading">${escapeHTML(report.title)}</h3>
          <p class="report-card-location">📍 ${escapeHTML(report.location)}</p>
          <div class="report-card-actions">
            <a href="#track?id=${encodeURIComponent(report.id)}" class="btn btn-sm btn-primary">Track Report</a>
          </div>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // REPORT FORM: PHOTO UPLOAD & PREVIEW
  // =========================================================================
  function setPhotoPreview(src, filename = 'pothole.jpg') {
    state.uploadedPhotoData = src;
    uploadedImagePreview.src = src;
    previewFileNameBadge.textContent = filename;
    uploadPlaceholder.style.display = 'none';
    uploadPreviewContainer.style.display = 'block';
  }

  function clearPhotoPreview() {
    state.uploadedPhotoData = null;
    uploadedImagePreview.src = '';
    photoFileInput.value = '';
    uploadPlaceholder.style.display = 'block';
    uploadPreviewContainer.style.display = 'none';
    presetPhotoChips.forEach(chip => chip.classList.remove('active'));
  }

  // Preset sample buttons for quick 1-click live demo
  presetPhotoChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      presetPhotoChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const imgSrc = chip.getAttribute('data-img');
      const cat = chip.getAttribute('data-cat');
      const fileName = imgSrc.split('/').pop();
      setPhotoPreview(imgSrc, fileName);

      // Also auto-select matching category
      if (cat) {
        selectCategory(cat);
      }
      showToast(`Selected demo sample: ${cat}`);
    });
  });

  // Click upload zone opens file dialog
  btnBrowseFile.addEventListener('click', (e) => {
    e.stopPropagation();
    photoFileInput.click();
  });

  uploadDropzone.addEventListener('click', (e) => {
    if (uploadPlaceholder.style.display !== 'none') {
      photoFileInput.click();
    }
  });

  btnChangePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    photoFileInput.click();
  });

  btnRemovePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    clearPhotoPreview();
    showToast('Photo removed', 'ℹ️');
  });

  // Real File Input Change
  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result, file.name);
        showToast('Photo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  });

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(name => {
    uploadDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    uploadDropzone.addEventListener(name, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadDropzone.classList.remove('drag-over');
    });
  });

  uploadDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result, file.name);
        showToast('Photo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  });

  // Default pre-loaded photo for instant demo
  setPhotoPreview('assets/images/pothole.jpg', 'pothole.jpg');

  // =========================================================================
  // REPORT FORM: CATEGORY SELECTION
  // =========================================================================
  function selectCategory(categoryName) {
    state.selectedCategory = categoryName;
    selectedCategoryInput.value = categoryName;

    categoryCards.forEach(card => {
      if (card.getAttribute('data-category') === categoryName) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-category');
      selectCategory(cat);
    });
  });

  // =========================================================================
  // REPORT FORM: LOCATION SEARCH & PICKER
  // =========================================================================
  function setReportLocation(label, lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    state.currentLocation = label;
    state.currentCoords = { lat: latitude, lng: longitude };
    detectedLocationText.textContent = label;
    const coordsText = document.getElementById('detectedCoordsSub');
    if (coordsText) coordsText.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    if (state.locationMap) {
      if (state.locationMarker) {
        state.locationMarker.setLatLng([latitude, longitude]);
      } else {
        state.locationMarker = L.marker([latitude, longitude]).addTo(state.locationMap);
      }
      state.locationMap.setView([latitude, longitude], 16, { animate: true });
    }
  }

  function initLocationPicker() {
    if (!reportLocationMap || state.locationMap || typeof L === 'undefined') return;

    state.locationMap = L.map(reportLocationMap, {
      center: [state.currentCoords.lat, state.currentCoords.lng],
      zoom: 15,
      scrollWheelZoom: false
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19
    }).addTo(state.locationMap);
    state.locationMarker = L.marker([state.currentCoords.lat, state.currentCoords.lng]).addTo(state.locationMap);
    state.locationMap.on('click', event => {
      const { lat, lng } = event.latlng;
      setReportLocation(`Map location (${lat.toFixed(5)}, ${lng.toFixed(5)})`, lat, lng);
    });
    setTimeout(() => state.locationMap.invalidateSize(), 150);
  }

  async function searchOpenStreetMapPlaces(query) {
    if (state.activeLocationSearch) state.activeLocationSearch.abort();
    state.activeLocationSearch = new AbortController();
    const controller = state.activeLocationSearch;
    const waitMs = Math.max(0, 1100 - (Date.now() - state.locationSearchLastRequestAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    if (controller.signal.aborted) throw new DOMException('Search cancelled', 'AbortError');

    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'in'
    });
    state.locationSearchLastRequestAt = Date.now();
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error('Place search is temporarily unavailable.');
    return response.json();
  }

  async function searchReportLocations() {
    const query = locationSearchInput.value.trim();
    if (query.length < 3) {
      locationSearchResults.textContent = 'Enter at least 3 characters to search.';
      return;
    }

    locationSearchResults.textContent = 'Searching OpenStreetMap...';
    btnSearchLocation.disabled = true;

    try {
      const results = await searchOpenStreetMapPlaces(query);
      locationSearchResults.replaceChildren();

      if (!results.length) {
        locationSearchResults.textContent = 'No matching places found. Try a nearby landmark or street.';
        return;
      }

      results.forEach(result => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'location-result-option';
        option.textContent = result.display_name;
        option.addEventListener('click', () => {
          setReportLocation(result.display_name, result.lat, result.lon);
          locationSearchResults.replaceChildren();
          locationSearchInput.value = result.display_name;
        });
        locationSearchResults.append(option);
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        locationSearchResults.textContent = error.message || 'Could not search places. Check your connection and try again.';
      }
    } finally {
      btnSearchLocation.disabled = false;
    }
  }

  async function searchNearbyPlaces() {
    const query = nearbyPlaceSearchInput.value.trim();
    if (query.length < 3) {
      nearbyPlaceSearchResults.textContent = 'Enter at least 3 characters to search.';
      return;
    }

    nearbyPlaceSearchResults.textContent = 'Searching OpenStreetMap...';
    btnSearchNearbyPlace.disabled = true;
    try {
      const results = await searchOpenStreetMapPlaces(query);
      nearbyPlaceSearchResults.replaceChildren();
      if (!results.length) {
        nearbyPlaceSearchResults.textContent = 'No matching places found. Try a nearby landmark or street.';
        return;
      }

      results.forEach(result => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'location-result-option';
        option.textContent = result.display_name;
        option.addEventListener('click', () => {
          const latitude = Number(result.lat);
          const longitude = Number(result.lon);
          if (state.nearbySearchMarker) {
            state.nearbySearchMarker.setLatLng([latitude, longitude]);
          } else {
            state.nearbySearchMarker = L.marker([latitude, longitude], { title: result.display_name })
              .addTo(state.leafletMap);
          }
          state.nearbySearchMarker.bindPopup(escapeHTML(result.display_name)).openPopup();
          state.leafletMap.setView([latitude, longitude], 15, { animate: true });
          nearbyPlaceSearchInput.value = result.display_name;
          nearbyPlaceSearchResults.replaceChildren();
        });
        nearbyPlaceSearchResults.append(option);
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        nearbyPlaceSearchResults.textContent = error.message || 'Could not search places. Check your connection and try again.';
      }
    } finally {
      btnSearchNearbyPlace.disabled = false;
    }
  }

  btnSearchLocation.addEventListener('click', searchReportLocations);
  locationSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchReportLocations();
    }
  });

  btnSearchNearbyPlace.addEventListener('click', searchNearbyPlaces);
  nearbyPlaceSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchNearbyPlaces();
    }
  });

  btnUseCurrentLocation.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Location services are not supported by this browser', '⚠️');
      return;
    }

    locBtnText.textContent = 'Finding location...';
    btnUseCurrentLocation.disabled = true;
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;
      setReportLocation(`Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`, latitude, longitude);
      locBtnText.textContent = 'Use Current Location';
      btnUseCurrentLocation.disabled = false;
      showToast('Current location selected');
    }, () => {
      locBtnText.textContent = 'Use Current Location';
      btnUseCurrentLocation.disabled = false;
      showToast('Could not access your location. Search for a place instead.', '⚠️');
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // =========================================================================
  // REPORT FORM: DESCRIPTION COUNTER & DEMO RESET
  // =========================================================================
  problemDescriptionInput.addEventListener('input', () => {
    const len = problemDescriptionInput.value.length;
    charCountSpan.textContent = `${len} characters`;
  });

  btnFillDemoDesc.addEventListener('click', () => {
    problemDescriptionInput.value = 'Large pothole near the junction causing difficulty for vehicles.';
    charCountSpan.textContent = `${problemDescriptionInput.value.length} characters`;
    showToast('Reset to demo description');
  });

  // =========================================================================
  // REPORT FORM: SUBMISSION HANDLER
  // =========================================================================
  reportForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const desc = problemDescriptionInput.value.trim();
    if (!desc) {
      showToast('Please enter a description of the problem', '⚠️');
      problemDescriptionInput.focus();
      return;
    }

    // Button loading state
    submitBtnText.style.display = 'none';
    submitSpinner.style.display = 'inline-block';

    setTimeout(() => {
      submitBtnText.style.display = 'inline-block';
      submitSpinner.style.display = 'none';

      const newId = createReportId();
      const submittedAt = formatDateTime();
      const category = state.selectedCategory || 'Pothole';
      const catIcons = {
        'Pothole': '🕳️',
        'Broken Streetlight': '💡',
        'Garbage': '🗑️',
        'Drainage': '🌊',
        'Water Leak': '🚰',
        'Damaged Footpath': '🚶',
        'Public Facility': '🏢',
        'Other': '❓'
      };

      const newReport = {
        id: newId,
        title: `${category} near ${state.currentLocation.split(',').slice(0, 2).join(',')}`,
        category: category,
        icon: catIcons[category] || '📍',
        location: state.currentLocation,
        status: 'Under Review',
        time: submittedAt,
        statusHistory: [{ status: 'Under Review', updatedAt: submittedAt }],
        description: desc,
        image: state.uploadedPhotoData || 'assets/images/pothole.jpg',
        crew: 'Ramesh Nair • KMC Road Maintenance Wing (Order #KMC-419)',
        lastUpdated: submittedAt,
        coords: { ...state.currentCoords },
        ward: 'Ward 12'
      };

      state.reports.unshift(newReport);

      saveReports();

      // Increment stats
      state.stats.submitted += 1;
      state.stats.underReview += 1;
      saveStats();
      updateHomeStats();

      state.activeReportId = newId;

      // Populate Success Screen
      successReportId.textContent = newId;
      successCategory.textContent = category;
      successLocation.textContent = state.currentLocation;
      successStatusBadge.className = `status-chip ${getStatusClass(newReport.status)}`;
      successStatusBadge.innerHTML = `<span class="status-pulse-dot"></span> ${newReport.status}`;

      // Route to Success Screen
      navigateTo('success');
      showToast(`Report #${newId} logged successfully!`);
    }, 400);
  });

  // Success Screen action buttons
  btnSuccessTrack.addEventListener('click', () => {
    navigateTo('track', { id: state.activeReportId });
  });

  btnSuccessMyReports.addEventListener('click', () => {
    navigateTo('my-reports');
  });

  btnSuccessHome.addEventListener('click', () => {
    navigateTo('home');
  });

  // =========================================================================
  // MY REPORTS PAGE: RENDERING & FILTERS
  // =========================================================================
  function renderMyReports() {
    const filter = state.activeFilter;
    const query = state.searchQuery.toLowerCase();

    // Compute counts
    const allCount = state.reports.length;
    const reviewCount = state.reports.filter(r => r.status === 'Under Review').length;
    const progressCount = state.reports.filter(r => r.status === 'In Progress').length;
    const resolvedCount = state.reports.filter(r => r.status === 'Resolved').length;

    if (countAll) countAll.textContent = allCount;
    if (countReview) countReview.textContent = reviewCount;
    if (countProgress) countProgress.textContent = progressCount;
    if (countResolved) countResolved.textContent = resolvedCount;

    // Filter reports
    let filtered = state.reports.filter(r => {
      const matchFilter = (filter === 'All' || r.status === filter);
      const matchSearch = (!query || 
        r.title.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.location.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query)
      );
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      myReportsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 18px; border: 1px dashed var(--slate-300);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">📁</div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--slate-800);">No Reports Found</h3>
          <p style="color: var(--slate-500); margin: 6px 0 20px;">No civic issues match your current filter or search criteria.</p>
          <button class="btn btn-outline" onclick="resetMyReportsFilters()">Reset Filters</button>
        </div>
      `;
      return;
    }

    myReportsList.innerHTML = filtered.map(r => {
      let statusClass = 'status-progress';
      let dotColor = 'dot-progress';
      if (r.status === 'Under Review') {
        statusClass = 'status-review';
        dotColor = 'dot-review';
      } else if (r.status === 'Resolved') {
        statusClass = 'status-resolved';
        dotColor = 'dot-resolved';
      }

      return `
        <div class="report-card">
          <div class="report-card-media">
            <img src="${escapeHTML(r.image || 'assets/images/pothole.jpg')}" alt="${escapeHTML(r.title)}" class="report-card-img" onerror="this.src='assets/images/pothole.jpg'">
            <span class="report-badge-id">${escapeHTML(r.id)}</span>
          </div>
          <div class="report-card-body">
            <div class="report-status-row">
                <span class="status-chip ${statusClass}">
                <span class="status-pulse-dot"></span> ${escapeHTML(r.status)}
              </span>
              <span class="report-category-pill">${escapeHTML(r.icon)} ${escapeHTML(r.category)}</span>
            </div>
            <h3 class="report-card-heading">${escapeHTML(r.title)}</h3>
            <p class="report-card-location">📍 ${escapeHTML(r.location)}</p>
            <div class="report-card-actions">
              <button type="button" class="btn btn-sm btn-primary btn-block" onclick="viewTicketTrack('${escapeHTML(r.id)}')">
                Track Report
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAdminReports() {
    if (!adminReportsList) return;
    const query = adminSearchInput ? adminSearchInput.value.trim().toLowerCase() : '';
    const statusFilter = adminStatusFilter ? adminStatusFilter.value : 'All';
    const filteredReports = state.reports.filter(report => {
      const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
      const searchableText = [report.id, report.title, report.location, report.category, report.description]
        .join(' ')
        .toLowerCase();
      return matchesStatus && (!query || searchableText.includes(query));
    });

    if (adminQueueTotal) {
      adminQueueTotal.textContent = `${state.reports.length} ${state.reports.length === 1 ? 'report' : 'reports'}`;
    }

    if (filteredReports.length === 0) {
      adminReportsList.innerHTML = '<div class="admin-empty-state">No reports match this search or status.</div>';
      return;
    }

    adminReportsList.innerHTML = filteredReports.map(report => `
      <article class="admin-report-row">
        <div class="admin-report-summary">
          <img class="admin-report-image" src="${escapeHTML(report.image || 'assets/images/pothole.jpg')}" alt="">
          <div class="admin-report-copy">
            <div class="admin-report-meta">
              <span class="admin-report-id">${escapeHTML(report.id)}</span>
              <span class="report-category-pill">${escapeHTML(report.icon)} ${escapeHTML(report.category)}</span>
            </div>
            <h2 class="admin-report-title">${escapeHTML(report.title)}</h2>
            <p class="admin-report-location">📍 ${escapeHTML(report.location)}${report.ward ? ` · ${escapeHTML(report.ward)}` : ''}</p>
            <p class="admin-report-description">${escapeHTML(report.description || 'No description provided.')}</p>
            <a class="admin-track-link" href="#track?id=${encodeURIComponent(report.id)}">View citizen tracking</a>
          </div>
        </div>
        <div class="admin-report-controls">
          <span class="status-chip ${getStatusClass(report.status)}">
            <span class="status-pulse-dot"></span> ${escapeHTML(report.status)}
          </span>
          <label class="sr-only" for="admin-status-${escapeHTML(report.id)}">New status for ${escapeHTML(report.title)}</label>
          <select class="admin-select admin-status-select" id="admin-status-${escapeHTML(report.id)}" data-report-id="${escapeHTML(report.id)}">
            ${REPORT_STATUSES.map(status => `<option value="${status}"${report.status === status ? ' selected' : ''}>${status}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm btn-primary admin-save-status" data-report-id="${escapeHTML(report.id)}">Update status</button>
        </div>
      </article>
    `).join('');
  }

  function updateReportStatus(reportId, status) {
    if (!REPORT_STATUSES.includes(status)) return;
    const report = state.reports.find(item => item.id === reportId);
    if (!report || report.status === status) {
      showToast(report ? 'Report already has this status' : 'Report not found', 'ℹ️');
      return;
    }

    const updatedAt = formatDateTime();
    report.status = status;
    report.lastUpdated = updatedAt;
    if (!Array.isArray(report.statusHistory)) report.statusHistory = [];
    report.statusHistory.push({ status, updatedAt });
    saveReports();
    renderAdminReports();
    updateHomeStats();
    showToast(`${report.id} updated to ${status}`);
  }

  if (adminReportsList) {
    adminReportsList.addEventListener('click', (event) => {
      const button = event.target.closest('.admin-save-status');
      if (!button) return;
      const reportId = button.getAttribute('data-report-id');
      const select = Array.from(adminReportsList.querySelectorAll('.admin-status-select'))
        .find(item => item.getAttribute('data-report-id') === reportId);
      if (select) updateReportStatus(reportId, select.value);
    });
  }

  if (adminSearchInput) adminSearchInput.addEventListener('input', renderAdminReports);
  if (adminStatusFilter) adminStatusFilter.addEventListener('change', renderAdminReports);

  // Filter Buttons
  filterTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-filter');
      renderMyReports();
    });
  });

  // Search input
  if (reportSearchInput) {
    reportSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderMyReports();
    });
  }

  window.resetMyReportsFilters = () => {
    state.activeFilter = 'All';
    state.searchQuery = '';
    if (reportSearchInput) reportSearchInput.value = '';
    filterTabBtns.forEach(b => {
      if (b.getAttribute('data-filter') === 'All') b.classList.add('active');
      else b.classList.remove('active');
    });
    renderMyReports();
  };

  window.viewTicketTrack = (ticketId) => {
    navigateTo('track', { id: ticketId });
  };

  // =========================================================================
  // TRACK REPORT PAGE: TIMELINE & DETAILS
  // =========================================================================
  function renderTrackPage(reportId) {
    const report = state.reports.find(r => r.id.toUpperCase() === reportId.toUpperCase()) || state.reports[0];
    if (!report) return;

    state.activeReportId = report.id;
    if (trackLookupInput) trackLookupInput.value = report.id;

    // Header
    trackHeaderId.textContent = `Report #${report.id}`;
    trackHeaderTitle.textContent = report.title;
    trackHeaderLocation.textContent = `📍 ${report.location}`;
    trackLastUpdated.textContent = `Last updated: ${report.lastUpdated || 'Today, 10:30 AM'}`;

    // Header Status Badge
    const statusClass = getStatusClass(report.status);
    trackHeaderBadge.className = `status-chip status-chip-lg ${statusClass}`;
    trackHeaderBadge.innerHTML = `<span class="status-pulse-dot"></span> ${report.status}`;

    // Report Details Card
    trackDetailCategory.textContent = `${report.icon} ${report.category}`;
    trackDetailLocation.textContent = report.location;
    trackDetailId.textContent = report.id;
    trackDetailStatus.textContent = report.status;
    trackDetailCrew.textContent = report.crew || 'Assigned to KMC Public Works';
    trackDetailDescription.textContent = report.description || 'Civic infrastructure complaint filed.';
    trackDetailPhoto.src = report.image || 'assets/images/pothole.jpg';

    // Vertical Timeline Dynamic Update
    renderVerticalTimeline(report.status, report);
  }

  function renderVerticalTimeline(currentStatus, report) {
    const stepSubmitted = document.getElementById('stepSubmitted');
    const conn1 = document.getElementById('conn1');
    const stepUnderReview = document.getElementById('stepUnderReview');
    const conn2 = document.getElementById('conn2');
    const stepInProgress = document.getElementById('stepInProgress');
    const conn3 = document.getElementById('conn3');
    const stepResolved = document.getElementById('stepResolved');

    if (!stepSubmitted || !stepInProgress || !stepResolved) return;

    stepSubmitted.querySelector('.step-note').textContent = `Civic issue logged into CivicFix digital portal. Assigned unique ticket #${report.id}.`;
    stepUnderReview.querySelector('.step-note').textContent = 'Report details and location are under municipal review.';
    stepInProgress.querySelector('.step-note').textContent = `Work assigned: ${report.crew || 'KMC Public Works'}.`;
    stepResolved.querySelector('.step-note').textContent = 'Resolution has been recorded for this report.';

    // Reset classes
    [stepSubmitted, stepUnderReview, stepInProgress, stepResolved].forEach(step => {
      step.className = 'timeline-step step-pending';
      const badge = step.querySelector('.step-badge-current');
      if (badge) badge.remove();
    });

    [conn1, conn2, conn3].forEach(conn => {
      conn.className = 'timeline-connector connector-pending';
    });

    // Step 1 is always completed
    stepSubmitted.className = 'timeline-step step-completed';
    stepSubmitted.querySelector('.step-marker').innerHTML = '<span class="step-icon">✓</span>';

    if (currentStatus === 'Submitted') {
      addCurrentBadge(stepSubmitted);
      stepUnderReview.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
      stepInProgress.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
      stepResolved.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
    } 
    else if (currentStatus === 'Under Review') {
      conn1.className = 'timeline-connector connector-completed';
      stepUnderReview.className = 'timeline-step step-active';
      stepUnderReview.querySelector('.step-marker').className = 'step-marker marker-amber';
      stepUnderReview.querySelector('.step-marker').innerHTML = '<span class="step-icon">🔵</span>';
      addCurrentBadge(stepUnderReview);

      stepInProgress.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
      stepResolved.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
    } 
    else if (currentStatus === 'In Progress') {
      // Step 1 Completed ✓
      conn1.className = 'timeline-connector connector-completed';
      // Step 2 Completed ✓
      stepUnderReview.className = 'timeline-step step-completed';
      stepUnderReview.querySelector('.step-marker').innerHTML = '<span class="step-icon">✓</span>';
      conn2.className = 'timeline-connector connector-completed';
      // Step 3 Active 🟡
      stepInProgress.className = 'timeline-step step-active';
      stepInProgress.querySelector('.step-marker').className = 'step-marker marker-amber';
      stepInProgress.querySelector('.step-marker').innerHTML = '<span class="step-icon">🟡</span>';
      addCurrentBadge(stepInProgress);

      stepResolved.querySelector('.step-marker').innerHTML = '<span class="step-icon">○</span>';
    } 
    else if (currentStatus === 'Resolved') {
      conn1.className = 'timeline-connector connector-completed';
      stepUnderReview.className = 'timeline-step step-completed';
      stepUnderReview.querySelector('.step-marker').innerHTML = '<span class="step-icon">✓</span>';
      conn2.className = 'timeline-connector connector-completed';
      stepInProgress.className = 'timeline-step step-completed';
      stepInProgress.querySelector('.step-marker').innerHTML = '<span class="step-icon">✓</span>';
      conn3.className = 'timeline-connector connector-completed';
      stepResolved.className = 'timeline-step step-completed';
      stepResolved.querySelector('.step-marker').innerHTML = '<span class="step-icon">✓</span>';
      addCurrentBadge(stepResolved, 'Resolved');
    }

    const stages = [
      { status: 'Submitted', step: stepSubmitted },
      { status: 'Under Review', step: stepUnderReview },
      { status: 'In Progress', step: stepInProgress },
      { status: 'Resolved', step: stepResolved }
    ];
    const currentStageIndex = Math.max(0, stages.findIndex(stage => stage.status === currentStatus));
    const history = new Map((report.statusHistory || []).map(entry => [entry.status, entry.updatedAt]));
    stages.forEach((stage, index) => {
      const timestamp = stage.step.querySelector('.step-timestamp');
      if (!timestamp) return;
      if (index === 0) {
        timestamp.textContent = report.time ? `Reported ${report.time}` : 'Report submitted';
      } else if (index > currentStageIndex) {
        timestamp.textContent = 'Awaiting update';
      } else if (history.has(stage.status)) {
        timestamp.textContent = `Updated ${history.get(stage.status)}`;
      } else if (index === currentStageIndex) {
        timestamp.textContent = `Last updated ${report.lastUpdated || 'recently'}`;
      } else {
        timestamp.textContent = 'Completed';
      }
    });
  }

  function addCurrentBadge(stepEl, text = 'Current Status') {
    const header = stepEl.querySelector('.step-header');
    if (header && !header.querySelector('.step-badge-current')) {
      const badge = document.createElement('span');
      badge.className = 'step-badge-current';
      badge.textContent = text;
      const title = header.querySelector('.step-title');
      if (title) title.after(badge);
    }
  }

  // Ticket Lookup bar
  if (btnLookupTicket) {
    btnLookupTicket.addEventListener('click', () => {
      const id = trackLookupInput.value.trim().toUpperCase();
      if (id) {
        navigateTo('track', { id });
      }
    });
  }

  if (trackLookupInput) {
    trackLookupInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const id = trackLookupInput.value.trim().toUpperCase();
        if (id) navigateTo('track', { id });
      }
    });
  }

  // =========================================================================
  // NEARBY PROBLEMS PAGE: INTERACTIVE LEAFLET MAP
  // =========================================================================
  function initOrUpdateMap() {
    const mapContainer = document.getElementById('civicLeafletMap');
    if (!mapContainer) return;

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      mapContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 12px; color: var(--slate-700);">
          <span style="font-size: 3rem;">🗺️</span>
          <h3>Kochi Civic Interactive Map</h3>
          <p>Leaflet mapping engine active. Showing 5 local community issue pins.</p>
        </div>
      `;
      return;
    }

    if (!state.leafletMap) {
      // Kochi Main Junction coordinates
      const kochiCoords = [9.9816, 76.2999];
      state.leafletMap = L.map('civicLeafletMap', {
        center: kochiCoords,
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        maxZoom: 19
      }).addTo(state.leafletMap);
    }

    // Refresh size in case tab was hidden
    setTimeout(() => {
      if (state.leafletMap) state.leafletMap.invalidateSize();
    }, 200);

    renderMapMarkers('All');
  }

  function renderMapMarkers(filterCategory = 'All') {
    if (!state.leafletMap || typeof L === 'undefined') return;

    // Clear existing markers
    state.mapMarkers.forEach(m => state.leafletMap.removeLayer(m));
    state.mapMarkers = [];

    // Filter reports
    const reportsToShow = state.reports.filter(r => {
      if (!r.coords) return false;
      if (filterCategory === 'All') return true;
      return r.category.toLowerCase().includes(filterCategory.toLowerCase());
    });

    reportsToShow.forEach(r => {
      let pinClass = 'pin-progress';
      if (r.status === 'Under Review') pinClass = 'pin-review';
      else if (r.status === 'Resolved') pinClass = 'pin-resolved';

      const customIcon = L.divIcon({
        className: 'custom-civic-pin-wrapper',
        html: `<div class="custom-civic-pin ${pinClass}" data-id="${r.id}" title="${r.title}">${r.icon}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([r.coords.lat, r.coords.lng], { icon: customIcon }).addTo(state.leafletMap);

      // Popup
      const popupContent = `
        <div style="font-family: var(--font-family); min-width: 180px; padding: 4px;">
          <strong style="font-size: 1rem; color: var(--slate-900); display: block;">${r.icon} ${r.title}</strong>
          <span style="font-size: 0.82rem; color: var(--slate-500); display: block; margin: 2px 0 8px;">📍 ${r.location}</span>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 8px; border-radius: 9999px;">${r.status}</span>
            <a href="#track?id=${r.id}" style="font-size: 0.8rem; font-weight: 700; color: #0d9488; text-decoration: none;">View Details →</a>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        selectMapReport(r.id);
      });

      state.mapMarkers.push(marker);
    });

    // Default select active marker
    selectMapReport(state.activeMapMarkerId || 'CF10245');
  }

  function selectMapReport(reportId) {
    const report = state.reports.find(r => r.id === reportId) || state.reports[0];
    if (!report) return;

    state.activeMapMarkerId = report.id;

    if (mapCardId) mapCardId.textContent = report.id;
    if (mapCardIcon) mapCardIcon.textContent = report.icon;
    if (mapCardTitle) mapCardTitle.textContent = report.title;
    if (mapCardLocation) mapCardLocation.textContent = report.location;

    if (mapCardStatus) {
      let statusClass = 'status-progress';
      if (report.status === 'Under Review') statusClass = 'status-review';
      else if (report.status === 'Resolved') statusClass = 'status-resolved';
      mapCardStatus.className = `status-chip ${statusClass}`;
      mapCardStatus.innerHTML = `<span class="status-pulse-dot"></span> ${report.status}`;
    }

    if (mapCardCoords && report.coords) {
      mapCardCoords.textContent = `${report.coords.lat}° N, ${report.coords.lng}° E`;
    }
    if (mapCardTime) mapCardTime.textContent = report.time || 'Today, 10:30 AM';
    if (btnMapCardViewDetails) {
      btnMapCardViewDetails.href = `#track?id=${report.id}`;
    }

    // Smoothly pan map to this report
    if (state.leafletMap && report.coords) {
      state.leafletMap.panTo([report.coords.lat, report.coords.lng], { animate: true });
    }
  }

  // Filter chips on nearby page
  mapChips.forEach(chip => {
    chip.addEventListener('click', () => {
      mapChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-mapfilter');
      renderMapMarkers(cat);
    });
  });

  // Quick jump buttons in sidebar
  jumpButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const markerId = btn.getAttribute('data-marker-id');
      selectMapReport(markerId);
    });
  });

  // Recenter map button
  if (btnMapRecenter) {
    btnMapRecenter.addEventListener('click', () => {
      if (state.leafletMap) {
        state.leafletMap.setView([9.9816, 76.2999], 14, { animate: true });
        showToast('Map recentered to Kochi Main Junction');
      }
    });
  }

  // =========================================================================
  // INITIAL BOOTSTRAP
  // =========================================================================
  updateHomeStats();
  handleRoute();

  console.log('CivicFix Platform initialized successfully. Ready for demonstration.');
});
