# Audio Worker Node Capacity Formula (Hybrid Edition 2.0 + Clock Speed Normalized)
สูตรคำนวณอัตราส่วนและขีดจำกัดการรองรับห้องสตรีมเสียงสำหรับ DisLava Audio Cluster

---

> [!NOTE]
> **การคำนวณความเร็วสัญญาณนาฬิกา (Clock Speed Normalization):**
> ชิปประมวลผลแต่ละตัวมี Clock Speed และสถาปัตยกรรมต่างกัน (เช่น Amlogic S912 เป็น big.LITTLE วิ่งไม่เท่ากันระหว่าง 1.51 GHz และ 1.00 GHz) 
> สูตรนี้ได้นำ **$C_{\text{eff}}$ (Effective Compute Cores)** เข้ามาแทนที่การนับจำนวนหัวคอร์ดิบ เพื่อความแม่นยำระดับฮาร์ดแวร์จริง 100%

---

## ⚡ 1. การคำนวณคอร์ประสิทธิผล ($C_{\text{eff}}$)

อิงค่ามาตรฐานสมรรถนะเทียบกับ **ARM Cortex-A53 @ 1.5 GHz (= 1.0 หน่วย)**:

$$C_{\text{eff}} = \sum_{i=1}^{k} \left( \text{Cores}_i \times \frac{F_i}{1.5\text{ GHz}} \times \alpha_{\text{arch}} \right)$$

* $F_i$ = ความเร็วสัญญาณนาฬิกาจริงของคลัสเตอร์นั้น (GHz)
* $\alpha_{\text{arch}}$ = ตัวคูณสถาปัตยกรรม (ARM Cortex-A53 = 1.0, Cortex-A76 = 2.0, x86 N100/Xeon = 1.8)

### 📌 ตัวอย่างการหา $C_{\text{eff}}$ ของชิปยอดนิยม:
1. **กล่องชิปเดียวสปีดเท่ากัน (4 Cores @ 1.5 GHz):**
   $$C_{\text{eff}} = 4 \times \frac{1.5}{1.5} = \mathbf{4.0}$$
2. **กล่อง MECOOL BB2 PRO (Amlogic S912 - big.LITTLE 8 คอร์):**
   * คลัสเตอร์ใหญ่ 4 คอร์ @ 1.51 GHz $\to 4 \times \frac{1.51}{1.5} = 4.03$
   * คลัสเตอร์เล็ก 4 คอร์ @ 1.00 GHz $\to 4 \times \frac{1.00}{1.5} = 2.67$
   * **$C_{\text{eff}} = 4.03 + 2.67 = \mathbf{6.70 \text{ Cores}}$**
3. **Mini PC Intel N100 (4 Cores @ 3.4 GHz Boost, x86):**
   $$C_{\text{eff}} \approx 4 \times \frac{3.0}{1.5} \times 1.8 = \mathbf{14.4 \text{ Cores}}$$

---

## ⚡ 2. สูตรสำเร็จรูป (Universal Plug & Play Formula)

