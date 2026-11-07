# Audio Worker Node Capacity Formula
สูตรคำนวณอัตราส่วนและขีดจำกัดการรองรับห้องสตรีมเสียง (Audio Worker Capacity)

---

## ⚡ สูตรสำเร็จรูป (Universal Plug & Play Formula)
ใส่ตัวเลขฮาร์ดแวร์ 3 ตัว:
* **$C$** = จำนวน Cores ของ CPU (ตัว)
* **$R$** = ขนาด RAM รวม (หน่วย GB)
* **$S$** = จำนวน Spawn พร้อมกัน (`MAX_CONCURRENT_SPAWNS` ตัว)

### 📌 สูตรลัดคำนวณห้องที่ไหวจริง ($Rooms$):
$$\mathbf{Rooms} = \min(Rooms_{\text{CPU}}, \; Rooms_{\text{RAM}})$$

$$\begin{aligned}
Rooms_{\text{CPU}} &= \lfloor 4.67 \times C - 6.67 \times S - 1 \rfloor \\
Rooms_{\text{RAM}} &= \lfloor 23.4 \times R - 1.71 \times S - 7.14 \rfloor
\end{aligned}$$

*(ปัดเศษทิ้งเป็นจำนวนเต็ม • ส่วนใหญ่ $Rooms_{\text{CPU}}$ จะเป็นตัวตัดสินเพราะ CPU เป็นคอขวด)*

---

### 📊 ตารางคำนวณสำเร็จรูปยอดนิยม (Quick Reference Table)

| สเปกฮาร์ดแวร์ ($C$ Cores / $R$ GB) | Spawn ($S$) | $Rooms_{\text{CPU}}$ | $Rooms_{\text{RAM}}$ | **ห้องที่เล่นได้จริงแบบ 0% สะดุด** |
|---|:---:|:---:|:---:|:---:|
| **2 Cores / 2 GB** (VPS เล็ก) | 1 | 1 | 38 | **1 – 2 ห้อง** |
| **4 Cores / 2 GB** (กล่อง TV ทั่วไป) | 1 | 11 | 38 | **11 ห้อง** |
| **4 Cores / 4 GB** (Raspberry Pi 4) | 1 | 11 | 85 | **11 ห้อง** |
| **4 Cores / 4 GB** (Raspberry Pi 4) | 2 | 4 | 83 | **4 ห้อง** *(สละ CPU ให้ Spawn 2 คิว)* |
| **8 Cores / 3 GB** (MECOOL BB2 PRO) | **1** | **29** | 61 | **29 ห้อง** *(คิวเดี่ยว)* |
| **8 Cores / 3 GB** (MECOOL BB2 PRO) | **2** | **23** | 59 | **23 ห้อง (แนะนำ)** |
| **8 Cores / 8 GB** (Mini PC x86 / N100) | 2 | 23* | 176 | **35 – 40 ห้อง** *(x86 คอร์แรงกว่า ARM 2 เท่า)* |

---

## 1. แกนสมการหลัก (Core Equation)

$$\text{Base} + \text{Spawn} + \text{Stream} \le \text{Threshold}$$

การคำนวณแยก 2 มิติอิสระ โดย **$N$ (จำนวนห้องสูงสุดที่รับได้)** จะถูกกำหนดด้วยมิติที่เป็นคอขวดต่ำสุด:

$$\min(N_{\text{CPU}}, N_{\text{RAM}})$$

---

## 2. ตัวแปรและสูตรทางคณิตศาสตร์ (Formulas)

### ก. ฝั่ง CPU (ประมวลผลคำนวณ)
$$\text{CPU}_{\text{Base}} + (M \times \text{CPU}_{\text{Spawn}}) + (N \times \text{CPU}_{\text{Stream}}) \le \text{CPU}_{\text{MaxSafe}}$$

