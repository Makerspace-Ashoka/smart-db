export interface RobuSeedItem {
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly countable: boolean;
  readonly unit?: { readonly symbol: string; readonly name: string; readonly isInteger: boolean };
}

export interface FilamentSeedItem {
  readonly name: string;
  readonly category: string;
  readonly aliases?: readonly string[];
}

export interface ResinSeedItem {
  readonly name: string;
  readonly category: string;
  readonly unit: { readonly symbol: string; readonly name: string; readonly isInteger: boolean };
  readonly aliases?: readonly string[];
}

export const PCS = { symbol: "pcs", name: "Pieces", isInteger: true } as const;
export const KG = { symbol: "kg", name: "Kilograms", isInteger: false } as const;
export const L = { symbol: "L", name: "Liters", isInteger: false } as const;

export const ROBU_SEED_CATALOG: readonly RobuSeedItem[] = [
  { sku: "R257508", name: "Arduino UNO Q (ABX00162, 2GB)", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "1749032", name: "Raspberry Pi 5 Model 4GB", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "1749034", name: "Raspberry Pi 5 Model 8GB", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "R190344", name: "Raspberry Pi Pico 2 W", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "R150220", name: "Raspberry Pi Pico 2", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "1012200", name: "Adafruit Feather nRF52840 Sense", category: "Compute/Single Board Computers", countable: true, unit: PCS },
  { sku: "1470148", name: "STM32 Nucleo-F030R8 Development Board", category: "Compute/Development Boards", countable: true, unit: PCS },
  { sku: "1470139", name: "STM32 Nucleo F303ZE Development Board", category: "Compute/Development Boards", countable: true, unit: PCS },
  { sku: "1382834", name: "STM32 Nucleo-F042K6 Development Board", category: "Compute/Development Boards", countable: true, unit: PCS },
  { sku: "1308083", name: "TowerPro MG90S Mini Digital Servo (180°)", category: "Motors/Servo Motors", countable: true, unit: PCS },
  { sku: "R251563", name: "Pro-Range DS3218 20kg.cm Metal Gear Digital Servo (180°)", category: "Motors/Servo Motors", countable: true, unit: PCS },
  { sku: "43579", name: "TowerPro MG995 Metal Gear Servo (180°)", category: "Motors/Servo Motors", countable: true, unit: PCS },
  { sku: "1331215", name: "Waveshare 30KG Serial Bus Servo", category: "Motors/Servo Motors", countable: true, unit: PCS },
  { sku: "1738071", name: "Waveshare 20kg.cm Bus Servo (106 RPM)", category: "Motors/Servo Motors", countable: true, unit: PCS },
  { sku: "104024", name: "BO Motor 300 RPM Dual Shaft Straight", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "25339", name: "BO Motor 60 RPM Straight", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "51872", name: "N20 12V 600 RPM Micro Metal Gear Motor", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "475525", name: "N20 12V 120 RPM Micro Metal Gear Motor with Encoder", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "476598", name: "N20 6V 70 RPM Micro Metal Gear Motor with Encoder", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "1770457", name: "JGB37-555 12V 500 RPM DC Reduction Motor", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "1770449", name: "JGB37-520 12V 320 RPM DC Reduction Motor", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "1557392", name: "RS775SH 12V 6000 RPM DC Motor (6mm shaft)", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "812266", name: "Pro-Range PGM45775 12V 50 RPM Planetary Gear Motor (392 N·cm)", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "2103", name: "Johnson Geared Motor 1000 RPM (Grade B)", category: "Motors/DC Geared Motors", countable: true, unit: PCS },
  { sku: "R101295", name: "Tarot TL96020 5008 340KV Brushless Motor", category: "Motors/Brushless Motors", countable: true, unit: PCS },
  { sku: "1086410", name: "SunFun D2207 2450KV BLDC Motor", category: "Motors/Brushless Motors", countable: true, unit: PCS },
  { sku: "R110922", name: "T-Motor 2207 v2 1750KV Brushless Motor", category: "Motors/Brushless Motors", countable: true, unit: PCS },
  { sku: "1504803", name: "Eaglepower LA8308 KV90 Brushless Motor", category: "Motors/Brushless Motors", countable: true, unit: PCS },
  { sku: "1272309", name: "T-Motor Antigravity MN5008 KV340 Brushless Motor", category: "Motors/Brushless Motors", countable: true, unit: PCS },
  { sku: "51732", name: "JK42HS40-1204AF-02 NEMA17 4.2 kg-cm Stepper Motor", category: "Motors/Stepper Motors", countable: true, unit: PCS },
  { sku: "30624", name: "Flat 1034 Mobile Phone Vibrator Motor", category: "Motors/Vibration Motors", countable: true, unit: PCS },
  { sku: "1358105", name: "Encapsulated Vibration Motor 8000±2000 RPM", category: "Motors/Vibration Motors", countable: true, unit: PCS },
  { sku: "1555084", name: "TMC2209 v3.0 Stepper Driver Module", category: "Motor Control/Stepper Drivers", countable: true, unit: PCS },
  { sku: "6721", name: "DRV8825 Stepper Driver with Heat Sink", category: "Motor Control/Stepper Drivers", countable: true, unit: PCS },
  { sku: "5828", name: "L298N Motor Driver Module 2A", category: "Motor Control/DC Motor Drivers", countable: true, unit: PCS },
  { sku: "43846", name: "TB6612FNG Motor Driver Module", category: "Motor Control/DC Motor Drivers", countable: true, unit: PCS },
  { sku: "456144", name: "Double BTS7960 43A H-Bridge Motor Driver", category: "Motor Control/DC Motor Drivers", countable: true, unit: PCS },
  { sku: "43740", name: "PCA9685 16-Channel 12-bit PWM/Servo Driver (I2C)", category: "Motor Control/PWM and Servo Drivers", countable: true, unit: PCS },
  { sku: "1782919", name: "Waveshare Serial Bus Servo Driver Board", category: "Motor Control/PWM and Servo Drivers", countable: true, unit: PCS },
  { sku: "1395359", name: "40A 2-6S ESC (3.5mm Banana)", category: "Motor Control/ESCs", countable: true, unit: PCS },
  { sku: "1374858", name: "T-Motor Alpha 80A 12S ESC", category: "Motor Control/ESCs", countable: true, unit: PCS },
  { sku: "181464", name: "DHT22 / AM2302 Digital Temperature & Humidity Sensor", category: "Sensors/Environmental", countable: true, unit: PCS },
  { sku: "835814", name: "GY-BMP280-5V Temperature Sensor Module", category: "Sensors/Environmental", countable: true, unit: PCS },
  { sku: "415967", name: "BMP280 Barometric Pressure & Altitude Sensor (I2C/SPI)", category: "Sensors/Environmental", countable: true, unit: PCS },
  { sku: "R243089", name: "601N1-ICM45686 6-axis IMU Module", category: "Sensors/Inertial", countable: true, unit: PCS },
  { sku: "7876", name: "Pro-Range 400 PPR 2-Phase Optical Rotary Encoder", category: "Sensors/Encoders", countable: true, unit: PCS },
  { sku: "301983", name: "OE-37 Hall Effect Two-Channel Magnetic Encoder", category: "Sensors/Encoders", countable: true, unit: PCS },
  { sku: "70120", name: "Pro-Range 3.7V 1000mAh 30C 1S LiPo Battery", category: "Power/LiPo Batteries", countable: true, unit: PCS },
  { sku: "R261189", name: "Pro-Range 22.2V 16000mAh 25C 6S LiPo Battery (XT-90)", category: "Power/LiPo Batteries", countable: true, unit: PCS },
  { sku: "1125107", name: "Pro-Range 3.7V 5200mAh 25C 1S LiPo Battery", category: "Power/LiPo Batteries", countable: true, unit: PCS },
  { sku: "R149976", name: "Pro-Range INR 21700-P45B 22.2V 4500mAh 6S1P Li-Ion Pack", category: "Power/Li-Ion Batteries", countable: true, unit: PCS },
  { sku: "1323466", name: "Waveshare RPi IR-CUT Camera (B)", category: "Cameras/Raspberry Pi Cameras", countable: true, unit: PCS },
  { sku: "1323462", name: "Waveshare RPi Camera (I, Fisheye)", category: "Cameras/Raspberry Pi Cameras", countable: true, unit: PCS },
  { sku: "1718466", name: "Arducam 12MP USB Camera Module (M12 lens, 4K)", category: "Cameras/USB Cameras", countable: true, unit: PCS },
  { sku: "890198", name: "12V 150mm Stroke Linear Actuator (6000N, 5mm/s)", category: "Actuators/Linear Actuators", countable: true, unit: PCS },
  { sku: "312517", name: "1240 12V DC 0.6A 7.5W Solenoid Door Lock", category: "Actuators/Solenoids", countable: true, unit: PCS },
  { sku: "130279", name: "DC 12V KK-P25/20 8KG Lifting Solenoid Electromagnet", category: "Actuators/Solenoids", countable: true, unit: PCS },
  { sku: "130278", name: "DC 12V KK-P20/15 3KG Lifting Solenoid Electromagnet", category: "Actuators/Solenoids", countable: true, unit: PCS },
  { sku: "301183", name: "DC 3-6V Mini Submersible Water Pump", category: "Actuators/Pumps", countable: true, unit: PCS },
  { sku: "31125", name: "DC 6-12V Aquarium Water Pump R385", category: "Actuators/Pumps", countable: true, unit: PCS },
  { sku: "28414", name: "CNC Aluminum Steering Servo Horn (Futaba 25T)", category: "Mechanical/Servo Accessories", countable: true, unit: PCS },
] as const;