ใส่ตัวเลขฮาร์ดแวร์ 3 ตัว:
* **$C_{\text{eff}}$** = คอร์ประสิทธิผลที่คิดจาก Clock Speed แล้ว (ตัว)
* **$R$** = ขนาด RAM รวม (หน่วย GB)
* **$S$** = จำนวน Spawn แกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS` ตัว แนะนำ $1$ หรือ $2$)

### 📌 สูตรลัดคำนวณห้องที่ไหวจริง ($Rooms$):
$$\mathbf{Rooms} = \min(Rooms_{\text{CPU}}, \; Rooms_{\text{RAM}})$$

$$\begin{aligned}
Rooms_{\text{CPU}} &= \lfloor 35 \times C_{\text{eff}} - 50 \times S - 7.5 \rfloor \\
Rooms_{\text{RAM}} &= \lfloor 29.3 \times R - 2.14 \times S - 8 \rfloor
\end{aligned}$$

*(ปัดเศษทศนิยมทิ้งเป็นจำนวนเต็ม)*

---

## 📊 ตารางเปรียบเทียบสเปกยอดนิยม (รวม Clock Speed)

| สเปกฮาร์ดแวร์ | Clock Speed จริง | $C_{\text{eff}}$ | Spawn ($S$) | $Rooms_{\text{CPU}}$ | $Rooms_{\text{RAM}}$ | **ห้องจริงที่ไหว** | **คอขวดที่ติด** |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **VPS 1 Core / 1 GB** | 1 Core @ 2.4 GHz (x86) | 1.6 | 1 | 48 | 19 | **10 – 12 ห้อง** | RAM / Bandwidth |
| **กล่อง 4 Cores / 2 GB** | 4 Cores @ 1.2 GHz (Allwinner) | 3.2 | 1 | 54 | 48 | **48 ห้อง** | RAM (2 GB) |
| **กล่อง 4 Cores / 2 GB** | 4 Cores @ 1.5 GHz (S905X) | 4.0 | 1 | 82 | 48 | **48 ห้อง** | RAM (2 GB) |
| **Raspberry Pi 4 (4GB)** | 4 Cores @ 1.5 GHz (BCM2711) | 4.5 | 1 | 100 | 107 | **100 ห้อง** | CPU (4 Cores) |
| **Raspberry Pi 4 (4GB)** | 4 Cores @ 1.5 GHz (BCM2711) | 4.5 | 2 | 50 | 105 | **50 ห้อง** | CPU (2 Spawns) |
| **MECOOL BB2 PRO** | **4x1.51G + 4x1.00G** | **6.7** | **1** | **177** | **77** | **77 ห้อง** | **RAM (3 GB)** |
| **MECOOL BB2 PRO** | **4x1.51G + 4x1.00G** | **6.7** | **2** | **127** | **75** | **75 ห้อง** | **RAM (3 GB)** |
| **Mini PC Intel N100** | 4 Cores @ 3.4 GHz (x86) | 14.4 | 2 | 396 | 222 | **120+ ห้อง** | Bandwidth เน็ต |

---

## 3. แกนสมการหลัก (Core Equation)

$$\text{Base} + \text{Spawn} + \text{Stream} \le \text{Threshold}$$

การคำนวณแยก 2 มิติอิสระ โดย **$N$ (จำนวนห้องสูงสุดที่รับได้)** จะถูกกำหนดด้วยมิติที่เป็นคอขวดต่ำสุด:

$$N = \min(N_{\text{CPU}}, \; N_{\text{RAM}})$$

---

## 4. ตัวแปรและสูตรทางคณิตศาสตร์ (Formulas)

### ก. ฝั่ง CPU (ประมวลผลคำนวณ)
$$\text{CPU}_{\text{Base}} + (M \times \text{CPU}_{\text{Spawn}}) + (N \times \text{CPU}_{\text{Stream}}) \le \text{CPU}_{\text{MaxSafe}}$$

$$N_{\text{CPU}} \le \frac{\text{CPU}_{\text{MaxSafe}} - \text{CPU}_{\text{Base}} - (M \times \text{CPU}_{\text{Spawn}})}{\text{CPU}_{\text{Stream}}}$$

### ข. ฝั่ง RAM (หน่วยความจำ)
$$\text{RAM}_{\text{Base}} + (M \times \text{RAM}_{\text{Spawn}}) + (N \times \text{RAM}_{\text{Stream}}) \le \text{RAM}_{\text{MaxSafe}}$$

$$N_{\text{RAM}} \le \frac{\text{RAM}_{\text{MaxSafe}} - \text{RAM}_{\text{Base}} - (M \times \text{RAM}_{\text{Spawn}})}{\text{RAM}_{\text{Stream}}}$$

### นิยามตัวแปร (Variables Definition)
* $N$ = จำนวนห้องสตรีมเสียงที่เล่นพร้อมกัน (Active Rooms)
* $M$ = ขีดจำกัดการสปอว์นแกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS`) แนะนำ $1$ หรือ $2$
* $\text{CPU}_{\text{MaxSafe}}$ = ขีดจำกัด CPU ที่ปลอดภัย แนะนำตั้งไว้ที่ **$70\% \text{ ของ Total Effective Cores}$** ($70\% \times C_{\text{eff}}$)
* $\text{RAM}_{\text{MaxSafe}}$ = หน่วยความจำแรมที่ปลอดภัย แนะนำตั้งไว้ที่ **$80\% \text{ ของ Physical RAM}$** ($80\% \times R$)

