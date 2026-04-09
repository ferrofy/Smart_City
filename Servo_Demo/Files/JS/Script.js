const Connect_Button = document.getElementById('Connect_Button');
const Angle_Value = document.getElementById('Angle_Value');
const Status_Text = document.getElementById('Status_Text');

let Port_Object;
let Reader_Object;

async function Connect_To_Serial() {
    try {
        Port_Object = await navigator.serial.requestPort();
        await Port_Object.open({ baudRate: 9600 });
        
        Status_Text.innerText = 'Status: Connected';
        Status_Text.style.color = '#58a6ff';
        Connect_Button.style.display = 'none';

        Read_Loop();
    } catch {
        Status_Text.innerText = 'Status: Connection Failed';
        Status_Text.style.color = '#f85149';
    }
}

async function Read_Loop() {
    const Text_Decoder = new window.TextDecoderStream();
    const Readable_Stream_Closed = Port_Object.readable.pipeTo(Text_Decoder.writable);
    Reader_Object = Text_Decoder.readable.getReader();

    let Buffer_String = '';

    while (true) {
        const { value, done } = await Reader_Object.read();
        if (done) {
            break;
        }
        
        Buffer_String += value;
        const Parts_Array = Buffer_String.split('\n');
        
        if (Parts_Array.length > 1) {
            const Latest_Value = Parts_Array[Parts_Array.length - 2].trim();
            if (!isNaN(Latest_Value) && Latest_Value !== '') {
                Angle_Value.innerText = Latest_Value;
            }
            Buffer_String = Parts_Array[Parts_Array.length - 1];
        }
    }
}

Connect_Button.addEventListener('click', Connect_To_Serial);
