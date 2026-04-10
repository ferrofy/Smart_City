document.addEventListener('DOMContentLoaded', () => {
    window.Simulator = new Traffic_Simulator();
    const Ctx = document.getElementById('trafficChart').getContext('2d');
    const Log_Container = document.getElementById('ai-logs');
    const System_Clock = document.getElementById('system-clock');
    const Speed_Slider = document.getElementById('speed-slider');
    const Speed_Val = document.getElementById('speed-val');
    const Efficiency_Val = document.getElementById('efficiency-val');

    const Traffic_Chart = new Chart(Ctx, {
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

    const Mode_Radar = document.getElementById('mode-radar');
    const Mode_Camera = document.getElementById('mode-camera');
    const Camera_View = document.getElementById('camera-mode-view');
    const Radar_View = document.getElementById('radar-mode-view');

    function Update_Sim_Mode() {
        if (Mode_Camera && Mode_Camera.checked) {
            Camera_View.classList.remove('d-none');
            Radar_View.classList.add('d-none');
            window.Simulator.System_Mode = 'CAMERA';
        } else if (Mode_Radar && Mode_Radar.checked) {
            Camera_View.classList.add('d-none');
            Radar_View.classList.remove('d-none');
            window.Simulator.System_Mode = 'RADAR';
        }
    }

    if (Mode_Radar && Mode_Camera) {
        Mode_Radar.addEventListener('change', Update_Sim_Mode);
        Mode_Camera.addEventListener('change', Update_Sim_Mode);
        Update_Sim_Mode();
    }

    setInterval(() => {
        const Now = new Date();
        System_Clock.innerText = Now.toTimeString().split(' ')[0];
    }, 1000);

    let Rendered_Logs = new Set();
    let Polling_Interval_Id = null;

    function Update_Polling(Interval_Sec) {
        if (Polling_Interval_Id) clearInterval(Polling_Interval_Id);
        const Ms = Interval_Sec * 1000;
        Polling_Interval_Id = setInterval(Fetch_Update, Ms);
    }

    Speed_Slider.addEventListener('change', () => {
        const Interval = Speed_Slider.value;
        Speed_Val.innerText = `${Interval}s`;
        Update_Polling(Interval);
    });

    document.querySelectorAll('.flood-btn').forEach(Btn => {
        Btn.addEventListener('click', () => {
            const Lane_Id = Btn.getAttribute('data-lane');
            window.Simulator.Trigger_Stress_Test(parseInt(Lane_Id));
            Fetch_Update();
        });
    });

    const Ambulance_Btn = document.getElementById('btn-ambulance');
    if (Ambulance_Btn) {
        Ambulance_Btn.addEventListener('click', () => {
            const Lane_Cleared = window.Simulator.Trigger_Ambulance();
            const Lane_Card = document.getElementById(`lane-card-${Lane_Cleared}`);
            if (Lane_Card) {
                Lane_Card.style.transition = 'all 0.1s ease';
                Lane_Card.style.backgroundColor = 'rgba(255, 0, 85, 0.4)';
                Lane_Card.style.boxShadow = '0 0 30px rgba(255, 0, 85, 0.8)';
                setTimeout(() => {
                    Lane_Card.style.backgroundColor = '';
                    Lane_Card.style.boxShadow = '';
                    Lane_Card.style.transition = '';
                }, 500);
                Spawn_Vehicle(Lane_Cleared, 'ambulance', false);
            }
            Fetch_Update();
        });
    }

    function Fetch_Update() {
        window.Simulator.Update();
        const Data = window.Simulator.Get_Status();
        Update_UI(Data);
    }

    function Spawn_Vehicle(Lane_Id, Type, Is_Anti_Grav = false) {
        const Track = document.getElementById(`map-track-${Lane_Id}`);
        if (!Track) return;
        const Veh = document.createElement('div');
        Veh.classList.add('veh-block', `veh-${Type}`);
        if (Is_Anti_Grav) Veh.classList.add('anti-grav-active');
        Track.appendChild(Veh);
        const Duration = Is_Anti_Grav ? 800 : Type === 'ambulance' ? 1500 : 3000;
        setTimeout(() => {
            if (Veh.parentNode === Track) Track.removeChild(Veh);
        }, Duration + 100);
    }

    function Update_UI(Data) {
        let Max_History_Length = 0;

        Object.entries(Data.lanes).forEach(([Id, Lane]) => {
            const Val_El = document.getElementById(`lane-${Id}-val`);
            const Mass_El = document.getElementById(`lane-${Id}-mass`);
            const Progress_El = document.getElementById(`lane-${Id}-progress`);
            const Ag_Badge = document.getElementById(`ag-badge-${Id}`);
            const Signal_El = document.getElementById(`signal-${Id}`);
            const Stress_Label = document.getElementById(`stress-label-${Id}`);

            const Density = Lane.density_pct.toFixed(1);
            Val_El.innerText = `${Density}%`;
            Mass_El.innerText = `${Lane.occupancy.toFixed(1)}t`;
            Progress_El.style.width = `${Density}%`;

            let Spawn_Count = Math.floor(Lane.density_pct / 20);
            if (Spawn_Count > 0) {
                const Types = ['car', 'car', 'auto', 'scooter'];
                for (let i = 0; i < Math.min(Spawn_Count, 3); i++) {
                    setTimeout(() => {
                        const Type = Types[Math.floor(Math.random() * Types.length)];
                        Spawn_Vehicle(Id, Type, Lane.anti_gravity);
                    }, i * 400 + Math.random() * 200);
                }
            }

            if (Data.stats && Data.stats.is_stressing && Data.stats.is_stressing[Id] > 0) {
                Stress_Label.classList.remove('d-none');
            } else {
                Stress_Label.classList.add('d-none');
            }

            if (Lane.anti_gravity) {
                Ag_Badge.innerText = 'APEX AI: ACTIVE';
                Ag_Badge.classList.add('ag-active');
                Signal_El.classList.remove('signal-red');
                Progress_El.style.backgroundColor = '#007bff';
                Progress_El.style.boxShadow = '0 0 15px #007bff';
            } else {
                Ag_Badge.innerText = 'APEX AI: OFF';
                Ag_Badge.classList.remove('ag-active');
                if (Lane.density_pct > 75) {
                    Signal_El.classList.add('signal-red');
                    Progress_El.style.backgroundColor = '#ff0055';
                    Progress_El.style.boxShadow = '0 0 10px #ff0055';
                } else {
                    Signal_El.classList.remove('signal-red');
                    Progress_El.style.backgroundColor = '#00ff88';
                    Progress_El.style.boxShadow = '0 0 10px #00ff88';
                }
            }

            const Lane_Index = parseInt(Id) - 1;
            Traffic_Chart.data.datasets[Lane_Index].data = [...Lane.history];
            Max_History_Length = Math.max(Max_History_Length, Lane.history.length);
        });

        if (Data.stats) {
            Efficiency_Val.innerText = `${Data.stats.efficiency}%`;
            if (Data.stats.efficiency < 50) Efficiency_Val.className = 'h4 fw-bold text-danger';
            else if (Data.stats.efficiency < 80) Efficiency_Val.className = 'h4 fw-bold text-warning';
            else Efficiency_Val.className = 'h4 fw-bold text-success';

            if (Data.stats.vehicle_counts) {
                document.getElementById('stat-scooter').innerText = Data.stats.vehicle_counts.Scooter || 0;
                document.getElementById('stat-auto').innerText = Data.stats.vehicle_counts.Auto || 0;
                document.getElementById('stat-car').innerText = Data.stats.vehicle_counts.Car || 0;
                document.getElementById('stat-bus').innerText = Data.stats.vehicle_counts.Bus || 0;
            }
        }

        Traffic_Chart.data.labels = Array(Max_History_Length).fill('');
        Traffic_Chart.update('none');

        Data.logs.forEach(Log => {
            if (!Rendered_Logs.has(Log)) {
                const Entry = document.createElement('div');
                Entry.className = 'log-entry';
                if (Log.includes('Critical')) Entry.classList.add('jam-warning');
                else if (Log.includes('Activating') || Log.includes('User Action')) Entry.classList.add('ag-activation');
                else Entry.classList.add('system-msg');
                Entry.innerHTML = `<span class="log-time">${Log.substring(0, 10)}</span><span class="log-text">${Log.substring(10)}</span>`;
                Log_Container.appendChild(Entry);
                Rendered_Logs.add(Log);
                Log_Container.scrollTo({ top: Log_Container.scrollHeight, behavior: 'smooth' });
            }
        });

        if (Rendered_Logs.size > 100) {
            const Log_Array = Array.from(Rendered_Logs);
            Rendered_Logs = new Set(Log_Array.slice(-50));
            while (Log_Container.children.length > 50) {
                Log_Container.removeChild(Log_Container.firstChild);
            }
        }
    }

    Update_Polling(2.0);
});