$$N_{\text{CPU}} \le \frac{\text{CPU}_{\text{MaxSafe}} - \text{CPU}_{\text{Base}} - (M \times \text{CPU}_{\text{Spawn}})}{\text{CPU}_{\text{Stream}}}$$

### ข. ฝั่ง RAM (หน่วยความจำ)
$$\text{RAM}_{\text{Base}} + (M \times \text{RAM}_{\text{Spawn}}) + (N \times \text{RAM}_{\text{Stream}}) \le \text{RAM}_{\text{MaxSafe}}$$

$$N_{\text{RAM}} \le \frac{\text{RAM}_{\text{MaxSafe}} - \text{RAM}_{\text{Base}} - (M \times \text{RAM}_{\text{Spawn}})}{\text{RAM}_{\text{Stream}}}$$

### นิยามตัวแปร (Variables Definition)
* $N$ = จำนวนห้องสตรีมเสียงที่เล่นพร้อมกัน (Active Rooms)
* $M$ = ขีดจำกัดการสปอว์นแกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS`) แนะนำตั้งไว้ที่ $1$ หรือ $2$
* $\text{CPU}_{\text{MaxSafe}}$ = ขีดจำกัด CPU ที่ปลอดภัย แนะนำตั้งไว้ที่ **$70\% \text{ ของ Total Cores}$** (เพื่อป้องกัน Thermal Throttling และป้องกัน Jitter/Audio Stutter)
* $\text{RAM}_{\text{MaxSafe}}$ = หน่วยความจำแรมที่ปลอดภัย แนะนำตั้งไว้ที่ **$80\% \text{ ของ Physical RAM}$** (กัน OS OOM Killer)

---

## 3. ค่ามาตรฐานอ้างอิงต่อหน่วย (Benchmark Table)

อ้างอิงบนสถาปัตยกรรม **ARM64 (Cortex-A53 1.5 GHz)** เช่น Amlogic S905/S912 หรือ Allwinner H6:

| องค์ประกอบ | สัญลักษณ์ | การกิน CPU | การกิน RAM | พฤติกรรม |
|---|---|---|---|---|
| **Base System** | $\text{Base}$ | **15%** (0.15 Core) | **220 MB** | Armbian Headless CLI + PM2 + Node.js Worker Daemon |
| **Spawn (ต่อ 1 คิว)** | $\text{Spawn}$ | **100%** (1.00 Core) | **60 MB** | `yt-dlp` รัน Python + JS runtime สกัด URL สั้นๆ (1.5–2 วินาที) |
| **Stream (ต่อ 1 ห้อง)** | $\text{Stream}$ | **15%** (0.15 Core) | **35 MB** | FFmpeg pipe + Opus 48kHz audio packetizing |

---

## 4. ตัวอย่างการคำนวณจริง: กล่อง MECOOL BB2 PRO (S912 / 8 Cores / RAM 3GB)

### ข้อมูลสเปก
* **Total CPU Cores:** 8 Cores ($800\%$) $\to$ $\text{CPU}_{\text{MaxSafe}} = 800\% \times 70\% = \mathbf{560\%}$
* **Physical RAM:** 3,072 MB $\to$ $\text{RAM}_{\text{MaxSafe}} = 3,072 \text{ MB} \times 80\% \approx \mathbf{2,400\text{ MB}}$
* **ตั้งค่า Queue:** $M = 2$ (`MAX_CONCURRENT_SPAWNS=2`)

---

### ขั้นตอนคำนวณ $N_{\text{CPU}}$:
$$15\% + (2 \times 100\%) + (N \times 15\%) \le 560\%$$
$$215\% + 15\%N \le 560\%$$
$$15\%N \le 345\%$$
$$N_{\text{CPU}} \le \frac{345}{15} = \mathbf{23 \text{ ห้อง}}$$

---

### ขั้นตอนคำนวณ $N_{\text{RAM}}$:
$$220\text{ MB} + (2 \times 60\text{ MB}) + (N \times 35\text{ MB}) \le 2,400\text{ MB}$$
$$340\text{ MB} + 35\text{ MB} \times N \le 2,400\text{ MB}$$
$$35\text{ MB} \times N \le 2,060\text{ MB}$$
$$N_{\text{RAM}} \le \frac{2,060}{35} = \mathbf{58 \text{ ห้อง}}$$

---

### ขีดจำกัดสรุป:
$$N = \min(23, 58) = \mathbf{23 \text{ ห้อง}}$$
*(คอขวดอยู่ที่ CPU • RAM เหลือเฟือเกินพอ)*

---

## 5. ตารางอัตราส่วน (Proportions & Ratios)

### 1. อัตราส่วนการกินทรัพยากรต่อ 1 หน่วย (Spawn : Stream)
* **CPU Ratio:**
  $$\text{Spawn} : \text{Stream} = 100\% : 15\% \approx \mathbf{6.7 : 1}$$
  *(โหลด CPU ของการแกะ 1 เพลง เทียบเท่ากับเปิดสตรีมทิ้งไว้ 6.7 ห้อง)*
* **RAM Ratio:**
  $$\text{Spawn} : \text{Stream} = 60\text{ MB} : 35\text{ MB} \approx \mathbf{1.7 : 1}$$

---

### 2. อัตราส่วนจัดสรรทรัพยากร (Resource Allocation Ratio)

#### ก. สัดส่วนแบ่งเค้ก CPU (ที่ขีดจำกัดปลอดภัย 560%)
$$\text{Base} : \text{Spawn Buffer (2 คิว)} : \text{Streams Pool (23 ห้อง)}$$
$$15\% : 200\% : 345\%$$
* **คิดเป็นร้อยละ:** $\mathbf{3\% : 36\% : 61\%}$

#### ข. สัดส่วนแบ่งเค้ก RAM (ที่ขีดจำกัดปลอดภัย 2,400 MB)
$$\text{Base} : \text{Spawn Buffer} : \text{Streams Pool (23 ห้อง)} : \text{Headroom Buffer}$$
$$220\text{ MB} : 120\text{ MB} : 805\text{ MB} : 1,255\text{ MB}$$
* **คิดเป็นร้อยละ:** $\mathbf{9\% : 5\% : 34\% : 52\%}$

---

### 3. อัตราส่วนประสิทธิภาพต่อฮาร์ดแวร์ (Efficiency Ratios)
* **Core-to-Room Ratio:** $\mathbf{1 \text{ Core} : 2.87 \text{ ห้อง}}$
* **Price-to-Room Ratio:** $\mathbf{21.7 \text{ บาท} : 1 \text{ ห้อง}}$ *(500 บาท / 23 ห้อง จ่ายครั้งเดียว)*
* **Power-to-Room Ratio:** $\mathbf{0.26 \text{ Watt} : 1 \text{ ห้อง}}$ *(ตัวเครื่องกินไฟ 6 Watts)*

---

## 6. ข้อกำหนดการจูนระบบ (Tuning Guidelines)
1. **ล็อก Spawns:** ตั้ง `MAX_CONCURRENT_SPAWNS=1` หรือ `2` ใน `.env` เสมอ เพื่อไม่ให้ CPU สไปก์เกิน 100% จนแย่งทรัพยากรของสตรีมที่กำลังเล่นอยู่
2. **eMMC Storage:** ติดตั้งระบบลง eMMC ภายในกล่องแทน MicroSD เพื่อให้ Python และ `yt-dlp` โหลด I/O ไว ลดเวลา Spawn ลงเหลือ < 1.5 วินาที
3. **พัดลมระบายอากาศ:** ติดพัดลม 5V USB เป่ากล่อง TV Box เสมอเพื่อให้อุณหภูมิชิปต่ำกว่า 65°C ป้องกันการลด Clock Speed (Thermal Throttling)
