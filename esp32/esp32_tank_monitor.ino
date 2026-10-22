/*
  AquaSentinel ESP32 sender
  Sensor calibration is required for actual hardware. The conversion functions
  below are placeholders to be replaced with calibration curves from reference tests.
*/
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_PHONE_HOTSPOT_NAME";
const char* WIFI_PASSWORD = "YOUR_HOTSPOT_PASSWORD";
const char* BACKEND_URL = "http://192.168.43.120:8000/api/readings"; // Laptop IPv4, never localhost
const char* API_KEY = "CHANGE_ME";
const char* TANK_ID = "TN-TANK-001";

const int TURBIDITY_PIN = 34;
const int TDS_PIN = 35;
const int WATER_LEVEL_PIN = 32;
const unsigned long SEND_INTERVAL_MS = 60000;
unsigned long lastSent = 0;

float voltageFromAdc(int raw) {
  return raw * (3.3f / 4095.0f);
}

float calibratedTurbidityNtu(int raw) {
  float voltage = voltageFromAdc(raw);
  // DEMO approximation only. Replace coefficients after calibration with known samples.
  return max(0.0f, (3.0f - voltage) * 35.0f);
}

float calibratedTdsPpm(int raw) {
  float voltage = voltageFromAdc(raw);
  // DEMO approximation only; temperature compensation and calibration are required.
  return max(0.0f, voltage * 170.0f);
}

float calibratedWaterLevelPercent(int raw) {
  // Set these values from actual empty/full tank measurements.
  const int emptyAdc = 400;
  const int fullAdc = 3300;
  return constrain((raw - emptyAdc) * 100.0f / (fullAdc - emptyAdc), 0.0f, 100.0f);
}

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to hotspot");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
}

void sendReading() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();

  float turbidity = calibratedTurbidityNtu(analogRead(TURBIDITY_PIN));
  float tds = calibratedTdsPpm(analogRead(TDS_PIN));
  float waterLevel = calibratedWaterLevelPercent(analogRead(WATER_LEVEL_PIN));
  String json = "{\"tankId\":\"" + String(TANK_ID) + "\",\"turbidity\":" + String(turbidity, 1)
    + ",\"tds\":" + String(tds, 1) + ",\"waterLevel\":" + String(waterLevel, 1) + "}";

  WiFiClient client;
  HTTPClient http;
  http.begin(client, BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);
  int code = http.POST(json);
  Serial.printf("POST response: %d\n", code);
  if (code > 0) Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  connectWifi();
  sendReading();
  lastSent = millis();
}

void loop() {
  if (millis() - lastSent >= SEND_INTERVAL_MS) {
    sendReading();
    lastSent = millis();
  }
  delay(100);
}
