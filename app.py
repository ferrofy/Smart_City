from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from traffic_engine import TrafficSimulator
import threading
import time

app = Flask(__name__)
CORS(app)

# Initialize simulator
simulator = TrafficSimulator()
update_interval = 2.0 # Default 2 seconds

def simulation_worker():
    """Background task to update simulation state."""
    global update_interval
    while True:
        simulator.update()
        time.sleep(update_interval)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def get_status():
    return jsonify(simulator.get_status())

@app.route('/api/stress-test/<int:lane_id>', methods=['POST'])
def stress_test(lane_id):
    if simulator.trigger_stress_test(lane_id):
        return jsonify({"status": "success", "message": f"Stress test started for lane {lane_id}"})
    return jsonify({"status": "error", "message": "Invalid lane ID"}), 400

@app.route('/api/ambulance', methods=['POST'])
def spawn_ambulance():
    lane_cleared = simulator.trigger_ambulance()
    return jsonify({"status": "success", "lane_cleared": lane_cleared})

@app.route('/api/config', methods=['POST'])
def update_config():
    global update_interval
    data = request.json
    if 'interval' in data:
        new_interval = float(data['interval'])
        if 0.1 <= new_interval <= 10.0:
            update_interval = new_interval
            return jsonify({"status": "success", "interval": update_interval})
    return jsonify({"status": "error", "message": "Invalid interval"}), 400

if __name__ == '__main__':
    # Start simulation thread
    sim_thread = threading.Thread(target=simulation_worker, daemon=True)
    sim_thread.start()
    
    # Run Flask
    print(f"Project Smooth Flow Backend starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000, use_reloader=False)
