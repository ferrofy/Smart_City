const Vision_Video = document.getElementById('vision-video');
const Vision_Canvas = document.getElementById('vision-canvas');
const Vision_Ctx = Vision_Canvas.getContext('2d');
const Video_Upload = document.getElementById('video-upload');
const Vision_Placeholder = document.getElementById('vision-placeholder');
const Vision_Feed_Wrapper = document.getElementById('vision-feed-wrapper');
const Model_Status = document.getElementById('model-status');
const Detected_Vehicles = document.getElementById('detected-vehicles');
const Detected_Emergency = document.getElementById('detected-emergency');

let AI_Model = null;
let Is_Detecting = false;
let Last_Emergency_State = false;

window.Camera_Sim_Data = {
    lanes: { 1: 0, 2: 0, 3: 0, 4: 0 },
    counts: { 'Scooter': 0, 'Auto': 0, 'Car': 0, 'Bus': 0 }
};

cocoSsd.load().then(Model => {
    AI_Model = Model;
    Model_Status.innerHTML = '<i class="fas fa-check-circle me-1"></i> Active';
    Model_Status.className = "badge bg-success";
}).catch(Err => {
    console.error("AI Model Load Error:", Err);
    Model_Status.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Error';
    Model_Status.className = "badge bg-danger";
});

Video_Upload.addEventListener('change', (Event) => {
    const File = Event.target.files[0];
    if (File) {
        const URL = window.URL.createObjectURL(File);
        Vision_Video.src = URL;
        Vision_Feed_Wrapper.classList.remove('d-none');
        Vision_Placeholder.classList.add('d-none');
        Vision_Video.muted = true;
    }
});

Vision_Video.addEventListener('loadeddata', () => {
    Vision_Video.play();
    Is_Detecting = true;
    Detect_Frame();
});

Vision_Video.addEventListener('pause', () => Is_Detecting = false);
Vision_Video.addEventListener('play', () => {
    Is_Detecting = true;
    Detect_Frame();
});

function Detect_Frame() {
    if (!Is_Detecting || !AI_Model) return;

    if (Vision_Video.readyState >= 2) {
        const Render_Width = Vision_Video.clientWidth;
        const Render_Height = Vision_Video.clientHeight;

        if (Vision_Canvas.width !== Render_Width || Vision_Canvas.height !== Render_Height) {
            Vision_Canvas.width = Render_Width;
            Vision_Canvas.height = Render_Height;
        }

        AI_Model.detect(Vision_Video, 100, 0.3).then(Predictions => {
            Draw_Predictions(Predictions, Render_Width, Render_Height);
            requestAnimationFrame(Detect_Frame);
        });
    } else {
        requestAnimationFrame(Detect_Frame);
    }
}

function Draw_Predictions(Predictions, Render_Width, Render_Height) {
    Vision_Ctx.clearRect(0, 0, Vision_Canvas.width, Vision_Canvas.height);

    let Total_Vehicles = 0;
    let Emergency_Count = 0;
    const Vehicle_Classes = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];

    let Frame_Lanes = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let Frame_Counts = { 'Scooter': 0, 'Auto': 0, 'Car': 0, 'Bus': 0 };
    
    const Scale_X = Render_Width / Vision_Video.videoWidth;
    const Scale_Y = Render_Height / Vision_Video.videoHeight;

    Predictions.forEach(Prediction => {
        if (Vehicle_Classes.includes(Prediction.class)) {
            Total_Vehicles++;
            
            let Is_Emergency = false;
            let Display_Name = Prediction.class;
            
            let Words = Display_Name.split(' ');
            for (let I = 0; I < Words.length; I++) {
                Words[I] = Words[I].charAt(0).toUpperCase() + Words[I].slice(1).toLowerCase();
            }
            Display_Name = Words.join(' ');

            if (Prediction.class === 'truck') {
                Is_Emergency = true;
                Display_Name = 'Ambulance';
            } else if (Prediction.class === 'bus') {
                Is_Emergency = true;
                Display_Name = 'Police Car';
            }

            if (Is_Emergency) {
                Emergency_Count++;
            }

            const X = Prediction.bbox[0] * Scale_X;
            const Y = Prediction.bbox[1] * Scale_Y;
            const Width = Prediction.bbox[2] * Scale_X;
            const Height = Prediction.bbox[3] * Scale_Y;

            let Mapped_Type = 'Car';
            let Mass = 1.0;
            if (Prediction.class === 'motorcycle' || Prediction.class === 'bicycle') { Mapped_Type = 'Scooter'; Mass = 0.2; }
            else if (Prediction.class === 'truck' || Prediction.class === 'bus') { Mapped_Type = 'Bus'; Mass = 2.5; }
            else { Mapped_Type = 'Car'; Mass = 1.0; }

            if (Frame_Counts[Mapped_Type] !== undefined) {
                Frame_Counts[Mapped_Type]++;
            }

            const Center_X = X + (Width / 2);
            let Lane_Id = Math.floor(Center_X / (Render_Width / 4)) + 1;
            if (Lane_Id < 1) Lane_Id = 1;
            if (Lane_Id > 4) Lane_Id = 4;

            Frame_Lanes[Lane_Id] += Mass;

            Vision_Ctx.strokeStyle = '#00ff88'; 
            Vision_Ctx.lineWidth = 3;
            Vision_Ctx.strokeRect(X, Y, Width, Height);

            Vision_Ctx.fillStyle = '#00ff88';
            Vision_Ctx.font = 'bold 16px Orbitron';
            Vision_Ctx.fillText(
                `${Display_Name}`, 
                X, 
                Y > 20 ? Y - 10 : Y + 20
            );
        }
    });

    window.Camera_Sim_Data.lanes = Frame_Lanes;
    window.Camera_Sim_Data.counts = Frame_Counts;

    Detected_Vehicles.textContent = Total_Vehicles;
    Detected_Emergency.textContent = Emergency_Count;

    const Has_Emergency = Emergency_Count > 0;
    if (Has_Emergency && !Last_Emergency_State) {
        const Ambulance_Btn = document.getElementById('btn-ambulance');
        if (Ambulance_Btn) {
            Ambulance_Btn.click();
        }
    }
    Last_Emergency_State = Has_Emergency;
}
