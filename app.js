// ===================================================================================
// APPLICATION LOGIC
// ===================================================================================

const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const authCard = document.getElementById('auth-card');
const mainContent = document.getElementById('main-content');
const addJobForm = document.getElementById('add-job-form');
const clearFormBtn = document.getElementById('clear-form-btn');
const refreshButton = document.getElementById('refresh-button');
const loader = document.getElementById('loader');
const jobsListContainer = document.getElementById('jobs-list-container');
const searchBar = document.getElementById('search-bar');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const userProfileDiv = document.getElementById('user-profile');
const userNameP = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');

let gapiInited = false;
let gisInited = false;
let tokenClient;
let timelineChart;
let rowToDelete = null;
let allJobsData = [];


function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile',
        callback: tokenCallback,
    });
    gisInited = true;
    trySilentAuth();
}

function gapiLoaded() {
    gapi.load('client', () => {
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4", "https://people.googleapis.com/$discovery/rest?version=v1"],
        }).then(() => {
            gapiInited = true;
            trySilentAuth();
        });
    });
}

function trySilentAuth() {
    if (gapiInited && gisInited) {
        tokenClient.requestAccessToken({ prompt: 'none' });
    }
}

async function tokenCallback(resp) {
    if (resp.error !== undefined) {
        updateSigninStatus(false);
        return;
    }
    updateSigninStatus(true);
    await displayUserProfile();
    await fetchAndRenderJobs();
}

function handleAuthClick() {
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        updateSigninStatus(false);
    }
}

function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        authCard.style.display = 'none';
        userProfileDiv.style.display = 'flex';
        mainContent.style.display = 'block';
    } else {
        authCard.style.display = 'block';
        userProfileDiv.style.display = 'none';
        mainContent.style.display = 'none';
    }
}

async function displayUserProfile() {
    try {
        const response = await gapi.client.people.people.get({
            resourceName: 'people/me',
            personFields: 'names,photos',
        });
        const profile = response.result;
        const primaryName = profile.names && profile.names.length > 0 ? profile.names[0].givenName : 'User';
        const primaryPhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0].url : `https://placehold.co/40x40/E0E7FF/4F46E5?text=${primaryName.charAt(0)}`;

        userNameP.textContent = `Hello, ${primaryName}!`;
        userPhotoImg.src = primaryPhoto;

    } catch (err) {
        console.error("Error fetching user profile:", err);
        userNameP.textContent = 'Hello, User!';
        userPhotoImg.src = 'https://placehold.co/40x40/E0E7FF/4F46E5?text=U';
    }
}

async function fetchAndRenderJobs() {
    loader.style.display = 'block';
    jobsListContainer.innerHTML = '';
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });
        const range = response.result;
        if (range.values && range.values.length > 1) {
            allJobsData = range.values.slice(1).map((row, index) => [...row, index + 2]);
            console.log('Loaded applications:', allJobsData.length);
            console.log('Sample dates from sheet:', allJobsData.slice(0, 5).map(r => r[2]));
        } else {
            allJobsData = [];
        }
    } catch (err) {
        console.error(err);
        alert('Error loading data. Check console.');
    } finally {
        loader.style.display = 'none';
        renderJobs();
        populateDatalists();
    }
}

// Populate datalists for jobName, company and portal from allJobsData
function populateDatalists() {
    const jobNameList = document.getElementById('jobNameList');
    const companyList = document.getElementById('companyList');
    const portalList = document.getElementById('portalList');

    const names = new Set();
    const companies = new Set();
    const portals = new Set();

    allJobsData.forEach(row => {
        if (row[0]) names.add(row[0]);
        if (row[1]) companies.add(row[1]);
        if (row[3]) portals.add(row[3]);
    });

    // Clear existing options
    jobNameList.innerHTML = '';
    companyList.innerHTML = '';
    portalList.innerHTML = '';

    // Append options sorted alphabetically for readability
    Array.from(names).sort().forEach(n => {
        const o = document.createElement('option'); o.value = n; jobNameList.appendChild(o);
    });
    Array.from(companies).sort().forEach(c => {
        const o = document.createElement('option'); o.value = c; companyList.appendChild(o);
    });
    Array.from(portals).sort().forEach(p => {
        const o = document.createElement('option'); o.value = p; portalList.appendChild(o);
    });
}

