import random
import time
from collections import deque

class TrafficSimulator:
    def __init__(self, num_lanes=4, max_capacity=20.0):
        self.num_lanes = num_lanes
        self.max_capacity = max_capacity
        self.lanes = {i: {
            'occupancy': 0.0, 
            'history': deque([0.0], maxlen=10),
            'anti_gravity': False, 
            'signal': 'GREEN'
        } for i in range(1, num_lanes + 1)}
        
        self.vehicle_types = {
            'Scooter': 0.2,
            'Auto': 0.5,
            'Car': 1.0,
            'Bus': 2.5
        }
        
        self.total_counts = {v: 0 for v in self.vehicle_types.keys()}
        self.stress_lanes = {i: 0 for i in range(1, num_lanes + 1)} 
        self.hidden_scooters = {i: 0 for i in range(1, num_lanes + 1)} 
        self.efficiency_history = deque([100.0], maxlen=10)
        
        self.logs = []
        self.jam_threshold = 0.25 
        self.min_occupancy_for_jam = 2.0

    def update(self):
        current_time = time.strftime("%H:%M:%S")
        total_occupancy = 0
        total_departure = 0
        
        for lane_id, data in self.lanes.items():
            new_vehicle_mass = 0
            v_type = None
            
            if self.stress_lanes[lane_id] > 0:
                v_type = random.choice(['Bus', 'Car'])
                new_vehicle_mass = self.vehicle_types[v_type]
                self.total_counts[v_type] += 1
                self.stress_lanes[lane_id] -= 1
            else:
                if random.random() > 0.4:
                    v_type = random.choice(list(self.vehicle_types.keys()))
                    new_vehicle_mass = self.vehicle_types[v_type]
                    self.total_counts[v_type] += 1
            
            if v_type in ['Bus', 'Car', 'Auto'] and random.random() > 0.7:
                spillover = new_vehicle_mass * 0.4
                new_vehicle_mass -= spillover
                adj_lane = lane_id + 1 if lane_id < self.num_lanes else lane_id - 1
                self.lanes[adj_lane]['occupancy'] = min(self.max_capacity, self.lanes[adj_lane]['occupancy'] + spillover)
                
            if v_type == 'Bus' and random.random() > 0.5:
                self.hidden_scooters[lane_id] += random.randint(1, 3)
            
            departure_rate = 0.3 if not data['anti_gravity'] else 1.2 
            if data['occupancy'] > 0.8 * self.max_capacity:
                departure_rate *= 0.5

            actual_departure = min(data['occupancy'], departure_rate)
            total_departure += actual_departure

            data['occupancy'] = max(0, min(self.max_capacity, round(data['occupancy'] + new_vehicle_mass - actual_departure, 2)))
            total_occupancy += data['occupancy']
            
            self._run_4d_radar(lane_id, data, current_time)
            
            self._predict_jam(lane_id, data, current_time)
            
            data['history'].append(round((data['occupancy'] / self.max_capacity) * 100, 2))

        global_capacity = self.num_lanes * self.max_capacity
        efficiency = max(0, min(100, 100 - (total_occupancy / global_capacity * 100)))
        self.efficiency_history.append(round(efficiency, 1))

    def _predict_jam(self, lane_id, data, current_time):
        if len(data['history']) < 5:
            return

        recent_history = list(data['history'])
        growth = (recent_history[-1] - recent_history[-4]) / (recent_history[-4] if recent_history[-4] > 0 else 1)
        
        if (growth > self.jam_threshold or data['occupancy'] > 0.8 * self.max_capacity) and data['occupancy'] > self.min_occupancy_for_jam:
            if not data['anti_gravity']:
                data['anti_gravity'] = True
                self.logs.append(f"[{current_time}] Lane {lane_id}: Critical Density! Activating Smooth Flow.")
        elif data['occupancy'] < 0.25 * self.max_capacity:
            if data['anti_gravity']:
                data['anti_gravity'] = False
                self.logs.append(f"[{current_time}] Lane {lane_id}: Flow Restored. Disengaging Smooth Flow.")

    def trigger_stress_test(self, lane_id):
        if lane_id in self.stress_lanes:
            self.stress_lanes[lane_id] = 5 
            self.logs.append(f"[{time.strftime('%H:%M:%S')}] User Action: Manual Flood Triggered for Lane {lane_id}.")
            return True
        return False

    def trigger_ambulance(self):
        densest_lane = max(self.lanes.keys(), key=lambda l: self.lanes[l]['occupancy'])
        self.lanes[densest_lane]['occupancy'] = 0.0
        self.lanes[densest_lane]['anti_gravity'] = False
        self.logs.append(f"[{time.strftime('%H:%M:%S')}] 🚨 EMERGENCY GREEN WAVE: Ambulance detected. Lane {densest_lane} instantly cleared.")
        return densest_lane

    def _run_4d_radar(self, lane_id, data, current_time):
        if self.hidden_scooters[lane_id] > 0:
            hidden_mass = self.hidden_scooters[lane_id] * self.vehicle_types['Scooter']
            effective_mass = data['occupancy'] + hidden_mass
            if effective_mass > data['occupancy']:
                data['occupancy'] = min(self.max_capacity, round(effective_mass, 2))
                self.logs.append(f"[{current_time}] 📡 Lane {lane_id}: 4D Radar detected {self.hidden_scooters[lane_id]} hidden scooter(s). Re-evaluating density.")
            self.hidden_scooters[lane_id] = max(0, self.hidden_scooters[lane_id] - 1) 

    def get_status(self):
        status = {
            'lanes': {lane_id: {
                'occupancy': round(data['occupancy'], 2),
                'density_pct': data['history'][-1] if data['history'] else 0,
                'anti_gravity': data['anti_gravity'],
                'history': list(data['history'])
            } for lane_id, data in self.lanes.items()},
            'logs': self.logs[-15:],
            'stats': {
                'vehicle_counts': self.total_counts,
                'efficiency': self.efficiency_history[-1] if self.efficiency_history else 100.0,
                'is_stressing': self.stress_lanes
            }
        }
        return status
