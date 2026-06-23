/**
 * MakeCode extension for:
 * - DFRobot HX711 I2C Weight Sensor Module V1.0
 * - 4x4 passive matrix keypad
 */

/**
 * Blocks for the DFRobot HX711 I2C Weight Sensor.
 */
//% weight=100 color=#0fbc11 icon="\uf24e" block="a4 Weight Sensor"
namespace HX711WeightSensor {
    const HX711_ADDR = 0x64

    const REG_CLEAR_REG_STATE = 0x65
    const REG_DATA_GET_RAM_DATA = 0x66
    const REG_DATA_GET_PEEL_FLAG = 0x69
    const REG_DATA_INIT_SENSOR = 0x70
    const REG_CLICK_RST = 0x73

    let offset = 0
    let calibrationFactor = 2236

    function writeRegister(registerAddress: number, value: number = 0): void {
        let buffer = pins.createBuffer(2)
        buffer.setNumber(NumberFormat.UInt8LE, 0, registerAddress)
        buffer.setNumber(NumberFormat.UInt8LE, 1, value)
        pins.i2cWriteBuffer(HX711_ADDR, buffer)
        basic.pause(50)
    }

    function readRegister(registerAddress: number, size: number): Buffer {
        let buffer = pins.createBuffer(1)
        buffer.setNumber(NumberFormat.UInt8LE, 0, registerAddress)
        pins.i2cWriteBuffer(HX711_ADDR, buffer)
        basic.pause(22)
        return pins.i2cReadBuffer(HX711_ADDR, size)
    }

    /**
     * Initialize the HX711 I2C weight sensor.
     */
    //% block="initialize HX711 weight sensor"
    //% weight=100
    export function initialize(): void {
        let buffer = pins.createBuffer(2)
        buffer.setNumber(NumberFormat.UInt8LE, 0, REG_DATA_INIT_SENSOR)
        buffer.setNumber(NumberFormat.UInt8LE, 1, REG_CLEAR_REG_STATE)
        pins.i2cWriteBuffer(HX711_ADDR, buffer)
        basic.pause(200)

        tare()
    }

    /**
     * Set the current load as zero.
     */
    //% block="tare weight sensor"
    //% weight=90
    export function tare(): void {
        offset = rawAverage(10)
        writeRegister(REG_CLICK_RST, 0)
    }

    /**
     * Set the calibration factor.
     * A larger calibration factor gives a smaller displayed weight.
     */
    //% block="set weight calibration factor to %value"
    //% value.min=1 value.defl=2236
    //% weight=80
    export function setCalibrationFactor(value: number): void {
        calibrationFactor = value
    }

    /**
     * Read the current weight in grams.
     */
    //% block="weight in grams"
    //% weight=70
    export function weightInGrams(): number {
        let value = rawAverage(12)
        return (value - offset) / calibrationFactor
    }

    /**
     * Read the current weight in grams using a custom number of samples.
     */
    //% block="weight in grams with %samples samples"
    //% samples.min=1 samples.max=50 samples.defl=12
    //% weight=60
    export function weightInGramsWithSamples(samples: number): number {
        let value = rawAverage(samples)
        return (value - offset) / calibrationFactor
    }

    /**
     * Read the raw value from the sensor.
     * This is useful for testing and calibration.
     */
    //% block="raw weight value"
    //% weight=50
    export function rawValue(): number {
        let data = readRegister(REG_DATA_GET_RAM_DATA, 4)

        if (data.getNumber(NumberFormat.UInt8LE, 0) != 0x12) {
            return 0
        }

        let value = data.getNumber(NumberFormat.UInt8LE, 1)
        value = value * 256 + data.getNumber(NumberFormat.UInt8LE, 2)
        value = value * 256 + data.getNumber(NumberFormat.UInt8LE, 3)

        return value ^ 0x800000
    }

    /**
     * Read the average of several raw sensor values.
     */
    //% block="average raw weight value with %samples samples"
    //% samples.min=1 samples.max=50 samples.defl=10
    //% weight=40
    export function rawAverage(samples: number): number {
        let sum = 0
        for (let i = 0; i < samples; i++) {
            sum += rawValue()
            basic.pause(5)
        }
        return sum / samples
    }

    /**
     * Read the sensor tare flag.
     */
    //% block="weight sensor tare flag"
    //% weight=30
    export function tareFlag(): number {
        let data = readRegister(REG_DATA_GET_PEEL_FLAG, 1)
        return data.getNumber(NumberFormat.UInt8LE, 0)
    }
}

/**
 * Blocks for a 4x4 passive matrix keypad.
 *
 * Wiring with reversed 8-pin connector:
 *
 * Row 1 -> P15 keys 1,2,3,A
 * Row 2 -> P14 keys 4,5,6,B
 * Row 3 -> P13 keys 7,8,9,C
 * Row 4 -> P8  keys *,0,#,D
 *
 * Column 1 -> P3 keys 1,4,7,*
 * Column 2 -> P2 keys 2,5,8,0
 * Column 3 -> P1 keys 3,6,9,#
 * Column 4 -> P0 keys A,B,C,D
 *
 * Note:
 * P3 is shared with the micro:bit LED matrix.
 * The LED display is disabled automatically when the keypad is initialized.
 */
//% weight=95 color=#1e90ff icon="\uf11c" block="a4 Keypad 4x4"
namespace Keypad4x4 {
    let lastKey = ""
    let debounceTimeMs = 80

