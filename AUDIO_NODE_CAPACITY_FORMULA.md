# Audio Worker Node Capacity Formula (Hybrid Edition 3.1 — Production Calibrated)
สูตรคำนวณอัตราส่วนและขีดจำกัดการรองรับห้องสตรีมเสียงสำหรับคลัสเตอร์ GOOLIX / DisLava Audio Engine

---

> [!NOTE]
> **การปรับจูนระดับใช้งานจริงใน Hybrid Edition 3.1 (Production Calibrated):**
> 1. **Clock Speed & Architecture Normalization ($C_{\text{eff}}$):** คำนวณความเร็วสัญญาณนาฬิกาและสถาปัตยกรรมจริง (เช่น ชิป big.LITTLE หรือ x86 เทียบกับ ARM Cortex-A53)
> 2. **Real-World `htop` Memory Calibration:** ปรับค่าการกินหน่วยความจำจริงจากการวัดผลบนเซิร์ฟเวอร์โปรดักชัน ($\sim 19\text{--}23\text{ MB}$ ต่อห้อง) และแยกค่า Base System ระหว่างเครื่อง Micro VPS กับเครื่องมาตรฐาน
> 3. **VIP DSP Filter Mix ($p_{\text{dsp}}$) & Process Nice:** คำนวณภาระ CPU เมื่อมีห้องผู้สนับสนุนเปิดใช้งาน Equalizer (Bass Boost / Nightcore) ร่วมกับการใช้ `nice -n 19` ลดการแย่ง CPU ของโปรเซส `yt-dlp`
> 4. **3-Dimensional Bottleneck ($\text{CPU}, \text{RAM}, \text{NET}$):** เพิ่มสมการคำนวณคอขวดด้านแบนด์วิธและท่อ VPN ($Rooms_{\text{NET}}$)

---

## 1. การคำนวณคอร์ประสิทธิผล ($C_{\text{eff}}$)

อิงค่ามาตรฐานสมรรถนะเทียบกับ **ARM Cortex-A53 @ $1.5\text{ GHz}$ ($= 1.0\text{ หน่วย}$)**:

$$C_{\text{eff}} = \sum_{i=1}^{k} \left( \text{Cores}_i \times \frac{F_i}{1.5\text{ GHz}} \times \alpha_{\text{arch}} \right)$$

* $F_i$ = ความเร็วสัญญาณนาฬิกาจริงของคลัสเตอร์นั้น ($\text{GHz}$)
* $\alpha_{\text{arch}}$ = ตัวคูณสถาปัตยกรรม:
  * ARM Cortex-A53 = $1.0$
  * ARM Cortex-A72 / A55 = $1.3$
  * ARM Cortex-A76 = $2.0$
  * x86\_64 (Intel N100 / Xeon / AMD EPYC) = $1.8$ (กรณี Shared vCPU บน NAT VPS ราคาประหยัด ให้ใช้ค่า $C_{\text{eff}} \approx 1.0$)

### ตัวอย่างการหาค่า $C_{\text{eff}}$ ของฮาร์ดแวร์ยอดนิยม:
1. **SG 400MB NAT VPS ($1\text{ Shared vCPU}$):**
   $$C_{\text{eff}} \approx \mathbf{1.00\text{ Core}}$$
2. **VPS-LG1XS+ ($2\text{ vCPU}$ @ $2.5\text{ GHz}$ x86\_64, หักโหลด Virtualization):**
   $$C_{\text{eff}} \approx 2 \times \frac{1.5}{1.5} \times 1.8 = \mathbf{3.60\text{ Cores}}$$
3. **กล่อง MECOOL BB2 PRO (Amlogic S912 - big.LITTLE $8\text{ คอร์}$):**
   * คลัสเตอร์ใหญ่ $4\text{ คอร์}$ @ $1.51\text{ GHz}$ $\to 4 \times \frac{1.51}{1.5} \times 1.0 = 4.03$
   * คลัสเตอร์เล็ก $4\text{ คอร์}$ @ $1.00\text{ GHz}$ $\to 4 \times \frac{1.00}{1.5} \times 1.0 = 2.67$
   * $$C_{\text{eff}} = 4.03 + 2.67 = \mathbf{6.70\text{ Cores}}$$
4. **Mini PC Intel N100 ($4\text{ Cores}$ @ $3.0\text{ GHz}$ Sustained Boost, x86\_64):**
   $$C_{\text{eff}} = 4 \times \frac{3.0}{1.5} \times 1.8 = \mathbf{14.40\text{ Cores}}$$