// Simple autocomplete using datalist values as source
function setupAutocomplete(inputId, datalistId, suggestionsId) {
    const input = document.getElementById(inputId);
    const datalist = document.getElementById(datalistId);
    const suggestions = document.getElementById(suggestionsId);

    const updateSuggestions = () => {
        const val = input.value.toLowerCase();
        const options = Array.from(datalist.options || []).map(o => o.value).filter(v => v && v.toLowerCase().includes(val));
        suggestions.innerHTML = '';
        if (!options.length || !val) { suggestions.style.display = 'none'; return; }
        options.slice(0, 8).forEach(opt => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = opt;
            div.addEventListener('click', () => { input.value = opt; suggestions.style.display = 'none'; });
            suggestions.appendChild(div);
        });
        suggestions.style.display = 'block';
    };

    input.addEventListener('input', updateSuggestions);
    input.addEventListener('blur', () => { setTimeout(() => suggestions.style.display = 'none', 150); });
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('keydown', (e) => {
        const items = suggestions.querySelectorAll('.autocomplete-item');
        if (!items.length) return;
        const active = suggestions.querySelector('.autocomplete-item.active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!active) { items[0].classList.add('active'); return; }
            const next = active.nextSibling || items[0]; active.classList.remove('active'); next.classList.add('active');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!active) { items[items.length - 1].classList.add('active'); return; }
            const prev = active.previousSibling || items[items.length - 1]; active.classList.remove('active'); prev.classList.add('active');
        } else if (e.key === 'Enter') {
            if (active) { e.preventDefault(); input.value = active.textContent; suggestions.style.display = 'none'; }
        }
    });
}

// Toggle collapse/expand of the Add Job form
document.getElementById('toggle-form-btn').addEventListener('click', () => {
    const body = document.getElementById('add-job-form-body');
    const btn = document.getElementById('toggle-form-btn');
    if (body.classList.contains('form-expanded')) {
        body.classList.remove('form-expanded');
        body.classList.add('form-collapsed');
        btn.textContent = 'Expand';
    } else {
        body.classList.remove('form-collapsed');
        body.classList.add('form-expanded');
        btn.textContent = 'Collapse';
    }
});

// Initialize autocompletes after datalists are populated
const initAutocompletes = () => {
    setupAutocomplete('jobName', 'jobNameList', 'jobName-suggestions');
    setupAutocomplete('jobCompany', 'companyList', 'company-suggestions');
    setupAutocomplete('jobPortal', 'portalList', 'portal-suggestions');
};

// Ensure autocompletes are bound after DOM is ready
window.addEventListener('load', () => {
    initAutocompletes();
});

function renderJobs() {
    const searchTerm = (searchBar.value || '').toLowerCase().trim();
    const filteredJobs = allJobsData.filter(row => {
        if (!searchTerm) return true; // no filter
        const jobName = (row[0] || '').toLowerCase();
        const company = (row[1] || '').toLowerCase();
        const appliedDate = (row[2] || '').toLowerCase();
        const portal = (row[3] || '').toLowerCase();
        const status = (row[4] || '').toLowerCase();
        const updatedDate = (row[5] || '').toLowerCase();
        const rowIndex = String(row[6] || '').toLowerCase();

        // match if any field contains the search term
        return jobName.includes(searchTerm)
            || company.includes(searchTerm)
            || appliedDate.includes(searchTerm)
            || portal.includes(searchTerm)
            || status.includes(searchTerm)
            || updatedDate.includes(searchTerm)
            || rowIndex.includes(searchTerm);
    });

    // Sort by updated date (col 5 / index 5) desc, then application date (col 2), then row index
    filteredJobs.sort((a, b) => {
        const updatedA = a[5] ? new Date(a[5]) : null;
        const updatedB = b[5] ? new Date(b[5]) : null;
        if (updatedA && updatedB) {
            if (updatedB - updatedA !== 0) return updatedB - updatedA;
        } else if (updatedA && !updatedB) {
            return -1; // a is newer
        } else if (!updatedA && updatedB) {
            return 1; // b is newer
        }

        const appliedA = a[2] ? new Date(a[2]) : null;
        const appliedB = b[2] ? new Date(b[2]) : null;
        if (appliedA && appliedB) {
            if (appliedB - appliedA !== 0) return appliedB - appliedA;
        } else if (appliedA && !appliedB) {
            return -1;
        } else if (!appliedA && appliedB) {
            return 1;
        }

        // Finally, fallback to sheet row index (higher index is newer entry)
        const rowIndexA = parseInt(a[6]) || 0;
        const rowIndexB = parseInt(b[6]) || 0;
        return rowIndexB - rowIndexA;
    });

    jobsListContainer.innerHTML = '';

    renderListView(filteredJobs);

    updateCharts(filteredJobs);
    // store last filtered jobs for export convenience
    window._lastFilteredJobs = filteredJobs.map(row => ({
        jobName: row[0] || '',
        company: row[1] || '',
        appliedDate: row[2] || '',
        portal: row[3] || '',
        status: row[4] || '',
        updatedDate: row[5] || '',
        sheetRow: row[6] || ''
    }));
}

