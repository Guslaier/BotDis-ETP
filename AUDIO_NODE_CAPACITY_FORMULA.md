# Audio Worker Node Capacity Formula (Hybrid Edition 2.0)
สูตรคำนวณอัตราส่วนและขีดจำกัดการรองรับห้องสตรีมเสียงสำหรับ DisLava Audio Cluster

---

> [!NOTE]
> **การเปลี่ยนแปลงครั้งสำคัญใน Hybrid Edition 2.0:**
> จากการนำสถาปัตยกรรม **WebmOpus Direct Passthrough** และ **Zero-Copy Disk Stream** มาใช้งาน (ตัดการทำงานของ FFmpeg ออกในเพลงปกติที่ไม่ใส่ Filter) ทำให้การกิน CPU ต่อ 1 ห้องสตรีมลดลงจาก **15% $\to$ เหลือเพียง 1.5% – 2.0%** (บนชิป ARM64) ส่งผลให้คอขวดหลักของระบบ **ย้ายจาก CPU ไปอยู่ที่ RAM และ Bandwidth เน็ตแทน**

---

## ⚡ สูตรสำเร็จรูป (Universal Plug & Play Formula)

ใส่ตัวเลขฮาร์ดแวร์ 3 ตัว:
* **$C$** = จำนวน Cores ของ CPU (ตัว)
* **$R$** = ขนาด RAM รวม (หน่วย GB)
* **$S$** = จำนวน Spawn แกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS` ตัว แนะนำ $1$ หรือ $2$)

### 📌 สูตรลัดคำนวณห้องที่ไหวจริง ($Rooms$):
$$\mathbf{Rooms} = \min(Rooms_{\text{CPU}}, \; Rooms_{\text{RAM}})$$

$$\begin{aligned}
Rooms_{\text{CPU}} &= \lfloor 35 \times C - 50 \times S - 7.5 \rfloor \\
Rooms_{\text{RAM}} &= \lfloor 29.3 \times R - 2.14 \times S - 8 \rfloor
\end{aligned}$$

*(ปัดเศษทศนิยมทิ้งเป็นจำนวนเต็ม)*

> [!TIP]
> **ความแตกต่างจากระบบเดิม:**
> ในระบบเดิม $Rooms_{\text{CPU}}$ จะเป็นตัวจำกัดเสมอ แต่ใน **Hybrid Edition** ค่า $Rooms_{\text{RAM}}$ จะกลายมาเป็นเพดานจำกัดห้องแทนสำหรับอุปกรณ์ที่มีแรมน้อย ($\le 4\text{ GB}$)

---

## 📊 ตารางเปรียบเทียบสเปกยอดนิยม (Legacy vs Hybrid 2.0)

| สเปกฮาร์ดแวร์ ($C$ Cores / $R$ GB) | Spawn ($S$) | ความจุเดิม (Legacy FFmpeg) | **ความจุใหม่ (Hybrid 2.0)** | **คอขวดจริงที่ติด** | ประสิทธิภาพเพิ่มขึ้น |
|---|:---:|:---:|:---:|:---:|:---:|
| **1 Core / 1 GB** (VPS ขั้นต่ำ) | 1 | 0 – 1 ห้อง *(กระตุก)* | **10 – 12 ห้อง** | RAM / Bandwidth | **+1,000%** |
| **2 Cores / 2 GB** (VPS เล็ก) | 1 | 1 – 2 ห้อง | **25 – 30 ห้อง** | RAM (2 GB) | **+1,200%** |
| **4 Cores / 2 GB** (กล่อง TV ทั่วไป) | 1 | 11 ห้อง | **48 ห้อง** | RAM (2 GB) | **+336%** |
| **4 Cores / 4 GB** (Raspberry Pi 4) | 1 | 11 ห้อง | **82 ห้อง** | CPU (4 Cores) | **+645%** |
| **4 Cores / 4 GB** (Raspberry Pi 4) | 2 | 4 ห้อง | **32 ห้อง** | CPU (สำรอง 2 Spawn) | **+700%** |
| **8 Cores / 3 GB** (MECOOL BB2 PRO) | **1** | **29 ห้อง** | **77 ห้อง** | **RAM (3 GB)** | **+165%** |
| **8 Cores / 3 GB** (MECOOL BB2 PRO) | **2** | **23 ห้อง** | **75 ห้อง** | **RAM (3 GB)** | **+226%** |
| **4 Cores / 8 GB** (Mini PC Intel N100) | 2 | 35 – 40 ห้อง | **100 – 120+ ห้อง** | Bandwidth / Network | **+200%** |

---

## 1. แกนสมการหลัก (Core Equation)

$$\text{Base} + \text{Spawn} + \text{Stream} \le \text{Threshold}$$

การคำนวณแยก 2 มิติอิสระ โดย **$N$ (จำนวนห้องสูงสุดที่รับได้)** จะถูกกำหนดด้วยมิติที่เป็นคอขวดต่ำสุด:

$$N = \min(N_{\text{CPU}}, \; N_{\text{RAM}})$$

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
* $M$ = ขีดจำกัดการสปอว์นแกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS`) แนะนำ $1$ หรือ $2$
* $\text{CPU}_{\text{MaxSafe}}$ = ขีดจำกัด CPU ที่ปลอดภัย แนะนำตั้งไว้ที่ **$70\% \text{ ของ Total Cores}$** ($70\% \times C$)
* $\text{RAM}_{\text{MaxSafe}}$ = หน่วยความจำแรมที่ปลอดภัย แนะนำตั้งไว้ที่ **$80\% \text{ ของ Physical RAM}$** ($80\% \times R$)

