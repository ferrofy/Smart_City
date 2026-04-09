import serial
import requests
import time
import json

arduino_port = 'COM3'
baud_rate = 9600
django_url = 'http://127.0.0.1:8000/api/update_sensor_data/'

try:
    ser = serial.Serial(arduino_port, baud_rate, timeout=1)
    time.sleep(2)
except Exception as e:
    ser = None

while True:
    if ser:
        if ser.in_waiting > 0:
            raw_data = ser.readline().decode('utf-8').strip()
            if raw_data:
                try:
                    sensor_payload = json.loads(raw_data)
                    response = requests.post(django_url, json=sensor_payload)
                except Exception as e:
                    pass
    time.sleep(1)
