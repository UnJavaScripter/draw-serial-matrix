#include <Adafruit_NeoPixel.h>

#define PIN 6
#define NUMPIXELS 256 // x=16 * y=16
#define DELAYVAL 25

Adafruit_NeoPixel matrix(NUMPIXELS, PIN, NEO_GRB + NEO_KHZ800);

const byte messageLength = 16;
char receivedChars[messageLength];
char tempChars[messageLength];

char message[messageLength] = {0};

int action = 0;
int pixel_pos = 0;
int color_r = 0;
int color_g = 0;
int color_b = 0;

boolean newData = false;

void setup() {
    Serial.begin(9600);
    matrix.begin();
    matrix.setBrightness(20);
    matrix.show();
}

void loop() {
    recvWithStartEndMarkers();
    if (newData == true) {
        strcpy(tempChars, receivedChars);
        parseData();
        dispatchAction(action);
        newData = false;
    }
}

void recvWithStartEndMarkers() {
    static boolean recvInProgress = false;
    static byte i = 0;
    char startMarker = '[';
    char endMarker = ']';
    char readCharacter;

    while (Serial.available() > 0 && newData == false) {
        readCharacter = Serial.read();

        if (recvInProgress == true) {
            if (readCharacter != endMarker) {
                receivedChars[i] = readCharacter;
                i++;
                if (i >= messageLength) {
                    i = messageLength - 1;
                }
            }
            else {
                receivedChars[i] = '\0'; // terminate the string
                recvInProgress = false;
                i = 0;
                newData = true;
            }
        }

        else if (readCharacter == startMarker) {
            recvInProgress = true;
        }
    }
}

void dispatchAction(int action_id) {
    if (action_id == 0) {
        paintPixel(pixel_pos, 0, 0, 0);
    }
    
    if (action_id == 1) {
        paintPixel(pixel_pos, color_r, color_g, color_b);
    }

    if (action_id == 2) {
      clearMatrix();
    }

    if (action_id == 3) {
        loopOverMatrix(color_r, color_g, color_b);
    }
}

//============

void parseData() {
    char * strtokIndex; // this is used by strtok() as an index

    strtokIndex = strtok(tempChars,",");      // get the first part - the string
    strcpy(message, strtokIndex); // copy it to message

    action = atoi(message);

    strtokIndex = strtok(NULL, ","); // this continues where the previous call left off
    pixel_pos = atoi(strtokIndex);     // convert this part to an integer

    strtokIndex = strtok(NULL, ","); // this continues where the previous call left off
    color_r = atoi(strtokIndex);     // convert this part to an integer

    strtokIndex = strtok(NULL, ",");
    color_g = atoi(strtokIndex);     // convert this part to a float
    
    strtokIndex = strtok(NULL, ",");
    color_b = atoi(strtokIndex);     // convert this part to a float

}

//============

void showParsedData() {
    Serial.print("action ");
    Serial.println(action);
    Serial.print("pos ");
    Serial.println(pixel_pos);
    Serial.print("r ");
    Serial.println(color_r);
    Serial.print("g ");
    Serial.println(color_g);
    Serial.print("b ");
    Serial.println(color_b);
}

void paintPixel(int position, int r, int g, int b) {
    matrix.setPixelColor(position, matrix.Color(r, g, b));
    matrix.show();
}

void clearMatrix() {
    matrix.clear();
    matrix.show();
}

void loopOverMatrix(int r, int g, int b) {
    matrix.clear();
    for (int i = 0; i < NUMPIXELS; i++) {

        matrix.setPixelColor(i, matrix.Color(r, g, b));
        matrix.show();

        delay(DELAYVAL);
    }
}