---

## 2. สูตรสำเร็จรูป 3 มิติ (Universal 3D Plug & Play Formula)

ใส่ตัวเลขพารามิเตอร์ 4 ตัว:
* **$C_{\text{eff}}$** = คอร์ประสิทธิผลที่คำนวณจากหัวข้อที่ 1
* **$R$** = ขนาด Physical RAM รวม (หน่วย $\text{GB}$ เช่น $345\text{ MB} = 0.345$)
* **$S$** = จำนวนคิวแกะเพลงพร้อมกัน (`MAX_CONCURRENT_SPAWNS` แนะนำ $1$ หรือ $2$)
* **$BW_{\text{VPN}}$** = ความเร็วท่อ VPN หรือแบนด์วิธขาออกที่วิ่งได้นิ่งจริง (หน่วย $\text{Mbps}$)

### สูตรลัดคำนวณจำนวนห้องที่รับไหวจริง ($Rooms$):

$$\mathbf{Rooms} = \min\left(Rooms_{\text{CPU}}, \; Rooms_{\text{RAM}}, \; Rooms_{\text{NET}}\right)$$

#### ก. เพดานฝั่ง CPU ($Rooms_{\text{CPU}}$) — เลือกตามโหมดการเปิดฟิลเตอร์เสียง:
$$\begin{aligned}
Rooms_{\text{CPU\_Pure}} &= \lfloor 35 \times C_{\text{eff}} - 30 \times S - 7.5 \rfloor \quad &\text{(โหมด Pure Passthrough ล้วน ปิดระบบ EQ)} \\
Rooms_{\text{CPU\_Prod}} &= \lfloor 20 \times C_{\text{eff}} - 17 \times S - 4.3 \rfloor \quad &\text{(โหมดใช้งานจริง มีห้อง VIP เปิด EQ เฉลี่ย } 15\% \text{)}
\end{aligned}$$

#### ข. เพดานฝั่ง RAM ($Rooms_{\text{RAM}}$):
$$Rooms_{\text{RAM}} = \lfloor 35.6 \times R - 2.6 \times S - B \rfloor$$
* กำหนดค่าคงที่ระบบพื้นฐาน ($B$):
  * **$B = 5.6$** สำหรับ **Micro VPS ($R < 1\text{ GB}$)** ที่จูนระบบแบบประหยัดแรม ($\text{Base RAM} \approx 130\text{ MB}$)
  * **$B = 9.5$** สำหรับ **Standard Node ($R \ge 1\text{ GB}$)** ที่รันเซอร์วิสเต็มรูปแบบ ($\text{Base RAM} \approx 220\text{ MB}$)

#### ค. เพดานฝั่งเครือข่ายและ VPN ($Rooms_{\text{NET}}$):
$$Rooms_{\text{NET}} = \lfloor 2.8 \times BW_{\text{VPN}} \rfloor$$

*(ปัดเศษทศนิยมทิ้งเป็นจำนวนเต็มทั้งหมด)*

---

## 3. ตารางเปรียบเทียบสเปกยอดนิยม (Calibrated Reference Table)

กำหนดให้ท่อ VPN ฟรีวิ่งได้นิ่งที่ $15\text{ Mbps}$ ($Rooms_{\text{NET}} = 42$), ท่อ VPN มาตรฐานที่บ้าน $25\text{--}30\text{ Mbps}$ ($Rooms_{\text{NET}} = 70\text{--}84$) และ Data Center $50\text{ Mbps+}$ ($Rooms_{\text{NET}} = 140$):