export const FDM_FILAMENT_SEED_CATALOG: readonly FilamentSeedItem[] = [
  { name: "eSUN PLA+ 1.75mm — Black", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Black"] },
  { name: "eSUN PLA+ 1.75mm — White", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "White"] },
  { name: "eSUN PLA+ 1.75mm — Yellow", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Yellow"] },
  { name: "eSUN PLA+ 1.75mm — Red", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Red"] },
  { name: "eSUN PLA+ 1.75mm — Orange", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Orange"] },
  { name: "eSUN PLA+ 1.75mm — Green", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Green"] },
  { name: "eSUN PLA+ 1.75mm — Purple", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Purple"] },
  { name: "eSUN PLA+ 1.75mm — Light Blue", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Light Blue"] },
  { name: "eSUN PLA+ 1.75mm — Brown", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Brown"] },
  { name: "eSUN PLA+ 1.75mm — Pink", category: "Materials/3D Printing Filament/PLA", aliases: ["PLA+", "Pink"] },
  { name: "eSUN PLA Silk Rainbow 1.75mm — Dragon Palace", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Rainbow"] },
  { name: "eSUN PLA Silk Rainbow 1.75mm — Flaming Mountain", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Rainbow"] },
  { name: "eSUN PLA Luminous 1.75mm — Green", category: "Materials/3D Printing Filament/PLA", aliases: ["Luminous", "Glow"] },
  { name: "eSUN PLA Luminous 1.75mm — Rainbow", category: "Materials/3D Printing Filament/PLA", aliases: ["Luminous", "Glow"] },
  { name: "eSUN ePLA-Silk Magic 1.75mm — Red Blue", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Magic"] },
  { name: "eSUN eSilk PLA 1.75mm — Bronze", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Bronze"] },
  { name: "eSUN eSilk PLA 1.75mm — Violet", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Violet"] },
  { name: "eSUN ePLA-Silk Mystic 1.75mm — Gold Green Black", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Mystic"] },
  { name: "eSUN ePLA-Silk Mystic 1.75mm — Gold Red Green", category: "Materials/3D Printing Filament/PLA", aliases: ["Silk", "Mystic"] },
  { name: "eSUN eMarble PLA 1.75mm — Natural Grey", category: "Materials/3D Printing Filament/PLA", aliases: ["Marble", "Grey"] },
  { name: "eSUN ABS+ 1.75mm — Black", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Black"] },
  { name: "eSUN ABS+ 1.75mm — Grey", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Grey"] },
  { name: "eSUN ABS+ 1.75mm — Orange", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Orange"] },
  { name: "eSUN ABS+ 1.75mm — Fire Engine Red", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Red"] },
  { name: "eSUN ABS+ 1.75mm — Silver", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Silver"] },
  { name: "eSUN ABS+ 1.75mm — Light Blue", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Light Blue"] },
  { name: "eSUN ABS+ 1.75mm — Purple", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Purple"] },
  { name: "eSUN ABS+ 1.75mm — Brown", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Brown"] },
  { name: "eSUN ABS+ 1.75mm — Natural", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Natural"] },
  { name: "eSUN ABS+ 1.75mm — Blue", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Blue"] },
  { name: "eSUN ABS+ 1.75mm — Yellow", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Yellow"] },
  { name: "eSUN ABS+ 1.75mm — Pink", category: "Materials/3D Printing Filament/ABS", aliases: ["ABS+", "Pink"] },
  { name: "eSUN PETG 1.75mm — Yellow", category: "Materials/3D Printing Filament/PETG", aliases: ["PETG", "Yellow"] },
  { name: "eSUN PETG 1.75mm — Solid Red", category: "Materials/3D Printing Filament/PETG", aliases: ["PETG", "Red"] },
  { name: "eSUN PETG 1.75mm — Green", category: "Materials/3D Printing Filament/PETG", aliases: ["PETG", "Green"] },
  { name: "eSUN PETG 1.75mm — Translucent Grey", category: "Materials/3D Printing Filament/PETG", aliases: ["PETG", "Grey"] },
  { name: "eSUN PETG 1.75mm — Blue", category: "Materials/3D Printing Filament/PETG", aliases: ["PETG", "Blue"] },
  { name: "eSUN eTPU 1.75mm — White (95A)", category: "Materials/3D Printing Filament/TPU", aliases: ["TPU", "White", "95A"] },
  { name: "eSUN eTPU 1.75mm — Black (95A)", category: "Materials/3D Printing Filament/TPU", aliases: ["TPU", "Black", "95A"] },
  { name: "eSUN eFlex TPU 1.75mm — Natural (87A)", category: "Materials/3D Printing Filament/TPU", aliases: ["TPU", "Flex", "Natural", "87A"] },
  { name: "eSUN eLastic 1.75mm — Black (83A)", category: "Materials/3D Printing Filament/TPU", aliases: ["Elastic", "Black", "83A"] },
  { name: "SunLU TPU 1.75mm — Burgundy (95A)", category: "Materials/3D Printing Filament/TPU", aliases: ["TPU", "Burgundy", "95A"] },
  { name: "eSUN ePA12-CF 1.75mm — Black", category: "Materials/3D Printing Filament/Nylon CF", aliases: ["Nylon", "PA12", "Carbon Fibre"] },
  { name: "eSUN PA-CF 1.75mm — Black", category: "Materials/3D Printing Filament/Nylon CF", aliases: ["Nylon", "PA", "Carbon Fibre"] },
] as const;

export const SLA_RESIN_SEED_CATALOG: readonly ResinSeedItem[] = [
  { name: "Formlabs Clear Resin V5", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Formlabs", "Clear", "V5"] },
  { name: "Formlabs Grey Resin V5", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Formlabs", "Grey", "V5"] },
  { name: "Formlabs Elastic 50A Resin", category: "Materials/SLA Resin/Flexible", unit: L, aliases: ["Formlabs", "Elastic", "50A"] },
  { name: "Elegoo Standard Resin — Grey", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Elegoo", "Grey"] },
  { name: "Elegoo Standard Resin — Black", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Elegoo", "Black"] },
  { name: "Elegoo Standard Resin — Red", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Elegoo", "Red"] },
  { name: "Elegoo Standard Resin — Blue", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Elegoo", "Blue"] },
  { name: "Elegoo Standard Resin — Green", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["Elegoo", "Green"] },
  { name: "eSUN eResin-PLA — Grey", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["eSUN", "PLA", "Grey"] },
  { name: "eSUN eResin-PLA — White", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["eSUN", "PLA", "White"] },
  { name: "eSUN eResin-PLA — Black", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["eSUN", "PLA", "Black"] },
  { name: "eSUN eResin-PLA — Clear", category: "Materials/SLA Resin/Standard", unit: L, aliases: ["eSUN", "PLA", "Clear"] },
  { name: "eSUN eLastic Flexible Resin (0.5 kg)", category: "Materials/SLA Resin/Flexible", unit: KG, aliases: ["eSUN", "Elastic", "Flex"] },
  { name: "eSUN Hard Tough Resin — Black", category: "Materials/SLA Resin/Engineering", unit: L, aliases: ["eSUN", "Tough", "Black"] },
  { name: "eSUN High Temp Resin", category: "Materials/SLA Resin/Engineering", unit: L, aliases: ["eSUN", "High Temp"] },
] as const;
