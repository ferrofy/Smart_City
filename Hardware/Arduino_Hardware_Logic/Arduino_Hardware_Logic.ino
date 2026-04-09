#include <Servo.h>

Servo My_Servo;

int Current_Angle = 0;
int Step = 1;

void setup() {
  Serial.begin(9600);
  My_Servo.attach(9);
}

void loop() {
  My_Servo.write(Current_Angle);
  
  Serial.println(Current_Angle);
  
  Current_Angle += Step;
  if (Current_Angle >= 180 || Current_Angle <= 0) {
    Step = -Step;
  }
  
  delay(100);
}