| สเปกฮาร์ดแวร์ | $C_{\text{eff}}$ | RAM ($R$) | Spawn ($S$) | $Rooms_{\text{CPU}}$ (Pure / **VIP Mix**) | $Rooms_{\text{RAM}}$ | $Rooms_{\text{NET}}$ | **ห้องที่ไหวจริง (แนะนำตั้งค่า)** | **คอขวดจริงที่ติด** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **SG 400MB NAT ($22\text{ THB}$)** | $1.0$ | $0.345\text{ GB}$ | $1$ | $17$ / **$0$*** | **$3\text{--}4$** | $42$ | **$3\text{ ห้อง}$** *(ตรงผลวัด `htop`)* | **RAM $345\text{ MB}$ (ห้ามเปิด EQ)** |
| **VPS $1\text{ Core}$ / $1\text{ GB}$** | $1.6$ | $1.0\text{ GB}$ | $1$ | $41$ / **$10$** | $23$ | $42$ | **$10\text{ ห้อง}$** | **CPU ($1\text{ Core}$ เมื่อมีคนเปิด EQ)** |
| **VPS-LG1XS+ ($150\text{ THB}$)** | $3.6$ | $3.0\text{ GB}$ | $2$ | $58$ / **$33$** | $92$ | $140$ | **$33\text{--}45\text{ ห้อง}$** | **CPU (ขึ้นอยู่กับสัดส่วนห้อง EQ)** |
| **กล่อง TV $4\text{ Cores}$ / $2\text{ GB}$** | $4.0$ | $2.0\text{ GB}$ | $1$ | $102$ / **$58$** | $59$ | $70$ | **$55\text{ ห้อง}$** | **CPU และ RAM สมดุลกัน** |
| **Raspberry Pi 4 ($4\text{ GB}$)** | $4.5$ | $4.0\text{ GB}$ | $2$ | $90$ / **$51$** | $127$ | $70$ | **$50\text{ ห้อง}$** | **CPU (สำรอง $2\text{ Spawns}$)** |
| **MECOOL BB2 PRO ($500\text{ THB}$)** | **$6.7$** | **$3.0\text{ GB}$** | **$2$** | $167$ / **$95$** | **$92$** | $70\text{--}84$ | **$70\text{--}85\text{ ห้อง}$** | **RAM $3\text{ GB}$ และท่อ VPN** |
| **Mini PC Intel N100 ($8\text{ GB}$)** | $14.4$ | $8.0\text{ GB}$ | $2$ | $436$ / **$249$** | $270$ | $140$ | **$120\text{--}140\text{ ห้อง}$** | **Network / Discord UDP Limit** |

*(หมายเหตุ: สำหรับ `SG 400MB NAT` ที่มี $1\text{ Shared vCPU}$ และต้องรันทั้ง Controller + VPN ในตัวเดียว จะต้องบังคับรันโหมด Pure Passthrough เท่านั้น จึงรับได้ที่ $3\text{ ห้อง}$ ตามเพดาน RAM จริง)*

---

## 4. แกนสมการหลักและที่มาทางคณิตศาสตร์ (Core Equations)

$$\text{Base} + \text{Spawn} + \text{Stream} \le \text{Threshold}$$

การคำนวณแยกออกเป็น $3\text{ มิติอิสระ}$ โดยจำนวนห้องสูงสุดที่รับได้ ($N$) จะถูกกำหนดด้วยมิติที่เป็นคอขวดต่ำสุด:

$$N = \min\left(N_{\text{CPU}}, \; N_{\text{RAM}}, \; N_{\text{NET}}\right)$$

### ก. สมการฝั่ง CPU และการถ่วงน้ำหนัก DSP Filter
$$\text{CPU}_{\text{Base}} + (S \times \text{CPU}_{\text{Spawn\_Eff}}) + (N \times \text{CPU}_{\text{Stream\_Avg}}) \le \text{CPU}_{\text{MaxSafe}}$$

$$N_{\text{CPU}} \le \frac{(70\% \times C_{\text{eff}}) - \text{CPU}_{\text{Base}} - (S \times \text{CPU}_{\text{Spawn\_Eff}})}{\text{CPU}_{\text{Stream\_Avg}}}$$

* **การลดภาระ Spawn ด้วย `nice -n 19` ($\text{CPU}_{\text{Spawn\_Eff}}$):**
  แม้ `yt-dlp` จะกิน CPU $100\%$ ของ $1\text{ Core}$ ขณะทำงาน แต่เมื่อสั่งรันด้วย Priority ต่ำสุด (`nice -n 19`) Linux Scheduler จะให้สิทธิ์ Audio Event Loop ทำงานก่อนเสมอ ทำให้ต้องกัน Buffer สำรองจริงเพียง **$60\%$ ต่อคิว** (แทนที่จะเสียไปเต็ม $100\%$)
* **ค่าเฉลี่ยการกิน CPU ต่อห้อง ($\text{CPU}_{\text{Stream\_Avg}}$):**
  กำหนดให้ $p_{\text{dsp}}$ คือสัดส่วนห้องที่เปิดใช้งานฟิลเตอร์แต่งเสียง (เช่น $p_{\text{dsp}} = 0.15$ หรือ $15\%$ ของห้องทั้งหมด):
  $$\text{CPU}_{\text{Stream\_Avg}} = (1 - p_{\text{dsp}}) \times 2.0\% + (p_{\text{dsp}} \times 12.0\%)$$
  * กรณี **Pure Passthrough ($p_{\text{dsp}} = 0$):** $\text{CPU}_{\text{Stream\_Avg}} = \mathbf{2.0\%}$ ต่อห้อง
  * กรณี **Production VIP Mix ($p_{\text{dsp}} = 0.15$):** $\text{CPU}_{\text{Stream\_Avg}} = (0.85 \times 2.0\%) + (0.15 \times 12.0\%) = \mathbf{3.5\%}$ ต่อห้อง

