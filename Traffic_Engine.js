class Traffic_Simulator {
    constructor(Num_Lanes = 4, Max_Capacity = 20.0) {
        this.Num_Lanes = Num_Lanes;
        this.Max_Capacity = Max_Capacity;
        this.Lanes = {};
        for (let I = 1; I <= Num_Lanes; I++) {
            this.Lanes[I] = {
                Occupancy: 0.0,
                History: [0.0],
                Anti_Gravity: false,
                Signal: 'GREEN'
            };
        }

        this.Vehicle_Types = {
            'Scooter': 0.2,
            'Auto': 0.5,
            'Car': 1.0,
            'Bus': 2.5
        };

        this.Total_Counts = {};
        for (const V in this.Vehicle_Types) {
            this.Total_Counts[V] = 0;
        }

        this.Stress_Lanes = {};
        this.Hidden_Scooters = {};
        for (let I = 1; I <= Num_Lanes; I++) {
            this.Stress_Lanes[I] = 0;
            this.Hidden_Scooters[I] = 0;
        }

        this.Efficiency_History = [100.0];
        this.Logs = [];
        this.Jam_Threshold = 0.25;
        this.Min_Occupancy_For_Jam = 2.0;
    }

    Update() {
        const Now = new Date();
        const Current_Time = Now.toTimeString().split(' ')[0];
        let Total_Occupancy = 0;
        let Total_Departure = 0;

        for (let Lane_Id = 1; Lane_Id <= this.Num_Lanes; Lane_Id++) {
            const Data = this.Lanes[Lane_Id];
            let New_Vehicle_Mass = 0;
            let V_Type = null;

            if (this.Stress_Lanes[Lane_Id] > 0) {
                const Choices = ['Bus', 'Car'];
                V_Type = Choices[Math.floor(Math.random() * Choices.length)];
                New_Vehicle_Mass = this.Vehicle_Types[V_Type];
                this.Total_Counts[V_Type]++;
                this.Stress_Lanes[Lane_Id]--;
            } else {
                if (Math.random() > 0.4) {
                    const Keys = Object.keys(this.Vehicle_Types);
                    V_Type = Keys[Math.floor(Math.random() * Keys.length)];
                    New_Vehicle_Mass = this.Vehicle_Types[V_Type];
                    this.Total_Counts[V_Type]++;
                }
            }

            if (['Bus', 'Car', 'Auto'].includes(V_Type) && Math.random() > 0.7) {
                const Spillover = New_Vehicle_Mass * 0.4;
                New_Vehicle_Mass -= Spillover;
                const Adj_Lane = Lane_Id < this.Num_Lanes ? Lane_Id + 1 : Lane_Id - 1;
                this.Lanes[Adj_Lane].Occupancy = Math.min(this.Max_Capacity, this.Lanes[Adj_Lane].Occupancy + Spillover);
            }

            if (V_Type === 'Bus' && Math.random() > 0.5) {
                this.Hidden_Scooters[Lane_Id] += Math.floor(Math.random() * 3) + 1;
            }

            let Departure_Rate = !Data.Anti_Gravity ? 0.3 : 1.2;
            if (Data.Occupancy > 0.8 * this.Max_Capacity) {
                Departure_Rate *= 0.5;
            }

            const Actual_Departure = Math.min(Data.Occupancy, Departure_Rate);
            Total_Departure += Actual_Departure;

            Data.Occupancy = Math.max(0, Math.min(this.Max_Capacity, Math.round((Data.Occupancy + New_Vehicle_Mass - Actual_Departure) * 100) / 100));
            Total_Occupancy += Data.Occupancy;

            this.Run_4d_Radar(Lane_Id, Data, Current_Time);
            this.Predict_Jam(Lane_Id, Data, Current_Time);

            Data.History.push(Math.round((Data.Occupancy / this.Max_Capacity) * 10000) / 100);
            if (Data.History.length > 10) {
                Data.History.shift();
            }
        }

        const Global_Capacity = this.Num_Lanes * this.Max_Capacity;
        const Efficiency = Math.max(0, Math.min(100, 100 - (Total_Occupancy / Global_Capacity * 100)));
        this.Efficiency_History.push(Math.round(Efficiency * 10) / 10);
        if (this.Efficiency_History.length > 10) {
            this.Efficiency_History.shift();
        }
    }

    Predict_Jam(Lane_Id, Data, Current_Time) {
        if (Data.History.length < 5) return;

        const Recent = Data.History;
        const Growth = (Recent[Recent.length - 1] - Recent[Recent.length - 4]) / (Recent[Recent.length - 4] > 0 ? Recent[Recent.length - 4] : 1);

        if ((Growth > this.Jam_Threshold || Data.Occupancy > 0.8 * this.Max_Capacity) && Data.Occupancy > this.Min_Occupancy_For_Jam) {
            if (!Data.Anti_Gravity) {
                Data.Anti_Gravity = true;
                this.Logs.push(`[${Current_Time}] Lane ${Lane_Id}: Critical Density! Activating Smooth Flow.`);
            }
        } else if (Data.Occupancy < 0.25 * this.Max_Capacity) {
            if (Data.Anti_Gravity) {
                Data.Anti_Gravity = false;
                this.Logs.push(`[${Current_Time}] Lane ${Lane_Id}: Flow Restored. Disengaging Smooth Flow.`);
            }
        }
    }

    Trigger_Stress_Test(Lane_Id) {
        if (Lane_Id in this.Stress_Lanes) {
            this.Stress_Lanes[Lane_Id] = 5;
            const Now = new Date();
            this.Logs.push(`[${Now.toTimeString().split(' ')[0]}] User Action: Manual Flood Triggered for Lane ${Lane_Id}.`);
            return true;
        }
        return false;
    }

    Trigger_Ambulance() {
        let Densest_Lane = '1';
        let Max_Occupancy = -1;
        for (const L in this.Lanes) {
            if (this.Lanes[L].Occupancy > Max_Occupancy) {
                Max_Occupancy = this.Lanes[L].Occupancy;
                Densest_Lane = L;
            }
        }
        this.Lanes[Densest_Lane].Occupancy = 0.0;
        this.Lanes[Densest_Lane].Anti_Gravity = false;
        const Now = new Date();
        this.Logs.push(`[${Now.toTimeString().split(' ')[0]}] 🚨 EMERGENCY GREEN WAVE: Ambulance detected. Lane ${Densest_Lane} instantly cleared.`);
        return Densest_Lane;
    }

    Run_4d_Radar(Lane_Id, Data, Current_Time) {
        if (this.Hidden_Scooters[Lane_Id] > 0) {
            const Hidden_Mass = this.Hidden_Scooters[Lane_Id] * this.Vehicle_Types['Scooter'];
            const Effective_Mass = Data.Occupancy + Hidden_Mass;
            if (Effective_Mass > Data.Occupancy) {
                Data.Occupancy = Math.min(this.Max_Capacity, Math.round(Effective_Mass * 100) / 100);
                this.Logs.push(`[${Current_Time}] 📡 Lane ${Lane_Id}: 4D Radar detected ${this.Hidden_Scooters[Lane_Id]} hidden scooter(s). Re-evaluating density.`);
            }
            this.Hidden_Scooters[Lane_Id] = Math.max(0, this.Hidden_Scooters[Lane_Id] - 1);
        }
    }

    Get_Status() {
        const Status = {
            lanes: {},
            logs: this.Logs.slice(-15),
            stats: {
                vehicle_counts: this.Total_Counts,
                efficiency: this.Efficiency_History[this.Efficiency_History.length - 1] || 100.0,
                is_stressing: this.Stress_Lanes
            }
        };

        for (const L in this.Lanes) {
            const Data = this.Lanes[L];
            Status.lanes[L] = {
                occupancy: Math.round(Data.Occupancy * 100) / 100,
                density_pct: Data.History.length > 0 ? Data.History[Data.History.length - 1] : 0,
                anti_gravity: Data.Anti_Gravity,
                history: [...Data.History]
            };
        }
        return Status;
    }
}

module.exports = Traffic_Simulator;
