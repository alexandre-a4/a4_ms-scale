input.onButtonPressed(Button.A, function () {
    HX711WeightSensor.tare()
})
HX711WeightSensor.initialize()
HX711WeightSensor.tare()
lcdDisplay.lcdInitIIC()
lcdDisplay.lcdClearAll()
lcdDisplay.lcdSetBgcolor(0xb09eff)
Keypad4x4.initialize()
basic.forever(function () {
    lcdDisplay.lcdDisplayText("" + Math.round(HX711WeightSensor.weightInGrams()) + "gr", 1, 120, 120, lcdDisplay.FontSize.Large, 0x000000)
    lcdDisplay.lcdDisplayText(Keypad4x4.pressedKey(), 2, 120, 145, lcdDisplay.FontSize.Large, 0x000000)
    basic.pause(500)
})