### ข. สมการฝั่ง RAM (ปรับจูนจากผลวัด `htop` จริง)
$$\text{RAM}_{\text{Base}} + (S \times \text{RAM}_{\text{Spawn}}) + (N \times \text{RAM}_{\text{Stream}}) \le \text{RAM}_{\text{MaxSafe}}$$

$$N_{\text{RAM}} \le \frac{(80\% \times \text{Physical RAM}) - \text{RAM}_{\text{Base}} - (S \times 60\text{ MB})}{23\text{ MB}}$$

* จากการวัดผลจริงบน `htop` ขณะสตรีมด้วยสถาปัตยกรรม Hybrid 2.0+:
  * โปรเซส Node.js กินหน่วยความจำเพิ่มขึ้นห้องละ $\sim 18.8\text{--}20.0\text{ MB}$
  * เมื่อคิดเผื่อ Overhead ของ Buffer และห้องที่เปิดใช้ FFmpeg DSP ($35\text{ MB}$) คิดเป็นค่าเฉลี่ยปลอดภัยที่ **$23\text{ MB}$ ต่อห้อง**

### ค. สมการฝั่งเครือข่ายและ VPN ($N_{\text{NET}}$)
$$N_{\text{NET}} \le \frac{70\% \times BW_{\text{VPN}}}{\text{Bitrate}_{\text{Avg}}}$$

* 1 ห้องสตรีมเสียง ($64\text{--}96\text{ kbps}$ Opus ขาออก $+$ การดึงข้อมูลขาเข้าเฉลี่ยเมื่อแคชทำงานร่วมด้วย) ใช้แบนด์วิธรวมเฉลี่ย **$0.25\text{ Mbps}$ ต่อห้อง** ที่เพดานปลอดภัย $70\%$ ของท่อ VPN

---

## 5. ค่ามาตรฐานอ้างอิงต่อหน่วย (Calibrated Benchmark Table)

อ้างอิงที่หน่วยฐาน $1.0 \; C_{\text{eff}}$ (เทียบเท่า ARM Cortex-A53 @ $1.5\text{ GHz}$):

| องค์ประกอบ | สัญลักษณ์ | การกิน CPU | การกิน RAM | พฤติกรรมในระบบจริง |
|---|---|---|---|---|
| **Base System (Micro VPS)** | $\text{Base}_{\text{Micro}}$ | **$10\%$** ($0.10\text{ Core}$) | **$130\text{ MB}$** | Linux Minimal + Systemd / Node.js เดี่ยว (วัดจริงจาก `htop`) |
| **Base System (Standard)** | $\text{Base}_{\text{Std}}$ | **$15\%$** ($0.15\text{ Core}$) | **$220\text{ MB}$** | Armbian / Ubuntu CLI + PM2 Daemon + Logrotate + Worker |
| **Spawn (`nice -n 19`)** | $\text{Spawn}$ | **$60\%$ Buffer** *(พีค $100\%$)* | **$60\text{ MB}$** | `yt-dlp` สกัด URL สั้นๆ $1.5\text{--}2.0\text{ วินาที}$ โดยหลีกทางให้ Audio Thread |
| **Stream: Hybrid Passthrough** | $\text{Stream}_{\text{Pure}}$ | **$2.0\%$** ($0.02\text{ Core}$) | **$20\text{ MB}$** | เพลงปกติ: WebmOpus / Zero-Copy Disk Stream ตรง ไม่เปิด FFmpeg |
| **Stream: DSP Filter (EQ)** | $\text{Stream}_{\text{DSP}}$ | **$12.0\%$** ($0.12\text{ Core}$) | **$35\text{ MB}$** | เปิด FFmpeg Pipe เฉพาะห้อง VIP ที่กดใช้ Bass Boost / Nightcore |
| **Stream: ค่าเฉลี่ยใช้งานจริง** | $\text{Stream}_{\text{Avg}}$ | **$3.5\%$** ($0.035\text{ Core}$) | **$23\text{ MB}$** | ค่าเฉลี่ยถ่วงน้ำหนักเมื่อมีห้องเปิดใช้ฟิลเตอร์แต่งเสียง $15\%$ ของระบบ |