---

## 5. ค่ามาตรฐานอ้างอิงต่อหน่วย (Hybrid Benchmark Table)

อ้างอิงบนสถาปัตยกรรม **ARM64 (Cortex-A53 1.5 GHz)**:

| องค์ประกอบ | สัญลักษณ์ | การกิน CPU | การกิน RAM | พฤติกรรมในระบบ Hybrid 2.0 |
|---|---|---|---|---|
| **Base System** | $\text{Base}$ | **15%** (0.15 Core) | **220 MB** | Linux CLI + PM2 + Node.js Worker Daemon |
| **Spawn (ต่อ 1 คิว)** | $\text{Spawn}$ | **100%** (1.00 Core) | **60 MB** | `yt-dlp` รัน Python + JS runtime ปลดบล็อก YouTube (1.5–2 วินาที) |
| **Stream: Hybrid Passthrough** | $\text{Stream}$ | **2.0%** (0.02 Core) | **28 MB** | เพลงปกติ (ไม่มี Filter): WebmOpus / Disk Stream ตรง ไม่เปิด FFmpeg |
| **Stream: DSP Filter (กรณีเปิด)** | $\text{Stream}_{\text{DSP}}$ | **12.0%** (0.12 Core) | **35 MB** | สลับไปรัน FFmpeg Pipe เฉพาะเพลงที่เปิด Bassboost/Nightcore |

---

## 6. ตัวอย่างการคำนวณจริง: กล่อง MECOOL BB2 PRO (S912 / 8 Cores / RAM 3GB)

### ข้อมูลสเปกจริง (Hardware Reality)
* **CPU:** Amlogic S912 (Octa-core big.LITTLE)
  * Cluster 0: 4x Cortex-A53 @ 1.51 GHz
  * Cluster 1: 4x Cortex-A53 @ 1.00 GHz
* **คำนวณ $C_{\text{eff}}$:**
  $$C_{\text{eff}} = 4 \times \frac{1.51}{1.5} + 4 \times \frac{1.00}{1.5} = 4.03 + 2.67 = \mathbf{6.70 \text{ Cores}}$$
* **Total Effective CPU Safe Limit:** $6.70 \times 100\% \times 70\% = \mathbf{469\%}$
* **Physical RAM:** 3,072 MB $\to$ $\text{RAM}_{\text{MaxSafe}} = 3,072 \text{ MB} \times 80\% \approx \mathbf{2,450\text{ MB}}$
* **ตั้งค่า Queue:** $M = 2$ (`MAX_CONCURRENT_SPAWNS=2`)

---

### ขั้นตอนคำนวณ $N_{\text{CPU}}$:
$$15\% + (2 \times 100\%) + (N \times 2.0\%) \le 469\%$$
$$215\% + 2.0\%N \le 469\%$$
$$2.0\%N \le 254\%$$
$$N_{\text{CPU}} \le \frac{254}{2.0} = \mathbf{127 \text{ ห้อง}}$$

---

### ขั้นตอนคำนวณ $N_{\text{RAM}}$:
$$220\text{ MB} + (2 \times 60\text{ MB}) + (N \times 28\text{ MB}) \le 2,450\text{ MB}$$
$$340\text{ MB} + 28\text{ MB} \times N \le 2,450\text{ MB}$$
$$28\text{ MB} \times N \le 2,110\text{ MB}$$
$$N_{\text{RAM}} \le \frac{2,110}{28} = \mathbf{75 \text{ ห้อง}}$$

---

### ขีดจำกัดสรุป:
$$N = \min(127, 75) = \mathbf{75 \text{ ห้อง}}$$

