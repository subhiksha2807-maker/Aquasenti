#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <math.h>

// For a classic ESP32 DevKit, analog pH/turbidity modules and
// an HC-SR04-compatible TRIG/ECHO ultrasonic module.
// Other ESP32 boards or UART ultrasonic sensors need different wiring/code.
// Never connect a bare pH probe directly: use its analog interface board.
// All modules must share GND. Power each according to its specification.
// Protect ESP32 inputs from 5 V. Use a level shifter/divider for 5 V ECHO.
// For analog outputs up to 5 V, a 10k/10k divider gives up to 2.5 V.
// Calibration below uses voltage AT THE ESP32 PIN, after any divider.

const char* WIFI_NAME = "YOUR_PHONE_HOTSPOT";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* TANK_ID = "TN-TANK-001";
const char* LOCALITY = "Tirunelveli";
const char* API_URL = "http://YOUR_BACKEND_ADDRESS/api/tank-reading";
// For an https:// backend, paste its trusted root CA PEM here.
// HTTPS is deliberately blocked until configured; no insecure TLS bypass.
const char* ROOT_CA = "";

constexpr int TURBIDITY_PIN = 34;
constexpr int PH_PIN = 35;
constexpr int TRIG_PIN = 26;
constexpr int ECHO_PIN = 27;

// Replace NAN with measured ESP32 pin voltages in pH 7 and pH 4 buffers.
// Read phVoltage from Serial Monitor. Keep the same divider and wiring.
const float PH7_VOLTS = NAN;
const float PH4_VOLTS = NAN;

// Mount ultrasonic above water, pointing down. Distances are from its face.
// Replace NAN with your measured distances in cm at EMPTY and FULL.
// FULL distance must exceed your ultrasonic module's minimum range.
const float EMPTY_DISTANCE_CM = NAN;
const float FULL_DISTANCE_CM = NAN;

constexpr unsigned long SEND_INTERVAL_MS = 10000;
unsigned long lastSend = 0;
unsigned long lastReconnect = 0;

float readPinVoltage(int pin) {
  uint32_t total = 0;
  for (int i = 0; i < 20; i++) {
    total += analogReadMilliVolts(pin);
    delay(5);
  }
  float volts = total / 20000.0f;
  // Approximate classic ESP32 ADC usable range at 11 dB attenuation.
  // Reject rail readings, which may indicate clipping/wiring issues.
  if (volts < 0.15f || volts > 3.05f) return NAN;
  return volts;
}

float calculatePH(float volts) {
  if (!isfinite(volts) || !isfinite(PH7_VOLTS) ||
      !isfinite(PH4_VOLTS) || fabsf(PH4_VOLTS - PH7_VOLTS) < 0.01f)
    return NAN;
  float ph = 7.0f + (volts - PH7_VOLTS) * (4.0f - 7.0f) /
                          (PH4_VOLTS - PH7_VOLTS);
  return (ph >= 0 && ph <= 14) ? ph : NAN;
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Timeout prevents disconnected/no-echo sensor from hanging the loop.
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) return NAN;
  return duration * 0.0343f / 2.0f; // Approximate speed of sound at 20 C.
}

float calculateLevel(float distance) {
  if (!isfinite(distance) || !isfinite(EMPTY_DISTANCE_CM) ||
      !isfinite(FULL_DISTANCE_CM) || FULL_DISTANCE_CM <= 0 ||
      EMPTY_DISTANCE_CM <= FULL_DISTANCE_CM) return NAN;
  // Reject out-of-tank echoes rather than displaying false 0%/100%.
  if (distance < FULL_DISTANCE_CM || distance > EMPTY_DISTANCE_CM)
    return NAN;
  return 100.0f * (EMPTY_DISTANCE_CM - distance) /
                  (EMPTY_DISTANCE_CM - FULL_DISTANCE_CM);
}

String jsonNumber(float value) {
  return isfinite(value) ? String(value, 3) : String("null");
}

String jsonString(const char* value) {
  String out = "\"";
  for (const char* p = value; *p; ++p) {
    unsigned char c = (unsigned char)*p;
    if (c == '"' || c == '\\') out += '\\';
    if (c < 32) {
      char escaped[7];
      snprintf(escaped, sizeof(escaped), "\\u%04x", c);
      out += escaped;
    } else out += *p;
  }
  return out + "\"";
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  analogReadResolution(12);
  analogSetPinAttenuation(PH_PIN, ADC_11db);
  analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
  Serial.println("Starting WiFi; sensor readings continue while offline.");
  lastSend = millis() - SEND_INTERVAL_MS;
}

void loop() {
  unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED && now - lastReconnect >= 15000UL) {
    lastReconnect = now;
    WiFi.reconnect();
  }
  if (now - lastSend < SEND_INTERVAL_MS) { delay(10); return; }
  lastSend = now;

  float phVoltage = readPinVoltage(PH_PIN);
  float turbidityVoltage = readPinVoltage(TURBIDITY_PIN);
  float distance = readDistanceCm();
  float ph = calculatePH(phVoltage);
  float level = calculateLevel(distance);

  String json = "{\"tankId\":" + jsonString(TANK_ID);
  json += ",\"locality\":" + jsonString(LOCALITY);
  json += ",\"ph\":" + jsonNumber(ph);
  json += ",\"phVoltage\":" + jsonNumber(phVoltage);
  // No universal voltage-to-NTU formula: retain null until model-specific
  // calibration is implemented. Website should show 'Not calibrated'.
  json += ",\"turbidity\":null";
  json += ",\"turbidityVoltage\":" + jsonNumber(turbidityVoltage);
  json += ",\"distanceCm\":" + jsonNumber(distance);
  json += ",\"waterLevel\":" + jsonNumber(level);
  json += "}";
  Serial.println(json);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Offline: reading not uploaded (not buffered).");
    return;
  }
  if (String(API_URL).indexOf("YOUR_BACKEND_ADDRESS") >= 0) {
    Serial.println("Set API_URL to your actual backend endpoint.");
    return;
  }
  WiFiClient plainClient;
  WiFiClientSecure secureClient;
  HTTPClient http;
  bool started = false;
  if (String(API_URL).startsWith("https://")) {
    if (ROOT_CA[0] == '\0') {
      Serial.println("Configure ROOT_CA for HTTPS.");
      return;
    }
    secureClient.setCACert(ROOT_CA);
    started = http.begin(secureClient, API_URL);
  } else if (String(API_URL).startsWith("http://")) {
    started = http.begin(plainClient, API_URL);
  }
  if (!started) { Serial.println("Cannot initialize HTTP URL."); return; }
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  int response = http.POST(json);
  if (response >= 200 && response < 300) {
    Serial.printf("Uploaded: HTTP %d\n", response);
  } else if (response > 0) {
    Serial.printf("Rejected: HTTP %d\n", response);
    Serial.println(http.getString());
  } else {
    Serial.println("Upload failed: " + HTTPClient::errorToString(response));
  }
  http.end();
}