---

## 6. ตัวอย่างการคำนวณจริง (Real-World Case Studies)

### กรณีที่ 1: เครื่อง SG 400MB NAT ($22\text{ THB}$ — ตรวจสอบความแม่นยำกับ `htop`)
* **สเปกจริง:** $C_{\text{eff}} = 1.0$, Physical RAM $= 345\text{ MB}$ ($R = 0.345\text{ GB}$), ตั้ง $S = 1$, ใช้ค่า $B = 5.6$ (Micro VPS)
* **คำนวณ $Rooms_{\text{RAM}}$:**
  $$Rooms_{\text{RAM}} = \lfloor 35.6(0.345) - 2.6(1) - 5.6 \rfloor = \lfloor 12.28 - 2.6 - 5.6 \rfloor = \lfloor 4.08 \rfloor = \mathbf{4\text{ ห้อง (ขีดสุด)}}$$
* **ระยะปลอดภัยไม่แตะ Swap หนัก:** ตั้งค่าใช้งานจริงที่ **$2\text{--}3\text{ ห้อง}$** (ตรงกับตารางทดสอบจริงทุกประการ)

---

### กรณีที่ 2: กล่อง MECOOL BB2 PRO (Amlogic S912 / $8\text{ Cores}$ / RAM $3\text{ GB}$)
* **สเปกจริง:** $C_{\text{eff}} = 6.70$, Physical RAM $= 3.0\text{ GB}$ ($R = 3.0$), ตั้ง $S = 2$, ใช้ค่า $B = 9.5$ (Standard Node), ท่อ VPN บ้านวิ่งนิ่งที่ $30\text{ Mbps}$
* **คำนวณ $Rooms_{\text{CPU}}$ (โหมดใช้งานจริง VIP Mix $15\%$):**
  $$Rooms_{\text{CPU\_Prod}} = \lfloor 20(6.70) - 17(2) - 4.3 \rfloor = \lfloor 134 - 34 - 4.3 \rfloor = \mathbf{95\text{ ห้อง}}$$
  *(หากปิดฟิลเตอร์ทั้งหมดจะรับได้ $Rooms_{\text{CPU\_Pure}} = \lfloor 35(6.70) - 30(2) - 7.5 \rfloor = \mathbf{167\text{ ห้อง}}$)*
* **คำนวณ $Rooms_{\text{RAM}}$:**
  $$Rooms_{\text{RAM}} = \lfloor 35.6(3.0) - 2.6(2) - 9.5 \rfloor = \lfloor 106.8 - 5.2 - 9.5 \rfloor = \mathbf{92\text{ ห้อง}}$$
* **คำนวณ $Rooms_{\text{NET}}$:**
  $$Rooms_{\text{NET}} = \lfloor 2.8 \times 30 \rfloor = \mathbf{84\text{ ห้อง}}$$
* **ขีดจำกัดสรุป:**
  $$Rooms = \min(95, \; 92, \; 84) = \mathbf{84\text{ ห้อง}}$$
  *(แนะนำตั้งเพดานในหน้า Admin Dashboard ที่ **$70\text{--}80\text{ ห้อง}$** เพื่อความเสถียรสูงสุด)*

---

### กรณีที่ 3: เซิร์ฟเวอร์ VPS-LG1XS+ ($2\text{ vCPU}$ x86 / RAM $3\text{ GB}$ — $150\text{ THB}$)
* **สเปกจริง:** $C_{\text{eff}} = 3.60$, Physical RAM $= 3.0\text{ GB}$, ตั้ง $S = 2$, Data Center Network $50\text{ Mbps+}$ ($Rooms_{\text{NET}} = 140$)
* **คำนวณ $Rooms_{\text{CPU}}$:**
  * โหมดใช้งานจริง (VIP Mix $15\%$): $\lfloor 20(3.60) - 17(2) - 4.3 \rfloor = \mathbf{33\text{ ห้อง}}$
  * โหมด Pure Passthrough (ปิด EQ): $\lfloor 35(3.60) - 30(2) - 7.5 \rfloor = \mathbf{58\text{ ห้อง}}$
