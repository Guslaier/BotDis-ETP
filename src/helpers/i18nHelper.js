const settingsManager = require('./settingsManager');

const dictionary = {
    th: {
        // Voice errors
        VOICE_JOIN_REQUIRED: '❌ ต้องเข้าห้องเสียงก่อนนะ เดี๋ยว GOOLIX เหงาแย่เลย! 🥺',
        VOICE_SAME_REQUIRED: '❌ ต้องเข้าห้องเสียงเดียวกับ GOOLIX ก่อนนะ ถึงจะคุมสเตจได้! 🔊',
        NO_PLAYING_TRACK: '❌ ไม่มีเพลงที่กำลังเล่นอยู่ตอนนี้เลยนะ!',
        
        // Playback updates
        QUEUE_EMPTY: '🎵 คิวเพลงว่างเปล่าแล้ว! GOOLIX สไลม์เขียวขอแวบไปชาร์จบีตก่อนนะ 🎧🔋',
        NOW_PLAYING: '▶️ สเตจพร้อม! GOOLIX เริ่มเปิดเพลงแล้ว 🎶🟢',
        ADDED_QUEUE: '✅ รับทราบ! GOOLIX จับลงคิวให้แล้ว เตรียมตัวโยกได้เลย ⚡🟢',
        SUPPORTER_PRIORITY_ADDED: '⬆️ Priority Fast-Track! แซงคิวขึ้นเป็นเพลงถัดไปให้ทันใจ 💎✨',
        PLAYLIST_ADDED: '📋 โหลดเพลย์ลิสต์สำเร็จ! เพิ่มเพลงเข้าคิวให้เรียบร้อยแล้ว 🎶🟢',
        RESUMED: '▶️ ลุยกันต่อเลย! GOOLIX คัมแบ็ก ปล่อยบีตโยกต่อยาวๆ 🎧🟢',
        PAUSED: '⏸️ พักเบรกจังหวะชั่วคราว กดเล่นต่อเมื่อพร้อมนะ 🟢',
        SEEK_TOO_FAR: '❌ เวลาเกินความยาวเพลงแล้วนะ! กรอซะทะลุเพลงเลย 😅',
        CANNOT_SEEK_LIVE: '❌ ไม่สามารถกรอเพลงที่เป็น Live Stream สดได้นะ 🥺',
        STALE_CARD_REMOVED: '🗑️ ตรวจพบการ์ดเพลงเก่าที่ค้างอยู่ GOOLIX เคลียร์ทิ้งให้แล้วนะ (ใช้การ์ดล่าสุดด้านล่างได้เลย 🟢)',
        STOPPED: '⏹️ หยุดเล่นเพลงและเคลียร์คิวเรียบร้อยแล้ว!',

        // Supporter & Quotas
        AUTOPLAY_SUPPORTER_ONLY: '💎 ฟีเจอร์ **เล่นเพลงต่อเนื่องอัตโนมัติ (Autoplay)** สงวนไว้สำหรับเซิร์ฟเวอร์ผู้สนับสนุน (Supporter) นะ!\n\nพิมพ์ `/gdonate` หรือเข้าเว็บเติมเงินเพื่อร่วมสนับสนุนเริ่มต้นเพียง **29฿/เดือน** 💖',
        FILTER_SUPPORTER_ONLY: '💎 ระบบปรับแต่งโทนเสียง Equalizer สงวนไว้สำหรับเซิร์ฟเวอร์ **Supporter** นะ!\n\nพิมพ์ `/gdonate` เพื่อดูรายละเอียดการร่วมสนับสนุนค่าเซิร์ฟเวอร์เริ่มต้นเพียง **29฿/เดือน** 💖',
        SLOTS_FULL: '⚠️ ขณะนี้ช่องสัญญาณทั่วไปเต็มแล้ว ({current}/{max} ห้อง) — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อเข้าใช้ช่องทางด่วนได้ทันที!',
        SONG_TOO_LONG: '⏳ เพลงนี้ยาวเกิน 30 นาที ({duration}) — สิทธิพิเศษสำหรับผู้สนับสนุนฟังได้ยาวไม่จำกัด!',
        QUEUE_LIMIT_FREE: '⚠️ คิวเพลงเซิร์ฟเวอร์ทั่วไปจำกัดสูงสุด 10 เพลง — ร่วมสนับสนุนเซิร์ฟเวอร์เพื่อขยายคิวเป็น 50 เพลง!',
        PLAYLIST_LIMIT_FREE: '⚠️ เซิร์ฟเวอร์ทั่วไป (Free) สามารถดึงเพลย์ลิสต์ได้ครั้งละสูงสุด 5 เพลงครับ (อัปเกรด Supporter ดึงได้สูงสุด 25 เพลง)',
        FILTER_CHANGED: '🎛️ ปรับแต่งโทนเสียง Equalizer เป็น: **{filter}**\n*(มีผลทันทีกับเพลงที่กำลังเล่นและเพลงถัดไป)*',

        // Language command
        LANG_CHANGED: '🌐 เปลี่ยนภาษาของบอทในเซิร์ฟเวอร์เป็น: **ภาษาไทย (TH)** เรียบร้อยแล้ว!'
    },
    en: {
        // Voice errors
        VOICE_JOIN_REQUIRED: '❌ You must join a voice channel first so GOOLIX can groove with you! 🥺',
        VOICE_SAME_REQUIRED: '❌ You must be in the same voice channel as GOOLIX to control the stage! 🔊',
        NO_PLAYING_TRACK: '❌ No music is currently playing on this stage!',

        // Playback updates
        QUEUE_EMPTY: '🎵 Queue is empty! GOOLIX Slime DJ is bouncing out to recharge the beats! 🎧🔋',
        NOW_PLAYING: '▶️ Stage is live! GOOLIX is dropping the track 🎶🟢',
        ADDED_QUEUE: '✅ Added to queue! GOOLIX is lining up the groove ⚡🟢',
        SUPPORTER_PRIORITY_ADDED: '⬆️ Priority Fast-Track! Jumped straight to next up in queue 💎✨',
        PLAYLIST_ADDED: '📋 Playlist loaded! Tracks added to queue smoothly 🎶🟢',
        RESUMED: '▶️ Resumed! GOOLIX is back with the high-voltage groove 🎧🟢',
        PAUSED: '⏸️ Playback paused. Hit resume whenever you are ready 🟢',
        SEEK_TOO_FAR: '❌ Time exceeds total track duration! 😅',
        CANNOT_SEEK_LIVE: '❌ Cannot seek within a live stream broadcast 🥺',
        STALE_CARD_REMOVED: '🗑️ Old music card cleaned up by GOOLIX! (Please use the latest card below 🟢)',
        STOPPED: '⏹️ Playback stopped and queue cleared!',

        // Supporter & Quotas
        AUTOPLAY_SUPPORTER_ONLY: '💎 **Autoplay Mode** is reserved for Server Supporters!\n\nType `/gdonate` or visit the web portal to support starting at only **29฿/month** 💖',
        FILTER_SUPPORTER_ONLY: '💎 Equalizer Audio Filters are reserved for **Server Supporters**!\n\nType `/gdonate` to support the server starting at only **29฿/month** 💖',
        SLOTS_FULL: '⚠️ Free stream slots are full ({current}/{max} rooms) — Support GOOLIX to access priority lanes instantly!',
        SONG_TOO_LONG: '⏳ Track exceeds 30 minutes ({duration}) — Supporters enjoy unlimited song length!',
        QUEUE_LIMIT_FREE: '⚠️ Free queue limit reached (10 songs max) — Become a Supporter to expand queue up to 50 songs!',
        PLAYLIST_LIMIT_FREE: '⚠️ Free servers can add up to 5 songs per playlist (Upgrade to Supporter for up to 25 songs)',
        FILTER_CHANGED: '🎛️ Equalizer tone set to: **{filter}**\n*(Applied immediately to current and upcoming tracks)*',

        // Language command
        LANG_CHANGED: '🌐 Server bot language switched to: **English (EN)** successfully!'
    }
};

class I18nHelper {
    getLang(guildId) {
        return settingsManager.getGuildLanguage(guildId);
    }

    t(guildId, key, vars = {}) {
        const lang = this.getLang(guildId);
        const localeDict = dictionary[lang] || dictionary.en || dictionary.th;
        let text = localeDict[key] || dictionary.en?.[key] || dictionary.th?.[key] || key;

        for (const [k, v] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
        return text;
    }
}

module.exports = new I18nHelper();
