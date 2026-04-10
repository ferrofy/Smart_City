const Express = require('express');
const Cors = require('cors');
const Path = require('path');
const Traffic_Simulator = require('./Traffic_Engine');

const App = Express();
App.use(Cors());
App.use(Express.json());

const Simulator = new Traffic_Simulator();

App.use('/Files', Express.static(Path.join(__dirname, 'Files')));

App.get('/', (Req, Res) => {
    Res.sendFile(Path.join(__dirname, 'index.html'));
});

App.get('/api/status', (Req, Res) => {
    Simulator.Update();
    Res.json(Simulator.Get_Status());
});

App.post('/api/stress-test/:lane_id', (Req, Res) => {
    const Lane_Id = parseInt(Req.params.lane_id);
    if (Simulator.Trigger_Stress_Test(Lane_Id)) {
        Res.json({ status: "success", message: `Stress test started for lane ${Lane_Id}` });
    } else {
        Res.status(400).json({ status: "error", message: "Invalid lane ID" });
    }
});

App.post('/api/ambulance', (Req, Res) => {
    const Lane_Cleared = Simulator.Trigger_Ambulance();
    Res.json({ status: "success", lane_cleared: Lane_Cleared });
});

App.post('/api/config', (Req, Res) => {
    const Data = Req.body;
    if (Data && Data.interval) {
        const New_Interval = parseFloat(Data.interval);
        if (New_Interval >= 0.1 && New_Interval <= 10.0) {
            Res.json({ status: "success", interval: New_Interval });
            return;
        }
    }
    Res.status(400).json({ status: "error", message: "Invalid interval" });
});

module.exports = App;

if (require.main === module) {
    const Port = 5050;
    App.listen(Port, () => {
        console.log(`Project Smooth Flow Backend starting on http://0.0.0.0:${Port}`);
    });
}