    function configurePins(): void {
        // P3 is shared with the LED matrix.
        // Disable the display so P3 can be used reliably as a GPIO pin.
        led.enable(false)

        // Rows as inputs with pull-up
        pins.setPull(DigitalPin.P15, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P14, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P13, PinPullMode.PullUp)
        pins.setPull(DigitalPin.P8, PinPullMode.PullUp)

        // Columns as outputs, idle HIGH
        pins.digitalWritePin(DigitalPin.P3, 1)
        pins.digitalWritePin(DigitalPin.P2, 1)
        pins.digitalWritePin(DigitalPin.P1, 1)
        pins.digitalWritePin(DigitalPin.P0, 1)
    }

    function setAllColumnsHigh(): void {
        pins.digitalWritePin(DigitalPin.P3, 1)
        pins.digitalWritePin(DigitalPin.P2, 1)
        pins.digitalWritePin(DigitalPin.P1, 1)
        pins.digitalWritePin(DigitalPin.P0, 1)
    }

    function setColumnLow(column: number): void {
        setAllColumnsHigh()

        if (column == 0) {
            pins.digitalWritePin(DigitalPin.P3, 0)
        } else if (column == 1) {
            pins.digitalWritePin(DigitalPin.P2, 0)
        } else if (column == 2) {
            pins.digitalWritePin(DigitalPin.P1, 0)
        } else {
            pins.digitalWritePin(DigitalPin.P0, 0)
        }

        control.waitMicros(200)
    }

    function readRow(): number {
        if (pins.digitalReadPin(DigitalPin.P15) == 0) {
            return 0
        }
        if (pins.digitalReadPin(DigitalPin.P14) == 0) {
            return 1
        }
        if (pins.digitalReadPin(DigitalPin.P13) == 0) {
            return 2
        }
        if (pins.digitalReadPin(DigitalPin.P8) == 0) {
            return 3
        }

        return -1
    }

    function keyFromPosition(row: number, column: number): string {
        if (row == 0 && column == 0) return "1"
        if (row == 0 && column == 1) return "2"
        if (row == 0 && column == 2) return "3"
        if (row == 0 && column == 3) return "A"

        if (row == 1 && column == 0) return "4"
        if (row == 1 && column == 1) return "5"
        if (row == 1 && column == 2) return "6"
        if (row == 1 && column == 3) return "B"

        if (row == 2 && column == 0) return "7"
        if (row == 2 && column == 1) return "8"
        if (row == 2 && column == 2) return "9"
        if (row == 2 && column == 3) return "C"

        if (row == 3 && column == 0) return "*"
        if (row == 3 && column == 1) return "0"
        if (row == 3 && column == 2) return "#"
        if (row == 3 && column == 3) return "D"

        return ""
    }

    function scanWithoutDebounce(): string {
        configurePins()

        for (let column = 0; column < 4; column++) {
            setColumnLow(column)

            let row = readRow()

            if (row >= 0) {
                setAllColumnsHigh()
                return keyFromPosition(row, column)
            }
        }

        setAllColumnsHigh()
        return ""
    }

    /**
     * Initialize the 4x4 keypad.
     * This disables the micro:bit LED display so P3 can be used reliably.
     */
    //% block="initialize 4x4 keypad"
    //% weight=100
    export function initialize(): void {
        configurePins()
        lastKey = ""
    }

    /**
     * Read the key currently being pressed.
     * Returns an empty string if no key is pressed.
     */
    //% block="keypad pressed key"
    //% weight=90
    export function pressedKey(): string {
        let firstRead = scanWithoutDebounce()

        if (firstRead == "") {
            lastKey = ""
            return ""
        }

        basic.pause(debounceTimeMs)

        let secondRead = scanWithoutDebounce()

        if (firstRead == secondRead) {
            lastKey = firstRead
            return firstRead
        }

        return ""
    }

    /**
     * Wait until a key is pressed, then return that key.
     */
    //% block="wait for keypad key"
    //% weight=80
    export function waitForKey(): string {
        let key = ""

        while (key == "") {
            key = pressedKey()
            basic.pause(10)
        }

        // Wait for key release to avoid immediate repeated readings.
        while (scanWithoutDebounce() != "") {
            basic.pause(10)
        }

        return key
    }

    /**
     * Check if a specific key is currently pressed.
     */
    //% block="keypad key %key is pressed"
    //% key.defl="1"
    //% weight=70
    export function keyIsPressed(key: string): boolean {
        return pressedKey() == key
    }

    /**
     * Set the keypad debounce time in milliseconds.
     */
    //% block="set keypad debounce time to %ms ms"
    //% ms.min=10 ms.max=500 ms.defl=80
    //% weight=60
    export function setDebounceTime(ms: number): void {
        debounceTimeMs = ms
    }

    /**
     * Return the last valid key that was read.
     */
    //% block="last keypad key"
    //% weight=50
    export function lastPressedKey(): string {
        return lastKey
    }

    /**
     * Disable the microbit LED display to release P3 for GPIO use.
     */
    //% block="disable microbit display for P3"
    //% weight=30
    export function disableDisplayForP3(): void {
        led.enable(false)
    }

    /**
     * Enable the microbit LED display again.
     * Warning: P3 may no longer work reliably for the keypad.
     */
    //% block="enable microbit display"
    //% weight=20
    export function enableDisplay(): void {
        led.enable(true)
    }
}
}