function renderListView(jobs) {
    if (jobs.length > 0) {
        jobs.forEach(row => {
            const sheetRowIndex = row[6];
            const status = row[4] || 'N/A';

            let borderColorClass, selectBgClass, selectTextClass, selectBorderClass;
            switch (status) {
                case 'Interviewed':
                    borderColorClass = 'border-l-yellow-400';
                    selectBgClass = 'bg-yellow-100';
                    selectTextClass = 'text-yellow-800';
                    selectBorderClass = 'border-yellow-300';
                    break;
                case 'Offer':
                    borderColorClass = 'border-l-green-400';
                    selectBgClass = 'bg-green-100';
                    selectTextClass = 'text-green-800';
                    selectBorderClass = 'border-green-300';
                    break;
                case 'Rejected':
                    borderColorClass = 'border-l-red-400';
                    selectBgClass = 'bg-red-100';
                    selectTextClass = 'text-red-800';
                    selectBorderClass = 'border-red-300';
                    break;
                case 'Applied':
                    borderColorClass = 'border-l-blue-400';
                    selectBgClass = 'bg-blue-100';
                    selectTextClass = 'text-blue-800';
                    selectBorderClass = 'border-blue-300';
                    break;
                default:
                    borderColorClass = 'border-l-gray-300';
                    selectBgClass = 'bg-gray-100';
                    selectTextClass = 'text-gray-800';
                    selectBorderClass = 'border-gray-300';
            }

            const jobCard = document.createElement('div');
            jobCard.className = `bg-white p-3 rounded-md shadow-sm border-l-4 ${borderColorClass}`;
            jobCard.innerHTML = `
                <div class="flex justify-between items-baseline text-sm">
                        <p class="font-bold text-base text-gray-900 truncate pr-4">${row[0] || 'N/A'}</p>
                        <div class="text-xs text-gray-500 flex gap-3 flex-shrink-0">
                        <p>Applied: ${row[2] || 'N/A'}</p>
                        <p>Updated: <span class="font-semibold text-gray-700">${row[5] || 'N/A'}</span></p>
                    </div>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                    <div class="flex items-baseline gap-2">
                        <p class="text-sm text-gray-600 font-semibold">${row[1] || 'N/A'}</p>
                        <p>via ${row[3] || 'N/A'}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <select class="status-select font-semibold text-xs rounded-md p-1 border ${selectBorderClass} ${selectBgClass} ${selectTextClass}" data-row-index="${sheetRowIndex}" style="padding-right: 1.5rem;">
                                <option value="Applied" ${status === 'Applied' ? 'selected' : ''}>Applied</option>
                                <option value="Interviewed" ${status === 'Interviewed' ? 'selected' : ''}>Interviewed</option>
                                <option value="Offer" ${status === 'Offer' ? 'selected' : ''}>Offer</option>
                                <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                        <button class="delete-btn text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100" data-row-index="${sheetRowIndex}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                            </button>
                    </div>
                </div>
            `;
            jobsListContainer.appendChild(jobCard);
        });

        // Re-attach event listeners for delete buttons and status selects
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                rowToDelete = e.currentTarget.getAttribute('data-row-index');
                deleteModal.style.display = 'flex';
            });
        });

        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const newStatus = e.target.value;
                const rowIndex = e.target.getAttribute('data-row-index');
                await updateJobStatus(rowIndex, newStatus);
            });
        });

    } else {
        jobsListContainer.innerHTML = '<p class="text-center text-gray-500 p-4">No matching applications found.</p>';
    }
}