---

## 3. ค่ามาตรฐานอ้างอิงต่อหน่วย (Hybrid Benchmark Table)

อ้างอิงบนสถาปัตยกรรม **ARM64 (Cortex-A53 1.5 GHz)** เช่น Amlogic S905/S912 หรือ Allwinner H6:

| องค์ประกอบ | สัญลักษณ์ | การกิน CPU | การกิน RAM | พฤติกรรมในระบบ Hybrid 2.0 |
|---|---|---|---|---|
| **Base System** | $\text{Base}$ | **15%** (0.15 Core) | **220 MB** | Linux CLI + PM2 + Node.js Worker Daemon |
| **Spawn (ต่อ 1 คิว)** | $\text{Spawn}$ | **100%** (1.00 Core) | **60 MB** | `yt-dlp` รัน Python + JS runtime ปลดบล็อก YouTube (1.5–2 วินาที) |
| **Stream: Hybrid Passthrough** | $\text{Stream}$ | **2.0%** (0.02 Core) | **28 MB** | เพลงปกติ (ไม่มี Filter): WebmOpus / Disk Stream ตรง ไม่เปิด FFmpeg |
| **Stream: DSP Filter (กรณีเปิด)** | $\text{Stream}_{\text{DSP}}$ | **12.0%** (0.12 Core) | **35 MB** | สลับไปรัน FFmpeg Pipe เฉพาะเพลงที่เปิด Bassboost/Nightcore |

> [!NOTE]
> บนชิป **x86_64** (Intel N100 / AMD Ryzen / Xeon VPS) ค่า $\text{Stream}$ ของ Hybrid Passthrough จะกิน CPU เพียง **0.5% – 0.8%** ต่อห้องเท่านั้น

---

## 4. ตัวอย่างการคำนวณจริง: กล่อง MECOOL BB2 PRO (S912 / 8 Cores / RAM 3GB)

### ข้อมูลสเปก
* **Total CPU Cores:** 8 Cores ($800\%$) $\to$ $\text{CPU}_{\text{MaxSafe}} = 800\% \times 70\% = \mathbf{560\%}$
* **Physical RAM:** 3,072 MB $\to$ $\text{RAM}_{\text{MaxSafe}} = 3,072 \text{ MB} \times 80\% \approx \mathbf{2,450\text{ MB}}$
* **ตั้งค่า Queue:** $M = 2$ (`MAX_CONCURRENT_SPAWNS=2`)

---

### ขั้นตอนคำนวณ $N_{\text{CPU}}$:
$$15\% + (2 \times 100\%) + (N \times 2.0\%) \le 560\%$$
$$215\% + 2.0\%N \le 560\%$$
$$2.0\%N \le 345\%$$
$$N_{\text{CPU}} \le \frac{345}{2.0} = \mathbf{172 \text{ ห้อง}}$$

