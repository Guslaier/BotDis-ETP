<div align="center">
  <h1>GOOLIX MusicBot</h1>
  <p><strong>Ultra-Light High-Performance Standalone Discord Music Bot & Hybrid Audio Cluster</strong></p>
  
  [![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue?logo=discord&logoColor=white)](https://discord.js.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18.x+-green?logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Audio Engine](https://img.shields.io/badge/Audio%20Engine-Hybrid%203.1%20WebmOpus%20Passthrough-red)](https://github.com/yt-dlp/yt-dlp)
  [![Cluster](https://img.shields.io/badge/Cluster-Scale--Out%20Audio%20Nodes-orange)](https://github.com/Guslaier/DisLava-MusicBot)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br />

**GOOLIX** is a modern, enterprise-grade Discord Music Bot powered directly by **Discord.js v14**, **@discordjs/voice**, embedded **yt-dlp**, and **FFmpeg**. It runs as an ultra-light, self-contained standalone Node.js service without requiring Java, Lavalink, or external server daemons.

It features **Hybrid 3.1 Zero-Copy WebmOpus Passthrough** (0% FFmpeg CPU usage on standard playback), background NVMe pre-caching, YouTube Radio Mix Autoplay with artist diversity, an interactive 4-row player card, LRCLIB + YouTube description lyrics search, favorites management, isolated ProtonVPN policy routing, centralized Tinyproxy tunnel sharing for distributed worker nodes, and an automated TrueMoney VIP subscription billing portal.

> **Production Hardware Sizing:** For comprehensive benchmarks, formulas, and slot capacity calculations across Micro VPS, ARM TV boxes (Amlogic S905X4), Raspberry Pi, and Mini PCs (Intel N100 / Core i5), consult [`AUDIO_NODE_CAPACITY_FORMULA.md`](AUDIO_NODE_CAPACITY_FORMULA.md).

---

## Key Features

- **Standalone Architecture**: 100% pure Node.js runtime. No Java runtime or Lavalink server required.
- **Ultra-Light Footprint**: Optimized memory consumption (~15–30 MB RAM baseline) with V8 Garbage Collection tuning.
- **Hybrid 3.1 Zero-Copy Passthrough**: Feeds pre-encoded WebmOpus packets directly from `yt-dlp` to `@discordjs/voice`, completely bypassing FFmpeg when volume is 100% and no DSP filters are active (Zero FFmpeg CPU overhead).
- **Instant Playback & Pre-Caching**: Background pre-fetches and pre-caches upcoming songs to NVMe/RAM disk (`/dev/shm`) for 0s instantaneous skips (~160ms dispatch).
- **Smart Autoplay (YouTube Radio Mix)**: Continuous playback powered by YouTube's official Radio Mix (`list=RD`) featuring **Artist Diversity Filtering** to maintain musical tone without repeating the same artist consecutively.
- **Interactive 4-Row Player Card V3**:
  - **Row 1 (Playback & Seek)**: `[ ⏮️ Prev ] [ ⏪ -10s ] [ ⏯️ Play/Pause ] [ ⏩ +10s ] [ ⏭️ Skip ]`
  - **Row 2 (Library & Features)**: `[ 🔀 Shuffle ] [ 🔁 Loop ] [ 📋 Queue ] [ 📄 Lyrics ] [ 💖 Favorites ]`
  - **Row 3 (Quick Actions)**: `[ ➕ ขอเพลง ] [ 📑 เพลย์ลิสต์ ] [ 🔊 Volume ] [ 📻 Autoplay ]`
  - **Row 4 (Secondary Row)**: `[ 🛑 ปิดแอป ]`
  - **Real-Time Badges**: Dynamic status indicators reflecting actual source:
    - `🔴 YouTube` — Direct YouTube stream.
    - `🟠 SoundCloud (Bypass)` — Seamless SoundCloud fallback when YouTube restricts datacenter IPs.
    - `🟠 SoundCloud` — Direct SoundCloud search.
    - `🟢 Spotify` — Spotify search and stream.
    - `⚡ 96k Supporter` / `📻 64k Standard` — Dynamic bitrate badge.
- **Dead Card Auto-Cleaner**: Stale cards from previous tracks or bot restarts automatically delete themselves on interaction, plus on-demand `/gcleancard` channel sweep.
- **Centralized VPN Proxy Tunneling (Tinyproxy Integration)**: The main Controller VPS shares its isolated ProtonVPN tunnel as a secured HTTP proxy (`PORT 11905`). Remote worker nodes (cloud containers, home ARM TV boxes) can route `yt-dlp` through this proxy without requiring root/VPN setup on the worker.
- **Distributed Scale-Out Audio Cluster**:
  - Dynamic worker node registry (`data/nodesRegistry.json`) manageable live from the Admin Dashboard.
  - NodeRouter load balancer with real-time health checks, telemetry, and **Drain Mode** (`⏳ Drain`) for zero-downtime rolling maintenance.
- **Dual-Port Web Architecture & TrueMoney VIP Billing**:
  - **Public Portal (Port 11901)**: Mobile-optimized React/Vite portal for TrueMoney Gift Voucher (อั่งเปา) redemption, granting instant Supporter VIP tier (96 kbps audio, Autoplay, priority cluster node allocation).
  - **Admin Console (Port 11902)**: Real-time governance dashboard displaying cluster telemetry, active rooms, stream termination controls, and revenue analytics.
- **Male DJ Persona**: Refined, polite, and energetic male DJ tone (`ครับ`, `ยินดีรับใช้ครับ`).
- **Hybrid Lyrics Engine**: Dual-tier lyrics provider querying LRCLIB first, with automatic YouTube Video Description regex fallback for Thai indie and rap releases.

---

## Environment Configuration (.env)

All bot behavior, network egress, streaming parameters, and cluster options are controlled via `.env`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | *Required* | Your Discord Bot Token from Discord Developer Portal. |
| `ENABLE_VPN` | `true` | Enable isolated VPN tunnel egress via `tun0` interface. |
| `AUTO_ROTATE_VPN` | `true` | Automatically failover to next VPN server if YouTube blocks current IP. |
| `VPN_SOURCE_IP` | *Auto* | Manual override for VPN source IP. If blank, auto-detected from `tun0` or `/root/vpn/vpn_ip.txt`. |
| `VPN_USERNAME` | *Optional* | OpenVPN credentials for auto-provisioning `/root/vpn/auth.txt`. |
| `VPN_PASSWORD` | *Optional* | OpenVPN password for auto-provisioning `/root/vpn/auth.txt`. |
| `ENABLE_FREE_PROXY` | `false` | Enable background discovery and benchmark of public regional proxies. |
| `PROXY_URL` | *Optional* | Static VIP proxy URL (e.g. `http://user:pass@host:11905`). Used by worker nodes to route through Controller VPN. |
| `USE_IPV6` | `true` | Enable IPv6 egress when no VPN or proxy is configured. |
| `STREAM_MODE` | `auto` | Streaming mode: `auto` (hybrid disk cache for <=30m songs, direct live pipe for long mixes), `pipe` (live stream only), or `cache`. |
| `MAX_CACHE_DURATION_SEC`| `1800` | Maximum track duration in seconds allowed for full NVMe disk pre-caching (30 minutes). |
| `PRIMARY_STREAM_TIMEOUT_MS` | `20000` | Timeout in milliseconds before falling back to SoundCloud if YouTube extraction stalls. |
| `REMOTE_NODE_TIMEOUT_MS` | `30000` | HTTP socket timeout in milliseconds when streaming audio from remote worker nodes. |
| `STREAM_BUFFER_SIZE` | `512K` | Stream buffer size allocated per audio pipe. |
| `STREAM_CHUNK_SIZE` | `512K` | Chunk size for HTTP streaming requests. |
| `OPUS_BITRATE` | `96k` | Default audio bitrate (Supporter: 96k, Standard: 64k). |
| `DEFAULT_VOLUME` | `100` | Default playback volume (0-150) for newly joined servers. |
| `WEB_PORT` | `3000` | Internal backend Express API port. |
| `PUBLIC_WEB_PORT` | `11901` | Public port for Topup & Donation portal (reverse proxied via Nginx). |
| `ADMIN_PORT` | `11902` | Dedicated port for Admin Governance Dashboard. |
| `PAYMENT_MODE` | `sandbox` | Billing mode: `sandbox` (simulates TEST10, TEST29 vouchers) or `production` (redeems real TrueMoney vouchers). |
| `TMW_PHONE_NUMBER` | *Required* | Phone number for receiving TrueMoney gift vouchers. |
| `PRICE_30_DAYS` | `29` | Price in THB for 30-day Supporter VIP access. |
| `MAX_FREE_STREAMS` | `4` | Maximum concurrent playback rooms for non-supporter servers. |
| `MAX_TOTAL_STREAMS` | `12` | Maximum concurrent playback rooms allowed on this instance. |
| `NODE_PORT` | `2333` | Worker port when running as a dedicated Audio Node (`npm run node`). |
| `NODE_ID` | `node-1` | Unique identifier for this worker node. |
| `NODE_AUTH_SECRET` | *Secret* | Shared cluster authentication secret between Controller and Worker Nodes. |
| `SUPABASE_URL` | *Optional* | Supabase Cloud Database URL for persistent cloud storage. |
| `SUPABASE_SECRET_KEY` | *Optional* | Supabase Service Role secret key. |

---

## Architecture: Standalone vs Distributed Audio Cluster

```
[ Standalone Topology (Default Single VPS) ]
+-------------------------------------------------------------+
| Main VPS Host (e.g. 15.235.164.106)                         |
| +---------------------------------------------------------+ |
| | Controller Core (LocalNode-0)                           | |
| | - Discord Gateway & Command Handler                     | |
| | - Public Topup Portal (Port 11901)                      | |
| | - Admin Dashboard (Port 11902)                          | |
| | - Audio Pipeline: yt-dlp + Hybrid 3.1 Passthrough       | |
| +---------------------------------------------------------+ |
| | Isolated VPN Egress (tun0: 10.96.0.7 -> SG Exit IP)     | |
| | Tinyproxy Forwarder (Port 11905 -> Bound to tun0)       | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+

[ Distributed Multi-Node Topology (Scale-Out Cluster) ]
                    +---------------------------+
                    | Main Controller VPS       |
                    | - Discord.js Gateway      |
                    | - NodeRouter Balancer     |
                    | - Tinyproxy (Port 11905)  |
                    +-------------+-------------+
                                  |
              +-------------------+-------------------+
              | (Streams audio)                       | (Streams audio)
      +-------v-------+                       +-------v-------+
      | Audio Node 1  |                       | Audio Node 2  |
      | ARM TV Box /  |                       | Remote Cloud  |
      | Home Server   |                       | Worker        |
      | PROXY_URL ->  |                       | PROXY_URL ->  |
      | Controller    |                       | Controller    |
      +---------------+                       +---------------+
```

### Why Share VPN via Tinyproxy?
YouTube strictly rate-limits datacenter IP ranges. By running **Tinyproxy** bound to `tun0` on the Controller VPS, any external worker node (such as free cloud containers or home devices) can route `yt-dlp` requests through `http://user:pass@controller_ip:11905`. The worker benefits from clean Singapore residential/VPN egress without needing to run OpenVPN or have root privileges.

---

## Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Guslaier/DisLava-MusicBot.git
cd DisLava-MusicBot
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
nano .env
```
Insert your `DISCORD_TOKEN`, adjust ports, and set credentials.

### 3. Binary Permissions
Ensure the bundled `yt-dlp` binary has execution permissions:
```bash
chmod +x bin/yt-dlp
```
*(FFmpeg is automatically detected from system PATH or bundled binaries)*

### 4. Build Frontend Assets
Build the React/Vite Admin Dashboard and Topup Portal:
```bash
npm --prefix frontend install
npm --prefix frontend run build
```

### 5. Running the Bot
```bash
# Development
node index.js

# Production with PM2 (Recommended)
pm2 start ecosystem.config.cjs
pm2 logs goolix-bot
```

### 6. Running a Dedicated Audio Worker Node
On a worker machine (e.g. ARM TV Box, Raspberry Pi, or second VPS):
```bash
# Configure .env with NODE_PORT, NODE_AUTH_SECRET, and PROXY_URL
npm run node

# Or run with PM2
pm2 start ecosystem.config.cjs --only goolix-node
```

---

## Slash Commands Reference

### 🎵 Playback & Control
- `/gplay <query> [top] [playlist]` — Play a song, search query, or URL (supports YouTube, SoundCloud, Spotify).
- `/gplaylist <query> [limit]` — Enqueue full playlists or albums (5–100 tracks).
- `/gautoplay` — Toggle intelligent continuous playback (YouTube Radio Mix with Artist Diversity).
- `/gpause` — Pause current playback.
- `/gresume` — Resume paused playback.
- `/gstop` — Stop playback, clear queue, and leave voice channel.
- `/gskip` — Skip current track.
- `/gskipplay <query>` — Skip current track and immediately play a new query.
- `/gprevious` — Replay the previous song.
- `/gshuffle` — Shuffle tracks currently in queue.
- `/gloop <mode>` — Cycle loop mode (`Off`, `Track`, `Queue`).
- `/gclear` — Clear all pending tracks from queue.
- `/gjump <position>` — Jump directly to a specific queued track.
- `/gmove <from> <to>` — Reorder tracks in queue.
- `/gremove <position>` — Remove a specific song from queue.

### 🎛️ Audio Quality & Seek
- `/gvolume [amount]` — View or adjust volume 0–150% (saved per server).
- `/gseek <time>` — Seek to specific timestamp (e.g. `01:30` or `90`).
- `/gforward [seconds]` — Fast-forward playback (default: 10s).
- `/gbackward [seconds]` — Rewind playback (default: 10s).

### 💖 Favorites & Personal Library
- `/gfav add` — Add currently playing track to your personal favorites.
- `/gfav list` — View your saved favorite songs.
- `/gfav play` — Enqueue and play all your favorite songs.
- `/gfav remove <index>` — Remove a song from your favorites.

### 🛡️ Info, Lyrics & Admin
- `/gnowplaying` — Display the interactive 4-row player card.
- `/glyrics [query]` — View synchronized or plain lyrics (LRCLIB with YouTube description fallback).
- `/gdonate` — Display Supporter VIP donation information and TrueMoney topup link.
- `/gcleancard` — Sweep and delete old player cards from the text channel.
- `/gstats` — View real-time bot statistics (RAM RSS/Heap, Uptime, VPN Egress, Circuit Breaker).
- `/gproxy <status|test|blacklist|clear>` — Manage proxy pool and benchmark egress IPs.
- `/gping` — Check Discord API WebSocket latency.
- `/gupdate` — Hot-reload application slash commands without rebooting.
- `/ghelp` — Display comprehensive command list and user guide.

---

## Capacity & Hardware Guide

Refer to [`AUDIO_NODE_CAPACITY_FORMULA.md`](AUDIO_NODE_CAPACITY_FORMULA.md) for the mathematical model and real-world benchmarks:

| Hardware Spec | Effective Cores ($C_{\text{eff}}$) | RAM | Recommended Capacity | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Micro NAT VPS (22 THB/mo)** | $1.0$ | $345\text{ MB}$ | **3–4 Rooms** | Pure Passthrough mode, isolated OpenVPN egress |
| **VPS LG1XS+ (150 THB/mo)** | $3.6$ | $3.0\text{ GB}$ | **33–45 Rooms** | Intel 2 vCPU, 400 Mbps shared egress |
| **Amlogic S905X4 Box (700 THB once)**| $6.9$ | $2.0–4.0\text{ GB}$ | **55–100 Rooms** | 4x Cortex-A55, 5W power draw, Armbian Linux |
| **Mini PC Intel N100 / i5-7400T** | $13.0–14.4$ | $8.0\text{ GB}$ | **120–150 Rooms** | x86_64 Ubuntu Server native, supports full cluster master |

---

## License

This project is Open Source and licensed under the [MIT License](LICENSE).