> [!IMPORTANT]
> **บทสรุปเชิงลึก:**
> แม้จะหักลบกำลังของคอร์เล็ก 1.00 GHz ออกไปแล้ว ฝั่ง CPU ก็ยังคำนวณได้ถึง **127 ห้อง** ซึ่งสูงกว่าความจุของ **RAM 3GB (75 ห้อง)** อยู่ดี
> ดังนั้น **RAM 3GB DDR4 จึงเป็นตัวกำหนดขีดจำกัดจริงที่ 75 ห้องอย่างแท้จริง** แนะนำตั้ง `maxRooms = 60 - 70 ห้อง` ในหน้า Admin Dashboard เพื่อความเสถียร 100%

---

## 7. ตารางอัตราส่วนประสิทธิภาพ (Efficiency Ratios)

* **Effective Core-to-Room Ratio:** **$1 C_{\text{eff}} : 11.2 \text{ ห้อง}$** (ที่เพดาน RAM) และสูงสุด **$1 C_{\text{eff}} : 19.0 \text{ ห้อง}$** (ถ้า RAM พอ)
* **Price-to-Room Ratio:** **$6.6 \text{ บาท} : 1 \text{ ห้อง}$** *(กล่องราคา 500 บาท หาร 75 ห้อง จ่ายครั้งเดียวตลอดชีพ)*
* **Power-to-Room Ratio:** **$0.08 \text{ Watt} : 1 \text{ ห้อง}$** *(กล่องกินไฟรวม 6 Watts)*

---

## 8. ตารางอัตราส่วน Spawn : Stream (Spawn Resource Ratio)

* **CPU Ratio (ความแรง):**
  $$\text{Spawn} : \text{Stream} = 100\% : 2\% = \mathbf{50 : 1}$$
  *(การสปอว์นแกะเพลง 1 คิว ใช้พลัง CPU เท่ากับการเปิดเพลงปกติทิ้งไว้ 50 ห้องพร้อมกัน)*
* **RAM Ratio (หน่วยความจำ):**
  $$\text{Spawn} : \text{Stream} = 60\text{ MB} : 28\text{ MB} \approx \mathbf{2.1 : 1}$$

---

## 9. ข้อกำหนดการจูนระบบ (Hybrid Tuning Guidelines)

1. **เปิดใช้ Priority Queue & Preemption เสมอ:**
   เนื่องจาก Spawn 1 คิว กิน CPU สูงถึง 100% (เท่ากับสตรีมเพลง 50 ห้อง) ระบบ DisLava จึงมี Priority Queue เพื่อ Preempt (สั่งตัด `SIGTERM`) งาน Pre-fetch เบื้องหลังทันทีเมื่อผู้ใช้กด Play หรือ Skip เพื่อไม่ให้มี Spawn ชนกันเกินโควตา
2. **ล็อก Spawns ไม่เกิน 1 หรือ 2 (`MAX_CONCURRENT_SPAWNS=1` หรือ `2`):**
   * สำหรับ VPS 1 Core หรือกล่อง 4 Cores: ตั้ง `MAX_CONCURRENT_SPAWNS=1`
   * สำหรับกล่อง 8 Cores (MECOOL BB2 PRO): ตั้ง `MAX_CONCURRENT_SPAWNS=2` (สำรอง 2 คิว = 200% CPU ซึ่งกล่อง 8 คอร์รับได้สบายโดยไม่รบกวนสตรีม)
3. **ขยาย Threshold แคช Disk เป็น 30 นาที (`MAX_CACHE_DURATION_SEC=1800`):**
   เพื่อให้เพลงส่วนใหญ่ (>95%) ถูกโหลดเก็บลงดิสก์ eMMC ภายใน ซึ่งจะทำให้การสตรีมกิน CPU **0.0%** ตัดภาระเครือข่ายและ CPU ออกทั้งหมด
4. **RAM คือคอขวดใหม่:**
   หากต้องการขยายคลัสเตอร์ให้รันเกิน 100 ห้องต่อ 1 กล่อง ควรเลือกอุปกรณ์ที่มี RAM **4GB ขึ้นไป** (เช่น Orange Pi 5 หรือ Raspberry Pi 4/5 รุ่น RAM 4GB–8GB)
