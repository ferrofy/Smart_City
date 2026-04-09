#include <Servo.h>

int irSensor1 = 2;
int irSensor2 = 3;
int greenLed = 4;
int redLed = 5;

int ldrPin = A0;
int streetLight = 6;

int trigPin = 7;
int echoPin = 8;
int moistureSensor = A1;
Servo wasteServo;

void setup() {
  Serial.begin(9600);
  
  pinMode(irSensor1, INPUT);
  pinMode(irSensor2, INPUT);
  pinMode(greenLed, OUTPUT);
  pinMode(redLed, OUTPUT);
  
  pinMode(ldrPin, INPUT);
  pinMode(streetLight, OUTPUT);
  
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(moistureSensor, INPUT);
  wasteServo.attach(9);
}

void loop() {
  int trafficDensity1 = digitalRead(irSensor1);
  int trafficDensity2 = digitalRead(irSensor2);
  
  if (trafficDensity1 == LOW || trafficDensity2 == LOW) {
    digitalWrite(greenLed, HIGH);
    digitalWrite(redLed, LOW);
  } else {
    digitalWrite(greenLed, LOW);
    digitalWrite(redLed, HIGH);
  }
  
  int lightLevel = analogRead(ldrPin);
  
  if (lightLevel < 300) {
    digitalWrite(streetLight, HIGH);
  } else {
    digitalWrite(streetLight, LOW);
  }
  
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;
  
  if (distance < 10) {
    int moistureLevel = analogRead(moistureSensor);
    if (moistureLevel > 400) {
      wasteServo.write(180);
      delay(3000);
      wasteServo.write(90);
    } else {
      wasteServo.write(0);
      delay(3000);
      wasteServo.write(90);
    }
  }
  
  String dataToPy = "{\"light\":" + String(lightLevel) + ",\"waste_distance\":" + String(distance) + "}";
  Serial.println(dataToPy);
  
  delay(1000);
}