---

### ขั้นตอนคำนวณ $N_{\text{RAM}}$:
$$220\text{ MB} + (2 \times 60\text{ MB}) + (N \times 28\text{ MB}) \le 2,450\text{ MB}$$
$$340\text{ MB} + 28\text{ MB} \times N \le 2,450\text{ MB}$$
$$28\text{ MB} \times N \le 2,110\text{ MB}$$
$$N_{\text{RAM}} \le \frac{2,110}{28} = \mathbf{75 \text{ ห้อง}}$$

---

### ขีดจำกัดสรุป:
$$N = \min(172, 75) = \mathbf{75 \text{ ห้อง}}$$

> [!IMPORTANT]
> **การวิเคราะห์ผลลัพธ์:**
> * เดิมกล่องนี้ตันที่ CPU ที่ 23 ห้อง
> * ใน Hybrid Edition: CPU รองรับได้ถึง **172 ห้อง** แต่จะติดเพดาน **RAM 3GB ที่ 75 ห้อง**
> * ดังนั้นแนะนำตั้งค่า `maxRooms = 60 - 70 ห้อง` ในหน้า Admin Dashboard สำหรับกล่องรุ่นนี้เพื่อความเสถียรสูงสุด

---

## 5. ตารางอัตราส่วนใหม่ (Hybrid Ratios)

### 1. อัตราส่วนการกินทรัพยากรต่อ 1 หน่วย (Spawn : Stream)
* **CPU Ratio:**
  $$\text{Spawn} : \text{Stream} = 100\% : 2\% = \mathbf{50 : 1}$$
  *(การสปอว์นแกะเพลง 1 คิว ใช้พลัง CPU เท่ากับการเปิดเพลงปกติทิ้งไว้ 50 ห้องพร้อมกัน)*
* **RAM Ratio:**
  $$\text{Spawn} : \text{Stream} = 60\text{ MB} : 28\text{ความจุ MB} \approx \mathbf{2.1 : 1}$$

---

### 2. อัตราส่วนประสิทธิภาพต่อฮาร์ดแวร์ (Efficiency Ratios)
* **Core-to-Room Ratio:** จากเดิม $1 : 2.87$ $\to$ เพิ่มขึ้นเป็น **$1 \text{ Core} : 9.3 \text{ ห้อง}$** (ติดเพดาน RAM) และสูงสุด **$1 \text{ Core} : 21.5 \text{ ห้อง}$** (ถ้า RAM มีเพียงพอ)
* **Price-to-Room Ratio:** **$6.6 \text{ บาท} : 1 \text{ ห้อง}$** *(กล่องราคา 500 บาท หาร 75 ห้อง จ่ายครั้งเดียวตลอดชีพ)*
* **Power-to-Room Ratio:** **$0.08 \text{ Watt} : 1 \text{ ห้อง}$** *(กล่องกินไฟรวม 6 Watts)*

---

## 6. ข้อกำหนดการจูนระบบ (Hybrid Tuning Guidelines)

1. **เปิดใช้ Priority Queue เสมอ:**
   เนื่องจาก Spawn 1 ครั้งกิน CPU เท่ากับ 50 ห้องสตรีม ระบบต้องมี Priority Queue เพื่อ Preempt (สั่งตัด) งาน Pre-fetch เบื้องหลังทันทีเมื่อผู้ใช้กด Play หรือ Skip เพื่อไม่ให้มี Spawn ชนกัน
2. **ขยาย Threshold แคช Disk เป็น 30 นาที (`MAX_CACHE_DURATION_SEC=1800`):**
   เพื่อให้เพลงส่วนใหญ่ (>95%) ถูกโหลดเก็บลงดิสก์ NVMe/eMMC ซึ่งจะทำให้การสตรีมกิน CPU **0.0%** (ตัดภาระเน็ตและ I/O)
3. **RAM คือคอขวดใหม่:**
   หากต้องการให้กล่องรันได้เกิน 100 ห้องขึ้นไป ควรเลือกอุปกรณ์ที่มี RAM **4GB ขึ้นไป** (เช่น Orange Pi 5 หรือ Raspberry Pi 4/5 4GB-8GB)