function updateCharts(jobs) {
    const portalCounts = {};
    const now = new Date();

    jobs.forEach(job => {
        // Portal Stats
        const portal = job[3] || 'Unknown';
        portalCounts[portal] = (portalCounts[portal] || 0) + 1;
    });

    // Render Stats Cards - Use allJobsData for accurate counts
    const totalApps = allJobsData.length;
    const activeApps = allJobsData.filter(j => j[4] !== 'Rejected').length;
    const interviews = allJobsData.filter(j => j[4] === 'Interviewed').length;
    const offers = allJobsData.filter(j => j[4] === 'Offer').length;
    const rejected = allJobsData.filter(j => j[4] === 'Rejected').length;

    // Calculate daily applications count based on APPLIED DATE - use local date to avoid timezone issues
    const nowLocal = new Date();
    const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;
    console.log('Today is:', today);
    console.log('Checking APPLIED dates from all applications...');
    const todayApps = allJobsData.filter(j => {
        const appliedDateStr = j[2]; // Applied Date is at column C / index 2
        if (appliedDateStr) {
            // Normalize date string to YYYY-MM-DD format
            const normalized = appliedDateStr.trim();
            if (normalized === today) {
                console.log('✓ MATCH - Job:', j[0], '| Applied Date:', appliedDateStr);
                return true;
            }
            // Also try parsing if format is different
            const d = new Date(normalized + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                const appDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (appDate === today) {
                    console.log('✓ MATCH (parsed) - Job:', j[0], '| Raw Applied Date:', appliedDateStr, '| Parsed:', appDate);
                    return true;
                }
            }
        }
        return false;
    }).length;
    console.log('==================');
    console.log('Total apps today:', todayApps);
    console.log('==================');

    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Total</p>
            <p class="text-2xl font-bold text-gray-800">${totalApps}</p>
        </div>
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Today</p>
            <p class="text-2xl font-bold text-purple-600">${todayApps}</p>
        </div>
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Active</p>
            <p class="text-2xl font-bold text-blue-600">${activeApps}</p>
        </div>
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Interviews</p>
            <p class="text-2xl font-bold text-yellow-600">${interviews}</p>
        </div>
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Offers</p>
            <p class="text-2xl font-bold text-green-600">${offers}</p>
        </div>
        <div class="stat-card">
            <p class="text-gray-500 text-xs uppercase font-bold">Rejected</p>
            <p class="text-2xl font-bold text-red-600">${rejected}</p>
        </div>
    `;

    // Render Timeline Chart - Show applications by last activity date (updates)
    const dailyByStatus = {};
    const dailyCumulative = {};

    allJobsData.forEach(job => {
        // Use Last Updated date (column F/index 5) to track status changes and activity
        const dateStr = job[5] || job[2]; // Use Last Updated, fallback to Application date
        if (dateStr) {
            // Try direct string match first (YYYY-MM-DD format)
            let key = dateStr.trim();
            // Validate it's a proper date format
            if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
                const status = job[4] || 'Unknown';
                
                // Count by status per day
                if (!dailyByStatus[key]) dailyByStatus[key] = {};
                dailyByStatus[key][status] = (dailyByStatus[key][status] || 0) + 1;

                // Count cumulative
                dailyCumulative[key] = (dailyCumulative[key] || 0) + 1;
            } else {
                // Try parsing other date formats
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const status = job[4] || 'Unknown';
                    
                    if (!dailyByStatus[key]) dailyByStatus[key] = {};
                    dailyByStatus[key][status] = (dailyByStatus[key][status] || 0) + 1;
                    dailyCumulative[key] = (dailyCumulative[key] || 0) + 1;
                }
            }
        }
    });

    // Sort dates and prepare cumulative data
    const sortedDates = Object.keys(dailyByStatus).sort();
    let cumulativeTotal = 0;
    const cumulativeValues = sortedDates.map(d => {
        cumulativeTotal += dailyCumulative[d] || 0;
        return cumulativeTotal;
    });

    // Prepare stacked data by status
    const statuses = ['Applied', 'Interviewed', 'Offer', 'Rejected'];
    const statusColors = {
        'Applied': '#3b82f6',
        'Interviewed': '#f59e0b',
        'Offer': '#10b981',
        'Rejected': '#ef4444',
        'Unknown': '#6b7280'
    };

    const statusDatasets = statuses.map(status => ({
        label: status,
        data: sortedDates.map(d => dailyByStatus[d][status] || 0),
        backgroundColor: statusColors[status],
        borderWidth: 0
    }));

    // Add cumulative line dataset
    statusDatasets.push({
        label: 'Cumulative Total',
        data: cumulativeValues,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#7c3aed',
        yAxisID: 'y1',
        type: 'line'
    });

    // Check if canvas element exists before creating chart
    const ctxTimeline = document.getElementById('timelineChart');
    if (!ctxTimeline) {
        console.error('timelineChart canvas element not found');
        return;
    }

    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(ctxTimeline.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: statusDatasets
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { 
                    grid: { display: false }, 
                    stacked: true,
                    ticks: { maxTicksLimit: 15 } 
                },
                y: { 
                    beginAtZero: true, 
                    stacked: true, 
                    grid: { borderDash: [4, 4] },
                    title: { display: true, text: 'Count by Status' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    grid: { display: false },
                    title: { display: true, text: 'Cumulative Total' },
                    ticks: { color: '#7c3aed' }
                }
            },
            plugins: {
                legend: { 
                    position: 'top', 
                    labels: { boxWidth: 15, padding: 15, font: { size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}


// Event Listeners for Form
addJobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobName = document.getElementById('jobName').value;
    const company = document.getElementById('jobCompany').value;
    const date = document.getElementById('applicationDate').value;
    const portal = document.getElementById('jobPortal').value;
    const status = document.getElementById('jobStatus').value;
    // Use local date to avoid timezone issues
    const nowLocal = new Date();
    const updated = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    const newRow = [jobName, company, date, portal, status, updated];

    try {
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:F',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] }
        });
        addJobForm.reset();
        // Set default date again
        document.getElementById('applicationDate').valueAsDate = new Date();
        await fetchAndRenderJobs();
        alert('Application added successfully!');
    } catch (err) {
        console.error(err);
        alert('Error adding application.');
    }
});

clearFormBtn.addEventListener('click', () => {
    addJobForm.reset();
    document.getElementById('applicationDate').valueAsDate = new Date();
});

// Delete Modal Actions
cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    rowToDelete = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (rowToDelete) {
        await deleteJob(rowToDelete);
        deleteModal.style.display = 'none';
        rowToDelete = null;
    }
});

async function deleteJob(rowIndex) {
    // To delete a row, we need to send a batchUpdate request
    // Sheet row index is 1-based, API expects 0-based index.
    // However, the rowIndex we stored is the actual sheet row number (1-based).
    // The API deleteDimension range is startIndex (inclusive), endIndex (exclusive).
    // So to delete row N, we need startIndex = N-1, endIndex = N.

    const index = parseInt(rowIndex) - 1;

    try {
        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0, // Assuming first sheet
                            dimension: 'ROWS',
                            startIndex: index,
                            endIndex: index + 1
                        }
                    }
                }]
            }
        });
        await fetchAndRenderJobs();
    } catch (err) {
        console.error(err);
        alert('Error deleting application.');
    }
}

async function updateJobStatus(rowIndex, newStatus) {
    const range = `Sheet1!E${rowIndex}`; // Column E is Status
    const updatedDateRange = `Sheet1!F${rowIndex}`; // Column F is Updated Date
    // Use local date to avoid timezone issues
    const nowLocal = new Date();
    const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

    try {
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[newStatus]] }
        });
        // Also update the "Updated" date
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: updatedDateRange,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[today]] }
        });

        await fetchAndRenderJobs();
    } catch (err) {
        console.error(err);
        alert('Error updating status.');
    }
}

// Search
searchBar.addEventListener('input', () => {
    renderJobs();
});

// Refresh
refreshButton.addEventListener('click', () => {
    fetchAndRenderJobs();
});

// Export
document.getElementById('export-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('export-menu');
    menu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
    document.getElementById('export-menu').classList.add('hidden');
});

document.getElementById('export-csv').addEventListener('click', () => {
    exportData('csv');
});

document.getElementById('export-xlsx').addEventListener('click', () => {
    exportData('xlsx');
});

function exportData(type) {
    const data = window._lastFilteredJobs || [];
    if (!data.length) { alert('No data to export'); return; }

    // Prepare data for export
    const exportData = data.map(j => ({
        'Job Name': j.jobName,
        'Company': j.company,
        'Application Date': j.appliedDate,
        'Portal': j.portal,
        'Status': j.status,
        'Last Updated': j.updatedDate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applications");

    if (type === 'csv') {
        XLSX.writeFile(wb, "my_applications.csv");
    } else {
        XLSX.writeFile(wb, "my_applications.xlsx");
    }
}

// Open Google Sheet
document.getElementById('open-sheet-btn').addEventListener('click', () => {
    window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`, '_blank');
});

// Set default date to today
document.getElementById('applicationDate').valueAsDate = new Date();

// Auth listeners
authorizeButton.onclick = handleAuthClick;
signoutButton.onclick = handleSignoutClick;