* **คำนวณ $Rooms_{\text{RAM}}$:** $\mathbf{92\text{ ห้อง}}$
* **ขีดจำกัดสรุป:** รองรับได้ **$33\text{--}58\text{ ห้องพร้อมกัน}$** (ขึ้นอยู่กับจำนวนห้องที่เปิด Equalizer ในขณะนั้น) เพียงพอต่อการทำกำไรสุทธิ $1,000+\text{ บาท/เดือน}$ ในเครื่องเดียว

---

## 7. ตารางอัตราส่วนทรัพยากรและประสิทธิภาพ (Ratios & Proportions)

### 1. อัตราส่วนการกินทรัพยากรต่อหน่วย (Resource Weight Ratio)
* **Spawn : Pure Stream (CPU):** $60\% : 2.0\% = \mathbf{30 : 1}$ (เมื่อใช้ `nice -n 19`)
* **DSP Stream : Pure Stream (CPU):** $12.0\% : 2.0\% = \mathbf{6 : 1}$ (การเปิด Bass Boost 1 ห้อง กินแรง CPU เท่ากับเปิดเพลงปกติ 6 ห้อง)
* **Spawn : Stream (RAM):** $60\text{ MB} : 23\text{ MB} \approx \mathbf{2.6 : 1}$

### 2. อัตราส่วนความคุ้มค่าต่อฮาร์ดแวร์ (Hardware ROI — MECOOL BB2 PRO)
* **Effective Core-to-Room Ratio:** $\mathbf{1 \; C_{\text{eff}} : 12.5\text{ ห้อง}}$
* **Price-to-Room Ratio:** $\mathbf{5.9\text{ บาท} : 1\text{ ห้อง}}$ *(กล่องราคา $500\text{ บาท}$ รองรับได้ $84\text{ ห้อง}$ จ่ายครั้งเดียว)*
* **Power-to-Room Ratio:** $\mathbf{0.07\text{ Watt} : 1\text{ ห้อง}}$ *(กินไฟรวม $\sim 6\text{ Watts}$)*

---

## 8. ข้อกำหนดการจูนระบบระดับใช้งานจริง (Production Tuning Guidelines)

1. **บังคับใช้ `nice -n 19` ตอนเรียก `yt-dlp` เสมอ:**
   ในโค้ด Node.js ให้สั่งสปอว์นโปรเซสด้วย `spawn('nice', ['-n', '19', 'yt-dlp', ...args])` เพื่อป้องกันไม่ให้จังหวะแกะเพลงใหม่ไปแย่ง CPU Time ของห้องที่กำลังส่งแพ็กเก็ตเสียง Opus
2. **จำกัดโควตาห้องแต่งเสียง (`MAX_DSP_ROOMS`) แยกตามโหนด:**
   เนื่องจากฟีเจอร์ Equalizer กิน CPU สูงกว่าปกติถึง $6\text{ เท่า}$ ควรตั้งลิมิตในโค้ดไม่ให้โหนดขนาดเล็กเปิด DSP เกิน $3\text{--}5\text{ ห้อง}$ หรือตั้งกฎใน Node Router ให้โยนงานที่มี DSP ไปยังโหนดที่มีหลายคอร์ (เช่น MECOOL $8\text{ Cores}$)
3. **การรีดประสิทธิภาพสำหรับเครื่อง Micro VPS ($\text{RAM} < 512\text{ MB}$):**
   * ถอด `PM2` และ `pm2-logrotate` ออก แล้วรันผ่าน `systemd` โดยตรง เพื่อประหยัด RAM ทันที $\sim 36\text{ MB}$
   * ตั้งค่า `sudo sysctl vm.swappiness=10` เพื่อป้องกันไม่ให้ Linux ดันเพจหน่วยความจำลง Disk Swap เร็วเกินไปจนเกิดอาการเสียงกระตุก
   * ใช้แฟลก `--max-old-space-size=80` เพื่อบังคับให้ V8 Garbage Collector คืนแรมไวขึ้น
4. **การดูแลรักษาโหนดฮาร์ดแวร์ (TV Box / ARM Node):**
   * ติดตั้งระบบปฏิบัติการ Armbian ลงบน **Internal eMMC** แทนการรันบน MicroSD Card เพื่อลดเวลา I/O ตอนเรียก Python ให้ต่ำกว่า $1.5\text{ วินาที}$
   * ติดตั้งพัดลมระบายความร้อน USB $5\text{V}$ เป่าตัวกล่องเพื่อคุมอุณหภูมิให้ต่ำกว่า $65^\circ\text{C}$ ตลอดช่วงเวลา Peak Time ($19:00\text{--}23:00\text{ น.}$) ป้องกันการเกิด Thermal Throttling