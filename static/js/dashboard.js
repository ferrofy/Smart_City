document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    const logContainer = document.getElementById('ai-logs');
    const systemClock = document.getElementById('system-clock');
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    const efficiencyVal = document.getElementById('efficiency-val');

    // Chart.js Configuration
    const trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Lane 1', data: [], borderColor: '#00ff88', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Lane 2', data: [], borderColor: '#3b82f6', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Lane 3', data: [], borderColor: '#ffcc00', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Lane 4', data: [], borderColor: '#ff0055', tension: 0.4, borderWidth: 2, pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255, 255, 255, 0.05)' }, border: { display: false }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, border: { display: false }, ticks: { display: false } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true } }
            },
            interaction: { intersect: false, mode: 'index' },
            animation: { duration: 600, easing: 'easeOutQuart' }
        }
    });

    setInterval(() => {
        const now = new Date();
        systemClock.innerText = now.toTimeString().split(' ')[0];
    }, 1000);

    let renderedLogs = new Set();
    let pollingIntervalId = null;

    // Handle Speed Slider & Sync Polling
    function updatePolling(intervalSec) {
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        
        const ms = intervalSec * 1000;
        pollingIntervalId = setInterval(fetchUpdate, ms);
        console.log(`Sync: UI polling updated to ${ms}ms`);
    }

    speedSlider.addEventListener('change', async () => {
        const interval = speedSlider.value;
        speedVal.innerText = `${interval}s`;
        
        // 1. Update Backend
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval: interval })
            });
            // 2. Sync Frontend Polling
            updatePolling(interval);
        } catch (err) {
            console.error("Config Error:", err);
        }
    });

    document.querySelectorAll('.flood-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const laneId = btn.getAttribute('data-lane');
            fetch(`/api/stress-test/${laneId}`, { method: 'POST' });
        });
    });

    const ambulanceBtn = document.getElementById('btn-ambulance');
    if (ambulanceBtn) {
        ambulanceBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/ambulance', { method: 'POST' });
                const result = await response.json();
                if (result.status === 'success') {
                    const laneCard = document.getElementById(`lane-card-${result.lane_cleared}`);
                    if (laneCard) {
                        laneCard.style.transition = 'all 0.1s ease';
                        laneCard.style.backgroundColor = 'rgba(255, 0, 85, 0.4)';
                        laneCard.style.boxShadow = '0 0 30px rgba(255, 0, 85, 0.8)';
                        setTimeout(() => {
                            laneCard.style.backgroundColor = '';
                            laneCard.style.boxShadow = '';
                            laneCard.style.transition = '';
                        }, 500);
                        
                        // Spawn Ambulance visually
                        spawnVehicle(result.lane_cleared, 'ambulance', false);
                    }
                }
            } catch (e) {
                console.error("Ambulance routing failed:", e);
            }
        });
    }

    async function fetchUpdate() {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) return;
            const data = await response.json();
            updateUI(data);
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    }
    
    function spawnVehicle(laneId, type, isAntiGrav = false) {
        const track = document.getElementById(`map-track-${laneId}`);
        if (!track) return;
        
        const veh = document.createElement('div');
        veh.classList.add('veh-block', `veh-${type}`);
        if (isAntiGrav) veh.classList.add('anti-grav-active');
        
        track.appendChild(veh);
        
        const duration = isAntiGrav ? 800 : type === 'ambulance' ? 1500 : 3000;
        setTimeout(() => {
            if (veh.parentNode === track) track.removeChild(veh);
        }, duration + 100);
    }

    function updateUI(data) {
        let maxHistoryLength = 0;

        Object.entries(data.lanes).forEach(([id, lane]) => {
            const valEl = document.getElementById(`lane-${id}-val`);
            const massEl = document.getElementById(`lane-${id}-mass`);
            const progressEl = document.getElementById(`lane-${id}-progress`);
            const agBadge = document.getElementById(`ag-badge-${id}`);
            const signalEl = document.getElementById(`signal-${id}`);
            const stressLabel = document.getElementById(`stress-label-${id}`);

            const density = lane.density_pct.toFixed(1);
            valEl.innerText = `${density}%`;
            massEl.innerText = `${lane.occupancy.toFixed(1)}t`;
            progressEl.style.width = `${density}%`;
            
            // Map Visual Spawning
            let spawnCount = Math.floor(lane.density_pct / 20);
            if (spawnCount > 0) {
                const types = ['car', 'car', 'auto', 'scooter'];
                for(let i=0; i<Math.min(spawnCount, 3); i++) {
                    setTimeout(() => {
                        const type = types[Math.floor(Math.random() * types.length)];
                        spawnVehicle(id, type, lane.anti_gravity);
                    }, i * 400 + Math.random() * 200);
                }
            }

            if (data.stats && data.stats.is_stressing && data.stats.is_stressing[id] > 0) {
                stressLabel.classList.remove('d-none');
            } else {
                stressLabel.classList.add('d-none');
            }

            if (lane.anti_gravity) {
                agBadge.innerText = 'Anti-Gravity: ACTIVE';
                agBadge.classList.add('ag-active');
                signalEl.classList.remove('signal-red');
                progressEl.style.backgroundColor = '#007bff';
                progressEl.style.boxShadow = '0 0 15px #007bff';
            } else {
                agBadge.innerText = 'Anti-Gravity: OFF';
                agBadge.classList.remove('ag-active');
                if (lane.density_pct > 75) {
                    signalEl.classList.add('signal-red');
                    progressEl.style.backgroundColor = '#ff0055';
                    progressEl.style.boxShadow = '0 0 10px #ff0055';
                } else {
                    signalEl.classList.remove('signal-red');
                    progressEl.style.backgroundColor = '#00ff88';
                    progressEl.style.boxShadow = '0 0 10px #00ff88';
                }
            }

            const laneIndex = parseInt(id) - 1;
            trafficChart.data.datasets[laneIndex].data = [...lane.history];
            maxHistoryLength = Math.max(maxHistoryLength, lane.history.length);
        });

        if (data.stats) {
            efficiencyVal.innerText = `${data.stats.efficiency}%`;
            if (data.stats.efficiency < 50) efficiencyVal.className = 'h4 fw-bold text-danger';
            else if (data.stats.efficiency < 80) efficiencyVal.className = 'h4 fw-bold text-warning';
            else efficiencyVal.className = 'h4 fw-bold text-success';

            if (data.stats.vehicle_counts) {
                document.getElementById('stat-scooter').innerText = data.stats.vehicle_counts.Scooter || 0;
                document.getElementById('stat-auto').innerText = data.stats.vehicle_counts.Auto || 0;
                document.getElementById('stat-car').innerText = data.stats.vehicle_counts.Car || 0;
                document.getElementById('stat-bus').innerText = data.stats.vehicle_counts.Bus || 0;
            }
        }

        trafficChart.data.labels = Array(maxHistoryLength).fill('');
        trafficChart.update('none');

        data.logs.forEach(log => {
            if (!renderedLogs.has(log)) {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                
                if (log.includes('Critical')) entry.classList.add('jam-warning');
                else if (log.includes('Activating') || log.includes('User Action')) entry.classList.add('ag-activation');
                else entry.classList.add('system-msg');

                entry.innerHTML = `<span class="log-time">${log.substring(0, 10)}</span><span class="log-text">${log.substring(10)}</span>`;
                logContainer.appendChild(entry);
                renderedLogs.add(log);
                logContainer.scrollTo({ top: logContainer.scrollHeight, behavior: 'smooth' });
            }
        });
        
        if (renderedLogs.size > 100) {
            const logArray = Array.from(renderedLogs);
            renderedLogs = new Set(logArray.slice(-50));
            // Cleanup DOM nodes
            while (logContainer.children.length > 50) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }
    }

    // Initialize Polling
    updatePolling(2.0);
});
